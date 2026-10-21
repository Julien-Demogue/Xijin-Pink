"""Read a JSONL dataset exported from Loki into detector records.

Bridges the real-log exporter (tools/dataset/export_loki.py) to the feature
extractor: the records it yields are the same shape synth.py produces, so
`extract_observations` consumes them unchanged. This is how the detector moves
from synthetic fixtures to real aggregated logs.
"""

from __future__ import annotations

import json

# Infra endpoints — Prometheus scrapes and health checks. Not business traffic;
# excluded so they never drive the detector (must match live_scorer's query).
INFRA_ROUTES = {"/metrics", "/health"}


def load_records(path: str, only_http_access: bool = True) -> list[dict]:
    """Load exported log records. By default keeps only http_access lines, which
    carry the fields FeatureSpec v1 needs (route, status, duration_ms, bytes_out,
    ip, timestamp as epoch seconds). Infra routes are dropped."""
    records = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            if only_http_access and rec.get("message") != "http_access":
                continue
            if rec.get("route") in INFRA_ROUTES:
                continue
            if not isinstance(rec.get("timestamp"), (int, float)):
                continue  # must be epoch seconds (exporter converts ISO)
            records.append(rec)
    records.sort(key=lambda r: r["timestamp"])
    return records


def load_manifest(path: str) -> list[dict]:
    """Load a red-team run manifest: [{scope, category, start, end}, ...].

    Episode start/end are epoch seconds, matching exported record timestamps.
    """
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    return data["episodes"] if isinstance(data, dict) else data
