"""End-to-end demo: generate telemetry, train, score, evaluate, print a report.

Run from the anomaly-detection folder:

    python -m detector.run_demo

Honours the split-by-run rule:
  * normal_train      -> Stage1 fit
  * normal_threshold  -> learned threshold
  * attacks_train     -> Stage2 fit (category)
  * attacks_test      -> final evaluation (held out)
"""

from __future__ import annotations

import numpy as np

from .evaluate import evaluate, roc_like
from .featurespec import extract_observations, label_observations
from .model import Stage1Baseline, Stage2Classifier
from .synth import generate_run, standard_attack_schedule


def _observations(duration, seed, attacks=None):
    records, manifest = generate_run(duration_s=duration, seed=seed, attacks=attacks)
    obs = extract_observations(records, t0=0.0, t_end=duration)
    return label_observations(obs, manifest), len(records)


def main():
    print("=" * 70)
    print("Xijin-Pink ML anomaly detector — end-to-end demo")
    print("=" * 70)

    # 1. Datasets (split by run).
    normal_train, n1 = _observations(1800, seed=1)
    normal_thr, n2 = _observations(600, seed=2)
    schedule = standard_attack_schedule(duration_s=1200)
    attacks_train, n3 = _observations(1200, seed=3, attacks=schedule)
    attacks_test, n4 = _observations(1200, seed=4, attacks=schedule)

    print(f"\nData (synthetic http_access, FeatureSpec v1):")
    print(f"  normal_train     {len(normal_train):4d} windows  ({n1} requests)")
    print(f"  normal_threshold {len(normal_thr):4d} windows  ({n2} requests)")
    print(f"  attacks_train    {len(attacks_train):4d} windows  ({n3} requests, {attacks_train['label'].sum()} attack)")
    print(f"  attacks_test     {len(attacks_test):4d} windows  ({n4} requests, {attacks_test['label'].sum()} attack)")

    # 2. Stage 1 — fit on NORMAL only, learn threshold on held-out normal.
    baseline = Stage1Baseline(version="2026-10-20.demo")
    baseline.fit(normal_train)
    thr = baseline.set_threshold(normal_thr, quantile=0.995)
    print(f"\nStage 1 (PCA recon + IsolationForest), trained on normal only.")
    print(f"  learned threshold (99.5th pct of normal scores): {thr:.3f}")

    # 3. Score the held-out test run and evaluate.
    scores = baseline.score(attacks_test)
    result = evaluate(attacks_test, scores, thr, k=3, n=4)

    # Compare PCA vs IsolationForest at point level (AUROC).
    normal_scores = baseline.score(normal_thr)
    attack_scores = scores[attacks_test["label"].to_numpy().astype(bool)]
    auc_pca = roc_like(normal_scores, attack_scores)
    if_normal = baseline.iforest_score(normal_thr)
    if_attack = baseline.iforest_score(attacks_test)[attacks_test["label"].to_numpy().astype(bool)]
    auc_if = roc_like(if_normal, if_attack)

    print(f"\nStage 1 detection (held-out test):")
    p = result["point"]
    print(f"  window precision {p['precision']:.3f}  recall {p['recall']:.3f}  f1 {p['f1']:.3f}")
    print(f"  attacks detected {result['attacks_detected']}/{result['attacks_total']}")
    print(f"  false alarms/hour (normal windows): {result['false_alarms_per_hour']}")
    print(f"  AUROC  PCA-recon {auc_pca:.3f}  vs  IsolationForest {auc_if:.3f}")
    print(f"  detection delay per episode:")
    for e in result["episodes"]:
        d = f"{e['delay_s']:.0f}s" if e["delay_s"] is not None else "MISSED"
        mark = "ok " if e["detected"] else "!! "
        print(f"    {mark}{e['category']:<13} on {e['scope']:<13} -> {d}")

    # 4. Stage 2 — category classifier, trained on attacks_train, tested on attacks_test.
    train_atk = attacks_train[attacks_train["label"] == 1]
    test_atk = attacks_test[attacks_test["label"] == 1]
    clf = Stage2Classifier(confidence_floor=0.5)
    clf.fit(train_atk, train_atk["category"])
    preds = clf.predict(test_atk)
    correct = sum(1 for pr, truth in zip(preds, test_atk["category"]) if pr["label"] == truth)
    print(f"\nStage 2 category (held-out attack windows): "
          f"{correct}/{len(test_atk)} = {correct/len(test_atk):.3f} accuracy")

    # 5. Show one Evidence sample (what an Alert would carry).
    fired = result["obs"][(result["obs"]["firing"]) & (result["obs"]["label"] == 1)]
    if len(fired):
        row = fired.iloc[0]
        ev = baseline.evidence(row)
        print(f"\nExample Evidence  (scope={row['scope']}, category={row['category']}):")
        for f in ev.top_features:
            print(f"    {f['name']:<22} observed={f['observed']:<12} expected={f['expected']}")

    print("\n" + "=" * 70)
    print("done.")


if __name__ == "__main__":
    main()
