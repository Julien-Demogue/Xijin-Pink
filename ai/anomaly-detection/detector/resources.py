"""Join per-window CPU / memory from Prometheus onto log-derived Observations.

FeatureSpec v2 adds `cpu_cores` and `mem_mb` (from the services' prom-client
`/metrics`). This module fills them by querying Prometheus over the observation
time span and averaging the samples that fall in each window. If Prometheus is
unreachable or has no data for a window, the features stay 0.0 — the detector
degrades to log-only rather than failing.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request

import pandas as pd

PROM_URL = os.environ.get("PROM_URL", "http://localhost:9090")


def _range(query: str, start: float, end: float, step: float = 5.0) -> dict[str, list[tuple[float, float]]]:
    params = urllib.parse.urlencode({"query": query, "start": start, "end": end, "step": step})
    url = f"{PROM_URL}/api/v1/query_range?{params}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        payload = json.load(resp)
    series: dict[str, list[tuple[float, float]]] = {}
    for s in payload.get("data", {}).get("result", []):
        svc = s["metric"].get("service")
        if svc:
            series[svc] = [(float(ts), float(v)) for ts, v in s["values"]]
    return series


def _avg(series: dict, scope: str, ws: float, we: float, scale: float, default: float) -> float:
    vals = [v for ts, v in series.get(scope, []) if ws <= ts < we]
    return (sum(vals) / len(vals)) * scale if vals else default


def attach(obs: pd.DataFrame, default: float = 0.0) -> pd.DataFrame:
    """Fill cpu_cores / mem_mb on `obs` from Prometheus. Never raises."""
    obs = obs.copy()
    if obs.empty:
        obs["cpu_cores"] = []
        obs["mem_mb"] = []
        return obs
    t0 = float(obs["window_start"].min())
    t1 = float(obs["window_end"].max())
    try:
        cpu = _range("rate(process_cpu_seconds_total[30s])", t0, t1)
        mem = _range("process_resident_memory_bytes", t0, t1)
    except Exception:
        obs["cpu_cores"] = default
        obs["mem_mb"] = default
        return obs
    obs["cpu_cores"] = [_avg(cpu, r.scope, r.window_start, r.window_end, 1.0, default)
                        for r in obs.itertuples()]
    obs["mem_mb"] = [_avg(mem, r.scope, r.window_start, r.window_end, 1 / 1e6, default)
                     for r in obs.itertuples()]
    return obs
