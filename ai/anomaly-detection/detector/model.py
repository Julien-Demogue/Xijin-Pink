"""Detection models.

Stage 1 (unsupervised, trained on NORMAL only) answers "is this abnormal?" and
generalises to unseen attacks. Two learners are kept so the dossier can compare:

  * PCA reconstruction error — primary. Interpretable: the per-feature error
    gives the Evidence (observed vs expected) directly.
  * Isolation Forest — comparison baseline.

The threshold is LEARNED from scores on held-out normal data (a percentile), not
hand-picked — the core requirement of the brief.

Stage 2 (supervised, trained on labeled attack windows) answers "what kind?" and
abstains to `unknown` below a confidence floor.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler

from .featurespec import FEATURES, FEATURE_SPEC_VERSION

# Heavy-tailed, non-negative features (counts / bytes / rates / latency) get a
# log1p transform before scaling, so ordinary bursts (e.g. big leaderboard
# responses) stop looking anomalous. Ratios/shares (already 0-1) are left raw.
LOG1P_FEATURES = {
    "req_count", "req_rate_per_s", "latency_p50_ms", "latency_p95_ms",
    "bytes_out_p95", "bytes_out_sum", "bytes_out_per_req",
    "distinct_ips", "distinct_routes", "webhook_invalid_sig_count",
    "mem_mb",
}
_LOG1P_MASK = np.array([f in LOG1P_FEATURES for f in FEATURES])


@dataclass
class Evidence:
    top_features: list[dict]  # [{name, observed, expected}]


class Stage1Baseline:
    """Unsupervised normality model: scaler + PCA recon + IsolationForest.
    Skewed features are log1p-compressed before scaling."""

    def __init__(self, pca_variance=0.95, iforest_estimators=200, random_state=0, version="dev"):
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=pca_variance, random_state=random_state)
        self.iforest = IsolationForest(
            n_estimators=iforest_estimators, contamination="auto", random_state=random_state
        )
        self.threshold_: float | None = None   # global fallback
        self.thresholds_: dict[str, float] = {}  # per-scope
        self.version = version
        self.feature_spec = FEATURE_SPEC_VERSION

    @staticmethod
    def _pre(X: pd.DataFrame) -> np.ndarray:
        arr = X[FEATURES].to_numpy(dtype=float).copy()
        arr[:, _LOG1P_MASK] = np.log1p(np.clip(arr[:, _LOG1P_MASK], 0, None))
        return arr

    def fit(self, X_normal: pd.DataFrame) -> "Stage1Baseline":
        Z = self.scaler.fit_transform(self._pre(X_normal))
        self.pca.fit(Z)
        self.iforest.fit(Z)
        return self

    def _recon_error(self, Z: np.ndarray) -> np.ndarray:
        recon = self.pca.inverse_transform(self.pca.transform(Z))
        return np.sum((Z - recon) ** 2, axis=1)

    def score(self, X: pd.DataFrame) -> np.ndarray:
        """Primary anomaly score (PCA reconstruction error in scaled space)."""
        return self._recon_error(self.scaler.transform(self._pre(X)))

    def iforest_score(self, X: pd.DataFrame) -> np.ndarray:
        """Comparison score: higher = more anomalous."""
        return -self.iforest.score_samples(self.scaler.transform(self._pre(X)))

    def set_threshold(self, X_normal_holdout: pd.DataFrame, quantile=0.95) -> float:
        """Learn a threshold from held-out normal scores: a global one, and a
        per-scope one wherever there is enough data. Per-scope thresholds let a
        subtle attack on a quiet service (e.g. an auth 401 burst) stand out
        without being masked by a noisier service's variance."""
        self.threshold_ = float(np.quantile(self.score(X_normal_holdout), quantile))
        self.thresholds_ = {}
        if "scope" in X_normal_holdout:
            for scope, grp in X_normal_holdout.groupby("scope"):
                if len(grp) >= 10:
                    self.thresholds_[scope] = float(np.quantile(self.score(grp), quantile))
        return self.threshold_

    def threshold_for(self, scope: str) -> float:
        return self.thresholds_.get(scope, self.threshold_ or 0.0)

    def verdict(self, X: pd.DataFrame) -> np.ndarray:
        if self.threshold_ is None:
            raise RuntimeError("Call set_threshold() first")
        thr = X["scope"].map(self.threshold_for).to_numpy() if "scope" in X else self.threshold_
        return self.score(X) > thr

    def evidence(self, row: pd.Series, k=3) -> Evidence:
        """Per-feature reconstruction error → top-k deviating features.
        Observed is the real value; expected inverts the log1p for readability."""
        X = row.to_frame().T
        x_raw = X[FEATURES].to_numpy(dtype=float)[0]
        Zin = self.scaler.transform(self._pre(X))
        recon = self.pca.inverse_transform(self.pca.transform(Zin))
        per_feature_err = (Zin - recon)[0] ** 2
        expected_pre = self.scaler.inverse_transform(recon)[0]
        expected = np.where(_LOG1P_MASK, np.expm1(expected_pre), expected_pre)
        order = np.argsort(per_feature_err)[::-1][:k]
        return Evidence(
            top_features=[
                {
                    "name": FEATURES[i],
                    "observed": round(float(x_raw[i]), 2),
                    "expected": round(float(expected[i]), 2),
                }
                for i in order
            ]
        )


class Stage2Classifier:
    """Supervised category classifier with an abstention floor."""

    def __init__(self, confidence_floor=0.5, random_state=0):
        self.model = GradientBoostingClassifier(random_state=random_state)
        self.confidence_floor = confidence_floor
        self.classes_: list[str] = []

    def fit(self, X_attacks: pd.DataFrame, categories: pd.Series) -> "Stage2Classifier":
        self.model.fit(X_attacks[FEATURES].to_numpy(dtype=float), categories.to_numpy())
        self.classes_ = list(self.model.classes_)
        return self

    def predict(self, X: pd.DataFrame) -> list[dict]:
        proba = self.model.predict_proba(X[FEATURES].to_numpy(dtype=float))
        out = []
        for p in proba:
            idx = int(np.argmax(p))
            conf = float(p[idx])
            label = self.classes_[idx] if conf >= self.confidence_floor else "unknown"
            out.append({"label": label, "confidence": round(conf, 3)})
        return out
