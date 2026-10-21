# Red Team

Reproducible attack scripts, run **from the Attacker PC only**, against the team's
own fictional SI on the `RESILIENCE-G<n>` hotspot (or localhost in dev). Each
scenario produces an **observable effect** the monitoring detects, and is
compatible with the automatic response. They generate the **attack half of the
detector's dataset**, labeled with start/end so the Loki export can mark the
attack windows.

Strictly out of scope: campus networks, other teams, third-party/Internet
services, any real data. Anything that risks leaving the lab must be stopped and
reported to a coach.

## Targets

Scripts read targets from the environment, so the same code runs locally and
against the WAF on the hotspot:

| Var | Default (dev) | Hotspot |
| --- | --- | --- |
| `XIJIN_AUTH` | `http://localhost:3001` | the WAF, e.g. `http://192.168.137.1` |
| `XIJIN_PAY`  | `http://localhost:3002` | the WAF |
| `XIJIN_PSP`  | `http://localhost:3003` | the WAF |

Attacker traffic carries a small set of source IPs (`X-Forwarded-For`
`192.168.137.201-203`), distinct from the normal-user pool — what the WAF really
forwards in the lab, so the IP features are meaningful.

## Scenarios (`attacks.py`)

| Category | Target | Observable effect |
| --- | --- | --- |
| `availability` | payment-api checkout | ramped concurrent flood → request-rate + latency spike |
| `auth-abuse` | /api/auth/login | credential stuffing → burst of 401s from few IPs |
| `scraping` | /api/donations/leaderboard | high-rate enumeration from one bot IP |
| `injection` | auth + checkout inputs | real payload strings → burst of 400s / odd inputs |
| `exfiltration` | authenticated history + leaderboard | large `bytes_out` volume from one IP |

The app uses parameterized queries and input validation, so injection probes
cannot actually inject — they produce the attacker's *fingerprint*, which is what
the detector learns.

## Running a campaign

`campaign.py` runs a realistic run: a normal-only warm-up (the "before"
baseline), then each attack injected **while normal traffic keeps flowing**,
separated by quiet gaps, then a cool-down. It writes `data/manifest.json` with an
epoch start/end per episode.

```bash
python redteam/campaign.py --quick        # ~2.5 min smoke test
python redteam/campaign.py                 # full ~15 min campaign
python redteam/campaign.py --only availability
```

Then export + label the window and train the detector:

```bash
python tools/dataset/export_loki.py --last 1000 --out data/attacks.jsonl
# the detector reads data/attacks.jsonl + data/manifest.json (see ai/anomaly-detection)
```

Intensity (concurrency / duration) is bounded for a laptop; raise it in
`attacks.py` for a dramatic demo DoS.
