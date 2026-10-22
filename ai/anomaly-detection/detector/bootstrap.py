"""Self-bootstrap the detector model.

A trained model (model_store/*.pkl) is git-ignored, so a fresh clone has none.
Rather than require a campaign + training before the detector can start, this
trains a usable model from SYNTHETIC data on first start — so the stack works
end-to-end straight after `git clone` with no manual step. Replace it later with
a real model via `python -m detector.train_eval` for better accuracy.
"""

from __future__ import annotations

import os

from .featurespec import extract_observations, label_observations
from .model import Stage1Baseline, Stage2Classifier
from .persistence import save
from .synth import generate_run, standard_attack_schedule


def ensure_model(model_dir: str, quantile: float = 0.95) -> bool:
    """Train + save a synthetic model if none exists. Returns True if it trained."""
    base = os.path.join(model_dir, "baseline.pkl")
    stage2_path = os.path.join(model_dir, "stage2.pkl")
    if os.path.exists(base) and os.path.exists(stage2_path):
        return False

    schedule = standard_attack_schedule(1200)
    normal_recs, normal_man = generate_run(1800, seed=1)             # normal-only
    attack_recs, attack_man = generate_run(1200, seed=3, attacks=schedule)

    normal = label_observations(extract_observations(normal_recs, t0=0, t_end=1800), normal_man)
    # Sort by time before the fit/threshold split so every scope is represented in
    # the held-out half → per-scope thresholds for all services (as train_eval does).
    normal = normal[normal["req_count"] > 0].sort_values("window_start").reset_index(drop=True)
    attacks = label_observations(extract_observations(attack_recs, t0=0, t_end=1200), attack_man)
    attacks = attacks[attacks["req_count"] > 0].reset_index(drop=True)

    cut = int(len(normal) * 0.5)
    baseline = Stage1Baseline(version="synthetic-bootstrap")
    baseline.fit(normal.iloc[:cut])
    baseline.set_threshold(normal.iloc[cut:], quantile=quantile)
    save(baseline, base)

    attack_windows = attacks[attacks["label"] == 1]
    stage2 = Stage2Classifier().fit(attack_windows, attack_windows["category"])
    save(stage2, stage2_path)
    return True
