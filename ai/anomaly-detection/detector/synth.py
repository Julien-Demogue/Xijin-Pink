"""Synthetic telemetry generator.

Produces `http_access` records that match docs/api/telemetry-contract.md, so the
detector can be built and evaluated before the live stack is instrumented. Two
purposes:

  * NORMAL traffic — including *normal mistakes* (wrong passwords, abandoned
    checkouts, 404s) so the model does not learn "any 401 = attack".
  * ATTACK episodes — one per category, each with a start/end recorded in a
    manifest for labeling. These are abnormal traffic *shapes* against the team's
    own fictional stack, not exploits.

When the middleware is wired, replace `generate_run()` with a reader that pulls
real `http_access` lines from Loki — the rest of the pipeline is unchanged.
"""

from __future__ import annotations

import numpy as np

NORMAL_IPS = [f"192.168.137.{i}" for i in range(20, 90)]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"


def _lognormal(rng, median_ms, sigma=0.4, size=1):
    return np.exp(rng.normal(np.log(median_ms), sigma, size))


def _normal_traffic(rng, t_start, t_end):
    """Baseline traffic across the three services, with realistic error noise."""
    records = []

    # payment-api: checkouts + leaderboard + history/summary
    rate = 3.0  # req/s
    t = t_start
    while t < t_end:
        t += rng.exponential(1.0 / rate)
        if t >= t_end:
            break
        roll = rng.random()
        if roll < 0.45:
            route, method, status, size = "/api/donations/checkout", "POST", 201, 320
            if rng.random() < 0.03:  # invalid amount — a normal mistake
                status, size = 400, 90
        elif roll < 0.80:
            route, method, status, size = "/api/donations/leaderboard", "GET", 200, int(rng.uniform(4000, 18000))
        elif roll < 0.95:
            route, method, status = "/api/donations/history", "GET", 200
            size = int(rng.uniform(600, 4000))
            if rng.random() < 0.02:  # history without auth
                status, size = 401, 60
        else:
            route, method, status, size = "/api/donations/summary", "GET", 200, 180
        records.append(_rec(t, route, method, status, _lognormal(rng, 70)[0], size, rng.choice(NORMAL_IPS)))

    # auth-service: login (10% wrong password = normal), register, profile
    rate = 0.8
    t = t_start
    while t < t_end:
        t += rng.exponential(1.0 / rate)
        if t >= t_end:
            break
        roll = rng.random()
        if roll < 0.6:
            route, method = "/api/auth/login", "POST"
            status, size = (401, 70) if rng.random() < 0.10 else (200, 240)
        elif roll < 0.8:
            route, method, status, size = "/api/auth/register", "POST", 201, 260
            if rng.random() < 0.05:
                status, size = 409, 80
        else:
            route, method, status, size = "/api/auth/profile", "GET", 200, 300
        records.append(_rec(t, route, method, status, _lognormal(rng, 55)[0], size, rng.choice(NORMAL_IPS)))

    # psp-simulator: checkout page + confirm
    rate = 1.2
    t = t_start
    while t < t_end:
        t += rng.exponential(1.0 / rate)
        if t >= t_end:
            break
        if rng.random() < 0.5:
            route, method, status, size = "/checkout/:id", "GET", 200, 1400
        else:
            route, method, status, size = "/checkout/:id/confirm", "POST", 200, 140
        records.append(_rec(t, route, method, status, _lognormal(rng, 45)[0], size, rng.choice(NORMAL_IPS)))

    return records


def _rec(t, route, method, status, duration_ms, bytes_out, ip):
    return {
        "timestamp": float(t),
        "route": route,
        "method": method,
        "status": int(status),
        "duration_ms": float(round(duration_ms, 1)),
        "bytes_out": float(bytes_out),
        "bytes_in": 120.0,
        "ip": ip,
        "user_agent": UA,
    }


