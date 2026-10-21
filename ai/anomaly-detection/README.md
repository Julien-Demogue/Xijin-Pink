# Anomaly Detection (ML)

Machine-learning detector over the platform's logs. It learns normal behaviour
from real `http_access` telemetry and raises a structured **Alert** into the
remediation chain when behaviour turns suspect — **no hard-coded thresholds** (the
threshold is learned from normal data). Design: [DOMAIN.md](DOMAIN.md). Contracts:
[../../docs/api/telemetry-contract.md](../../docs/api/telemetry-contract.md),
[../../docs/api/alert-contract.md](../../docs/api/alert-contract.md).

## Layout

```
detector/
  featurespec.py   http_access logs -> windowed Observations (FeatureSpec v1)
  model.py         Stage1 (PCA recon + IsolationForest) + Stage2 (category)
  evaluate.py      metrics + the anomaly lifecycle (k-of-n persistence)
  ingest.py        read a Loki export (JSONL) + run manifest
  train_eval.py    train on real data, split by run, save model_store/*.pkl
  synth.py         synthetic telemetry (CI fixtures / offline demo)
  run_demo.py      end-to-end demo on synthetic data
live_scorer.py     FastAPI online scorer: /metrics + POSTs alerts
instrumentation/   the telemetry middleware (now wired into the services)
tests/             unit tests (python -m unittest discover -s tests)
```

## Build a dataset and train (real data)

```bash
# 1. stack up + logging live (infra/docker), then run a campaign:
python redteam/campaign.py                       # writes data/*_manifest.json
python tools/dataset/export_loki.py --since <s> --until <e> --out data/train.jsonl
# (do a second campaign for data/test.jsonl — held out)

# 2. train + evaluate (from this folder):
python -m detector.train_eval \
  --train ../../data/train.jsonl --train-manifest ../../data/train_manifest.json \
  --test  ../../data/test.jsonl  --test-manifest  ../../data/test_manifest.json
# -> prints precision/recall, per-category detection, delay, AUROC;
#    saves model_store/baseline.pkl + stage2.pkl
```

## Run the live scorer

```bash
pip install -r requirements.txt
uvicorn live_scorer:app --port 3010        # reads Loki, scores, exposes /metrics
```

Or containerized with the stack: `docker compose --profile ai up anomaly-detector`
(loads `model_store/`, scrapeable at `:3010/metrics`, POSTs to `REMEDIATION_URL`).

## Offline demo (no stack)

```bash
python -m detector.run_demo
```
