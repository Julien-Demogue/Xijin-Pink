"""Shared helpers for the red-team scripts.

SCOPE: these run from the Attacker PC against the team's OWN fictional app, on
localhost (dev port mappings) or the group hotspot WAF — never anything else.
They generate the *attack half* of the detector's training data: realistic attack
traffic shapes, labeled with start/end so the exported Loki logs can be marked.

Targets come from env so the same scripts work locally and against the WAF:
    XIJIN_AUTH (default http://localhost:3001)
    XIJIN_PAY  (default http://localhost:3002)
    XIJIN_PSP  (default http://localhost:3003)
For the hotspot, point all three at the WAF, e.g. XIJIN_PAY=http://192.168.137.1.

Zero dependencies (stdlib). Bounded by duration and a concurrency cap so a single
laptop stays usable; raise the caps for a dramatic demo.
"""

from __future__ import annotations

import json
import os
import random
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field

AUTH = os.environ.get("XIJIN_AUTH", "http://localhost:3001")
PAY = os.environ.get("XIJIN_PAY", "http://localhost:3002")
PSP = os.environ.get("XIJIN_PSP", "http://localhost:3003")

# A small set of attacker source IPs (one or a few machines), distinct from the
# normal-user pool. Sent as X-Forwarded-For — what the WAF forwards in the lab.
ATTACKER_IPS = [f"192.168.137.{i}" for i in (201, 202, 203)]
# Tool/bot user-agents an attacker would realistically present.
TOOL_UAS = [
    "python-requests/2.32",
    "curl/8.8.0",
    "sqlmap/1.8",
    "Go-http-client/2.0",
    "Mozilla/5.0 (compatible; scanbot/1.0)",
]


def http(method, url, body=None, token=None, src_ip=None, ua=None, timeout=5):
    """One request. Returns (status, elapsed_ms, bytes_out). status 0 = no reply."""
    data = None
    if body is not None:
        data = body if isinstance(body, (bytes, bytearray)) else json.dumps(body).encode()
    headers = {
        "content-type": "application/json",
        "x-forwarded-for": src_ip or random.choice(ATTACKER_IPS),
        "user-agent": ua or random.choice(TOOL_UAS),
    }
    if token:
        headers["authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.time()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            payload = resp.read()
            return resp.status, (time.time() - start) * 1000, len(payload)
    except urllib.error.HTTPError as e:
        body = e.read() if hasattr(e, "read") else b""
        return e.code, (time.time() - start) * 1000, len(body)
    except Exception:
        return 0, (time.time() - start) * 1000, 0


def run_concurrent(worker, duration, concurrency, ramp=0.3, jitter=(0.0, 0.05)):
    """Run `worker()` from `concurrency` threads until `duration` elapses.

    Threads start staggered over the first `ramp` fraction of the run (realistic
    ramp-up, not an instant wall). Returns the total number of worker calls.
    """
    deadline = time.time() + duration
    counter = {"n": 0}
    lock = threading.Lock()

    def loop(delay):
        time.sleep(delay)
        while time.time() < deadline:
            worker()
            with lock:
                counter["n"] += 1
            time.sleep(random.uniform(*jitter))

    threads = []
    for i in range(concurrency):
        delay = (i / max(concurrency, 1)) * duration * ramp
        t = threading.Thread(target=loop, args=(delay,), daemon=True)
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    return counter["n"]


@dataclass
class Episode:
    scope: str
    category: str
    start: float
    end: float
    requests: int = 0


@dataclass
class Manifest:
    run_start: float = field(default_factory=time.time)
    run_end: float = 0.0
    episodes: list[Episode] = field(default_factory=list)

    def record(self, ep: Episode):
        self.episodes.append(ep)
        print(f"  [{ep.category}] {ep.scope}  {ep.requests} reqs  "
              f"{ep.end - ep.start:.0f}s window")

    def save(self, path):
        self.run_end = time.time()
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(
                {
                    "run_start": self.run_start,
                    "run_end": self.run_end,
                    "episodes": [vars(e) for e in self.episodes],
                },
                fh,
                indent=2,
            )
        print(f"manifest -> {path}  ({len(self.episodes)} episodes)")