def _availability(rng, t0, t1):
    """DoS on payment-api: rate surge, latency climb, 5xx errors, few sources."""
    recs, ips = [], [f"192.168.137.{i}" for i in (201, 202, 203)]
    t = t0
    while t < t1:
        t += rng.exponential(1.0 / 60.0)  # ~60 req/s
        frac = (t - t0) / max(t1 - t0, 1e-9)
        status = 503 if rng.random() < (0.3 + 0.5 * frac) else 200
        latency = _lognormal(rng, 400 + 3000 * frac, 0.3)[0]
        recs.append(_rec(t, "/api/donations/checkout", "POST", status, latency, 120, rng.choice(ips)))
    return recs


def _auth_abuse(rng, t0, t1):
    """Brute force on /api/auth/login: 401 flood from 1-2 IPs."""
    recs, ips = [], [f"192.168.137.{i}" for i in (211, 212)]
    t = t0
    while t < t1:
        t += rng.exponential(1.0 / 40.0)
        status = 200 if rng.random() < 0.02 else 401  # rare hit
        recs.append(_rec(t, "/api/auth/login", "POST", status, _lognormal(rng, 60)[0], 70, rng.choice(ips)))
    return recs


def _scraping(rng, t0, t1):
    """Enumeration of leaderboard/history from a single IP."""
    recs, ip = [], "192.168.137.221"
    t = t0
    while t < t1:
        t += rng.exponential(1.0 / 50.0)
        route = "/api/donations/leaderboard" if rng.random() < 0.7 else "/api/donations/history"
        recs.append(_rec(t, route, "GET", 200, _lognormal(rng, 80)[0], int(rng.uniform(5000, 15000)), ip))
    return recs


def _injection(rng, t0, t1):
    """Malformed-input probing: burst of 400s across routes from one IP."""
    recs, ip = [], "192.168.137.231"
    routes = ["/api/donations/checkout", "/api/auth/login", "/api/auth/register"]
    t = t0
    while t < t1:
        t += rng.exponential(1.0 / 30.0)
        status = 400 if rng.random() < 0.9 else 404
        recs.append(_rec(t, rng.choice(routes), "POST", status, _lognormal(rng, 50)[0], 90, ip))
    return recs


def _exfiltration(rng, t0, t1):
    """Large-response pulls on history: bytes_out spike from one IP."""
    recs, ip = [], "192.168.137.241"
    t = t0
    while t < t1:
        t += rng.exponential(1.0 / 8.0)
        recs.append(_rec(t, "/api/donations/history", "GET", 200, _lognormal(rng, 300, 0.3)[0],
                         int(rng.uniform(200_000, 900_000)), ip))
    return recs


_ATTACKS = {
    "availability": (_availability, "payment-api"),
    "auth-abuse": (_auth_abuse, "auth-service"),
    "scraping": (_scraping, "payment-api"),
    "injection": (_injection, "payment-api"),
    "exfiltration": (_exfiltration, "payment-api"),
}


def generate_run(duration_s=1200, seed=0, attacks=None):
    """Generate one run: normal traffic + optional attack episodes.

    `attacks`: list of (category, start_s, end_s). Returns (records, manifest).
    """
    rng = np.random.default_rng(seed)
    records = _normal_traffic(rng, 0.0, duration_s)
    manifest = []
    for category, start, end in attacks or []:
        fn, scope = _ATTACKS[category]
        records.extend(fn(rng, start, end))
        manifest.append({"scope": scope, "category": category, "start": float(start), "end": float(end)})
    records.sort(key=lambda r: r["timestamp"])
    return records, manifest


def standard_attack_schedule(duration_s=1200, gap=180, length=60, offset=120):
    """One episode per category, spaced out with quiet gaps between them."""
    schedule, t = [], offset
    for category in ("availability", "auth-abuse", "scraping", "injection", "exfiltration"):
        schedule.append((category, float(t), float(t + length)))
        t += gap
    return schedule
