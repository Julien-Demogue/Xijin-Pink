"""Train + evaluate the detector on REAL campaign data, split by run.

    python -m detector.train_eval \
        --train ../../data/train.jsonl --train-manifest ../../data/train_manifest.json \
        --test  ../../data/test.jsonl  --test-manifest  ../../data/test_manifest.json

Stage 1 trains on the TRAIN run's normal windows only (threshold on a held-out
slice of them). Stage 2 trains on the TRAIN run's attack windows. All headline
numbers are measured on the TEST run, which training never saw.
Saves model_store/{baseline,stage2}.pkl for the live scorer.
"""

from __future__ import annotations

import argparse
import os

import numpy as np

from .evaluate import evaluate, roc_like
from .featurespec import FEATURES, extract_observations, label_observations
from .ingest import load_manifest, load_records
from .model import Stage1Baseline, Stage2Classifier
from .persistence import save
from .resources import attach

HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(HERE, "..", "model_store")


def _load(records_path, manifest_path):
    recs = load_records(records_path)
    obs = extract_observations(recs)
    obs = label_observations(obs, load_manifest(manifest_path))
    # Drop empty windows (no traffic to judge) — a silent service is the WAF's
    # 5xx signal, not an all-zero app-log window. Keeps the detector honest.
    obs = obs[obs["req_count"] > 0].reset_index(drop=True)
    obs = attach(obs)  # join cpu_cores / mem_mb from Prometheus (FeatureSpec v2)
    return obs, len(recs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", required=True)
    ap.add_argument("--train-manifest", required=True)
    ap.add_argument("--test", required=True)
    ap.add_argument("--test-manifest", required=True)
    ap.add_argument("--quantile", type=float, default=0.95)
    args = ap.parse_args()

    train, n_tr = _load(args.train, args.train_manifest)
    test, n_te = _load(args.test, args.test_manifest)
    print("=" * 68)
    print("Detector — real data, split by run")
    print("=" * 68)
    print(f"train run: {len(train):4d} windows ({n_tr} http_access), "
          f"{int((train.label==1).sum())} attack")
    print(f"test  run: {len(test):4d} windows ({n_te} http_access), "
          f"{int((test.label==1).sum())} attack")

    # Stage 1: normal only. Fit on half, learn the threshold on the other half
    # (a larger held-out slice makes the quantile estimate far more stable → the
    # main lever on false alarms when normal data is limited).
    normal = train[train.label == 0].sort_values("window_start")
    cut = int(len(normal) * 0.5)
    baseline = Stage1Baseline(version="real.2")
    baseline.fit(normal.iloc[:cut])
    thr = baseline.set_threshold(normal.iloc[cut:], quantile=args.quantile)
    per_scope = ", ".join(f"{s}={t:.2f}" for s, t in sorted(baseline.thresholds_.items()))
    print(f"\nStage 1 fit on {cut} normal windows; global threshold={thr:.3f}")
    print(f"  per-scope thresholds: {per_scope}")

    scores = baseline.score(test)
    result = evaluate(test, scores, thr, k=3, n=4, thresholds=baseline.thresholds_)
    p = result["point"]
    print(f"  window precision {p['precision']:.3f}  recall {p['recall']:.3f}  f1 {p['f1']:.3f}")
    print(f"  attacks detected {result['attacks_detected']}/{result['attacks_total']}")
    print(f"  false alarms/hour on normal: {result['false_alarms_per_hour']}")

    mask = test.label.to_numpy().astype(bool)
    auc_pca = roc_like(scores[~mask], scores[mask])
    if_s = baseline.iforest_score(test)
    auc_if = roc_like(if_s[~mask], if_s[mask])
    print(f"  AUROC  PCA {auc_pca:.3f}  vs  IsolationForest {auc_if:.3f}")
    print("  detection delay per episode:")
    for e in result["episodes"]:
        d = f"{e['delay_s']:.0f}s" if e["delay_s"] is not None else "MISSED"
        print(f"    {'ok ' if e['detected'] else '!! '}{e['category']:<13} {e['scope']:<13} {d}")

    # Stage 2: category, trained on TRAIN attacks, measured on TEST attacks.
    tr_atk, te_atk = train[train.label == 1], test[test.label == 1]
    stage2 = Stage2Classifier(confidence_floor=0.5)
    if len(tr_atk) and len(te_atk):
        stage2.fit(tr_atk, tr_atk["category"])
        preds = stage2.predict(te_atk)
        acc = np.mean([pr["label"] == t for pr, t in zip(preds, te_atk["category"])])
        print(f"\nStage 2 category accuracy (held-out run): {acc:.3f}")
        for cat in sorted(te_atk["category"].unique()):
            idx = te_atk["category"].to_numpy() == cat
            got = [preds[i]["label"] for i in range(len(preds)) if idx[i]]
            hits = sum(g == cat for g in got)
            print(f"    {cat:<13} {hits}/{len(got)}")

    save(baseline, os.path.join(STORE, "baseline.pkl"))
    save(stage2, os.path.join(STORE, "stage2.pkl"))
    print(f"\nsaved model_store/baseline.pkl, stage2.pkl  (features: {len(FEATURES)})")


if __name__ == "__main__":
    main()
