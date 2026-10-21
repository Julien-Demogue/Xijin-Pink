"""Export aggregated logs from Loki into a detector-ready JSONL dataset.

Pulls http_access lines (and all other events) over a time range and writes one
JSON record per line, with `timestamp` converted to epoch seconds so the
detector's feature extractor consumes it directly. Chunks the time range to stay
under Loki's per-query entry cap.

    # last 20 minutes of all services:
    python tools/dataset/export_loki.py --last 1200 --out data/normal.jsonl

    # a specific window (matching a red-team run manifest):
    python tools/dataset/export_loki.py --since 2026-10-20T08:00:00Z \
        --until 2026-10-20T08:20:00Z --out data/attacks.jsonl
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

LOKI = "http://localhost:3100"


def _to_ns(value: str | float) -> int:
    if isinstance(value, (int, float)):
        return int(float(value) * 1e9)
    try:
        return int(float(value) * 1e9)  # epoch seconds as a string
    except ValueError:
        pass
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return int(dt.timestamp() * 1e9)


def _iso_to_epoch(iso: str) -> float:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()


def _page(query: str, start_ns: int, end_ns: int, limit: int) -> list[tuple[int, str]]:
    params = urllib.parse.urlencode(
        {"query": query, "start": start_ns, "end": end_ns, "limit": limit, "direction": "forward"}
    )
    url = f"{LOKI}/loki/api/v1/query_range?{params}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        payload = json.load(resp)
    rows: list[tuple[int, str]] = []
    for stream in payload.get("data", {}).get("result", []):
        for ts, line in stream["values"]:
            rows.append((int(ts), line))
    rows.sort(key=lambda r: r[0])
    return rows


def export(query: str, start_ns: int, end_ns: int, limit: int = 5000) -> list[dict]:
    """Paginate by timestamp so bursts above the per-query cap are not truncated.

    Advances the cursor to the last returned timestamp (not +1) and de-duplicates,
    so entries sharing a nanosecond across a page boundary are never skipped.
    """
    out, seen = [], set()
    cursor = start_ns
    while cursor < end_ns:
        rows = _page(query, cursor, end_ns, limit)
        if not rows:
            break
        new = 0
        for ts, line in rows:
            key = (ts, line)
            if key in seen:
                continue
            seen.add(key)
            new += 1
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        last_ts = rows[-1][0]
        if len(rows) < limit:
            break
        if last_ts <= cursor and new == 0:
            break  # safety: no progress (dense identical timestamps)
        cursor = last_ts
    return out


def main():
    ap = argparse.ArgumentParser(description="Export Loki logs to a detector-ready JSONL dataset")
    ap.add_argument("--out", required=True)
    ap.add_argument("--last", type=float, help="seconds back from now")
    ap.add_argument("--since", help="ISO-8601 or epoch seconds")
    ap.add_argument("--until", help="ISO-8601 or epoch seconds")
    ap.add_argument("--query", default='{service=~"waf|payment-api|auth-service|psp-simulator"} | json',
                    help="LogQL selector")
    ap.add_argument("--limit", type=int, default=5000, help="entries per Loki page")
    args = ap.parse_args()

    now = time.time()
    if args.last:
        start_ns, end_ns = _to_ns(now - args.last), _to_ns(now)
    else:
        start_ns = _to_ns(args.since)
        end_ns = _to_ns(args.until) if args.until else _to_ns(now)

    records = export(args.query, start_ns, end_ns, args.limit)

    written = 0
    with open(args.out, "w", encoding="utf-8") as fh:
        for rec in records:
            if isinstance(rec.get("timestamp"), str):
                rec["ts_iso"] = rec["timestamp"]
                rec["timestamp"] = _iso_to_epoch(rec["timestamp"])
            fh.write(json.dumps(rec) + "\n")
            written += 1

    http = sum(1 for r in records if r.get("message") == "http_access")
    print(f"exported {written} records ({http} http_access) -> {args.out}")


if __name__ == "__main__":
    main()
