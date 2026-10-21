# Tools — traffic & dataset

Helpers for building the detector's dataset from **real** aggregated logs.

## `traffic/normal_traffic.py`

Normal ("safe") traffic generator. Drives the real app through genuine journeys
(register, login, donate end-to-end via the PSP, browse, history) at a realistic
pace, including *normal mistakes* (wrong passwords, invalid amounts, abandoned
checkouts) so the detector does not learn "any error = attack". Source IPs come
from a legitimate-user pool (`X-Forwarded-For`).

```bash
python tools/traffic/normal_traffic.py --duration 600 --rate 3
```

## `dataset/export_loki.py`

Exports aggregated logs from Loki over a time range into a detector-ready JSONL
(one record per line, `timestamp` in epoch seconds). Paginates by timestamp, so
high-rate bursts are **not** truncated by Loki's per-query cap.

```bash
python tools/dataset/export_loki.py --last 1000 --out data/attacks.jsonl
python tools/dataset/export_loki.py --since 2026-10-20T08:00:00Z \
    --until 2026-10-20T08:20:00Z --out data/window.jsonl
```

Requires Loki reachable at `http://localhost:3100` (dev port mapping).

## Pipeline

```
normal_traffic.py  ─┐
redteam/campaign.py ─┼─► live app ─► Promtail ─► Loki ─► export_loki.py ─► data/*.jsonl
                     │                                     + data/manifest.json
                     └──────────────────────────────────────────┐
ai/anomaly-detection: ingest.load_records + label_observations ◄─┘ → train / evaluate
```

Datasets land in `data/` (git-ignored — regenerable from a campaign run).
