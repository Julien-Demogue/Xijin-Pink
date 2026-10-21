"""Evaluation: anomaly lifecycle + the metrics the dossier reports.

The lifecycle (k-of-n persistence) is the same state machine the live scorer
uses, so detection delay here reflects what the demo will show.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .featurespec import STEP_S


@dataclass
class FiringEpisode:
    scope: str
    fired_at: float  # window_start at which FIRING was reached


def run_lifecycle(obs_scope: pd.DataFrame, suspect: np.ndarray, k=3, n=4, clear=3):
    """Drive NORMAL→PENDING→FIRING→RESOLVED over one scope's windows in time order.

    Returns (firing_mask, firings) where firing_mask[i] is True while the state
    is FIRING, and firings is the list of (index) where FIRING was first entered.
    """
    firing_mask = np.zeros(len(obs_scope), dtype=bool)
    firings: list[int] = []
    state = "NORMAL"
    normal_streak = 0
    for i in range(len(obs_scope)):
        recent = suspect[max(0, i - n + 1) : i + 1]
        if state in ("NORMAL", "PENDING"):
            if suspect[i]:
                state = "PENDING"
            if recent.sum() >= k:
                state = "FIRING"
                firings.append(i)
            elif not suspect[i]:
                state = "NORMAL"
        if state == "FIRING":
            firing_mask[i] = True
            normal_streak = normal_streak + 1 if not suspect[i] else 0
            if normal_streak >= clear:
                state = "NORMAL"
                normal_streak = 0
    return firing_mask, firings


def evaluate(obs: pd.DataFrame, scores: np.ndarray, threshold, k=3, n=4, thresholds=None):
    """Point-level and episode-level metrics across all scopes.

    `threshold` is the global fallback; `thresholds` (optional) is a per-scope
    dict {scope: thr}. Suspicion is judged per row against its scope's threshold.
    """
    obs = obs.reset_index(drop=True).copy()
    obs["score"] = scores
    if thresholds:
        thr_row = obs["scope"].map(lambda s: thresholds.get(s, threshold)).to_numpy()
    else:
        thr_row = threshold
    obs["suspect"] = scores > thr_row

    firing = np.zeros(len(obs), dtype=bool)
    for scope, grp in obs.groupby("scope"):
        idx = grp.index.to_numpy()
        fmask, _ = run_lifecycle(grp, grp["suspect"].to_numpy(), k=k, n=n)
        firing[idx] = fmask
    obs["firing"] = firing

    y = obs["label"].to_numpy().astype(bool)
    pred = obs["firing"].to_numpy()

    tp = int((pred & y).sum())
    fp = int((pred & ~y).sum())
    fn = int((~pred & y).sum())
    tn = int((~pred & ~y).sum())
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    # Episode-level: for each labeled attack episode, was it detected and when?
    episodes = []
    for (scope, category), grp in obs[obs["label"] == 1].groupby(["scope", "category"], sort=False):
        start = grp["window_start"].min()
        fired = grp[grp["firing"]]
        detected = len(fired) > 0
        delay = float(fired["window_start"].min() - start) if detected else None
        episodes.append({"scope": scope, "category": category, "detected": detected, "delay_s": delay})

    # False alarms per hour on pure-normal windows (count rising edges while label=0).
    normal = obs[obs["label"] == 0].sort_values(["scope", "window_start"])
    false_edges = 0
    for _, grp in normal.groupby("scope"):
        f = grp["firing"].to_numpy()
        false_edges += int(np.sum(f & ~np.concatenate([[False], f[:-1]])))
    normal_hours = len(normal) * STEP_S / 3600.0
    fp_per_hour = false_edges / normal_hours if normal_hours else 0.0

    return {
        "point": {"precision": precision, "recall": recall, "f1": f1,
                   "tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "episodes": episodes,
        "attacks_detected": sum(e["detected"] for e in episodes),
        "attacks_total": len(episodes),
        "false_alarms_per_hour": round(fp_per_hour, 3),
        "obs": obs,
    }


def roc_like(scores_normal: np.ndarray, scores_attack: np.ndarray) -> float:
    """AUROC of the score separating normal vs attack windows (point-level)."""
    y = np.concatenate([np.zeros(len(scores_normal)), np.ones(len(scores_attack))])
    s = np.concatenate([scores_normal, scores_attack])
    order = np.argsort(s)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, len(s) + 1)
    n_pos = y.sum()
    n_neg = len(y) - n_pos
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    auc = (ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)
    return float(auc)
