"""Normal ("safe") traffic generator — drives the REAL app so real logs flow.

Exercises the genuine user journeys (register, login, donate end-to-end via the
PSP, browse the leaderboard, view history) at a realistic pace, and deliberately
includes *normal mistakes* — wrong passwords, invalid amounts, abandoned
checkouts — so the detector does not learn "any error = attack".

Zero dependencies (stdlib urllib). Run against the local stack only:

    python tools/traffic/normal_traffic.py --duration 600 --rate 3

While it runs, every request lands in Loki as an http_access line plus the
business/security events. This is the "safe" half of the dataset.
"""

from __future__ import annotations

import argparse
import json
import random
import time
import urllib.error
import urllib.request

AUTH = "http://localhost:3001"
PAY = "http://localhost:3002"

# A pool of legitimate client IPs. Sent as X-Forwarded-For so the services record
# varied source IPs (what the WAF will really forward on the hotspot), making the
# distinct_ips / top_ip_share features meaningful. Normal users spread across many
# IPs; attackers (redteam/) come from a small distinct set.
NORMAL_IPS = [f"192.168.137.{i}" for i in range(20, 90)]
BROWSER_UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1",
]


def _req(method, url, body=None, token=None, timeout=5):
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "content-type": "application/json",
        "x-forwarded-for": random.choice(NORMAL_IPS),
        "user-agent": random.choice(BROWSER_UAS),
    }
    if token:
        headers["authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception:
        return 0, {}


class Population:
    """A small set of registered users with their tokens, grown over time."""

    def __init__(self):
        self.users: list[dict] = []

    def register(self):
        n = random.randint(1000, 9_999_999)
        email = f"user{n}@octobre-rose.test"
        password = f"pw-{n}-secret"
        status, body = _req("POST", f"{AUTH}/api/auth/register",
                            {"email": email, "password": password, "displayName": f"Donor {n}"})
        if status == 201 and body.get("token"):
            self.users.append({"email": email, "password": password, "token": body["token"]})

    def someone(self):
        return random.choice(self.users) if self.users else None


def action_login(pop: Population):
    user = pop.someone()
    if not user:
        return
    # 10% of logins use a wrong password — a normal mistake.
    password = user["password"] if random.random() > 0.10 else "nope-wrong"
    status, body = _req("POST", f"{AUTH}/api/auth/login",
                        {"email": user["email"], "password": password})
    if status == 200 and body.get("token"):
        user["token"] = body["token"]


def action_donate(pop: Population):
    user = pop.someone()
    token = user["token"] if user and random.random() < 0.6 else None
    # 3% invalid amount (normal mistake); otherwise a plausible donation.
    amount = random.choice([5, 9]) if random.random() < 0.03 else random.choice(
        [500, 1000, 1500, 2000, 2500, 5000, 10000])
    body = {"amount": amount}
    if not token:
        body["email"] = f"anon{random.randint(1,99999)}@octobre-rose.test"
    status, resp = _req("POST", f"{PAY}/api/donations/checkout", body, token=token)
    if status != 201 or "paymentUrl" not in resp:
        return
    # 80% of donors go through with payment; 20% abandon the checkout.
    if random.random() < 0.80:
        decision = "pay" if random.random() < 0.9 else "fail"
        _req("POST", f"{resp['paymentUrl']}/confirm", {"decision": decision})


def action_leaderboard(_pop):
    _req("GET", f"{PAY}/api/donations/leaderboard")


def action_history(pop: Population):
    user = pop.someone()
    if user and user.get("token"):
        _req("GET", f"{PAY}/api/donations/history", token=user["token"])


ACTIONS = [
    (action_donate, 0.45),
    (action_leaderboard, 0.25),
    (action_login, 0.15),
    (action_history, 0.15),
]


def main():
    ap = argparse.ArgumentParser(description="Normal traffic generator (local stack only)")
    ap.add_argument("--duration", type=float, default=600, help="seconds to run")
    ap.add_argument("--rate", type=float, default=3.0, help="avg requests/second")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()
    if args.seed is not None:
        random.seed(args.seed)

    pop = Population()
    for _ in range(8):  # seed a few users
        pop.register()

    start = time.time()
    actions, weights = zip(*ACTIONS)
    sent = 0
    print(f"normal traffic: {args.duration:.0f}s @ ~{args.rate}/s against {PAY}")
    while time.time() - start < args.duration:
        if random.random() < 0.02:  # occasional new signup
            pop.register()
        random.choices(actions, weights=weights, k=1)[0](pop)
        sent += 1
        time.sleep(random.expovariate(args.rate))
        if sent % 100 == 0:
            print(f"  {sent} actions, {time.time()-start:.0f}s elapsed, {len(pop.users)} users")
    print(f"done: {sent} actions in {time.time()-start:.0f}s")


if __name__ == "__main__":
    main()
