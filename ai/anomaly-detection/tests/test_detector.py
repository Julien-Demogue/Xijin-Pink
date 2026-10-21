"""Unit tests for the detector. Run from the anomaly-detection folder:

    python -m unittest discover -s tests -v

No running stack needed — everything is exercised on fixture log lines and
synthetic runs.
"""

import unittest

import numpy as np

from detector.featurespec import (
    FEATURES,
    extract_observations,
    label_observations,
    scope_for_route,
)
from detector.model import Stage1Baseline, Stage2Classifier
from detector.synth import generate_run, standard_attack_schedule


def _rec(t, route, status=200, duration=50.0, bytes_out=100.0, ip="192.168.137.20"):
    return {"timestamp": t, "route": route, "method": "GET", "status": status,
            "duration_ms": duration, "bytes_out": bytes_out, "ip": ip}


class TestFeatureSpec(unittest.TestCase):
    def test_scope_attribution(self):
        self.assertEqual(scope_for_route("/api/auth/login"), "auth-service")
        self.assertEqual(scope_for_route("/api/donations/checkout"), "payment-api")
        self.assertEqual(scope_for_route("/checkout/:id"), "psp-simulator")

    def test_window_features_basic(self):
        recs = [
            _rec(0.1, "/api/donations/leaderboard", 200, 40, 5000, "192.168.137.20"),
            _rec(0.2, "/api/donations/checkout", 201, 60, 300, "192.168.137.21"),
            _rec(0.3, "/api/donations/checkout", 500, 900, 120, "192.168.137.21"),
        ]
        obs = extract_observations(recs, t0=0.0, t_end=10.0)
        self.assertGreater(len(obs), 0)
        first = obs.iloc[0]
        self.assertEqual(first["req_count"], 3.0)
        self.assertAlmostEqual(first["error_rate_5xx"], 1 / 3, places=5)
        # top IP sent 2 of 3 requests
        self.assertAlmostEqual(first["top_ip_share"], 2 / 3, places=5)
        self.assertEqual(set(FEATURES).issubset(obs.columns), True)

    def test_empty_window_is_zero_row(self):
        recs = [_rec(0.1, "/api/donations/checkout"), _rec(100.0, "/api/donations/checkout")]
        obs = extract_observations(recs, t0=0.0, t_end=110.0)
        payment = obs[obs["scope"] == "payment-api"]
        # there must be at least one all-zero (silent) window in the long gap
        zero_rows = (payment[FEATURES].sum(axis=1) == 0).sum()
        self.assertGreater(zero_rows, 0)

    def test_labeling_overlap(self):
        recs, manifest = generate_run(duration_s=300, seed=7,
                                      attacks=[("availability", 100.0, 160.0)])
        obs = label_observations(extract_observations(recs, t0=0, t_end=300), manifest)
        attacked = obs[(obs["scope"] == "payment-api") & (obs["label"] == 1)]
        self.assertGreater(len(attacked), 0)
        self.assertTrue((attacked["category"] == "availability").all())
        # windows well before the episode are normal
        early = obs[(obs["scope"] == "payment-api") & (obs["window_end"] < 90)]
        self.assertTrue((early["label"] == 0).all())


class TestModel(unittest.TestCase):
    def _normal(self, seed):
        recs, man = generate_run(duration_s=900, seed=seed)
        return label_observations(extract_observations(recs, t0=0, t_end=900), man)

    def test_stage1_separates_attack_from_normal(self):
        baseline = Stage1Baseline()
        baseline.fit(self._normal(11))
        thr = baseline.set_threshold(self._normal(12), quantile=0.995)
        self.assertGreater(thr, 0)

        recs, man = generate_run(duration_s=600, seed=13,
                                 attacks=[("availability", 200.0, 260.0)])
        test = label_observations(extract_observations(recs, t0=0, t_end=600), man)
        scores = baseline.score(test)
        atk = scores[test["label"].to_numpy().astype(bool)]
        norm = scores[~test["label"].to_numpy().astype(bool)]
        # attack windows score clearly higher on average
        self.assertGreater(np.median(atk), np.median(norm))
        # and most attack windows exceed the learned threshold
        self.assertGreater((atk > thr).mean(), 0.5)

    def test_threshold_keeps_normal_false_positive_low(self):
        baseline = Stage1Baseline()
        baseline.fit(self._normal(21))
        thr = baseline.set_threshold(self._normal(22), quantile=0.995)
        fresh_normal = baseline.score(self._normal(23))
        # on unseen normal, false-positive rate stays small
        self.assertLess((fresh_normal > thr).mean(), 0.05)

    def test_evidence_shape(self):
        baseline = Stage1Baseline()
        normal = self._normal(31)
        baseline.fit(normal)
        baseline.set_threshold(self._normal(32))
        ev = baseline.evidence(normal.iloc[0], k=3)
        self.assertEqual(len(ev.top_features), 3)
        self.assertIn("name", ev.top_features[0])
        self.assertIn("observed", ev.top_features[0])
        self.assertIn("expected", ev.top_features[0])

    def test_stage2_classifies_categories(self):
        sched = standard_attack_schedule(duration_s=1200)
        recs_tr, man_tr = generate_run(duration_s=1200, seed=41, attacks=sched)
        recs_te, man_te = generate_run(duration_s=1200, seed=42, attacks=sched)
        tr = label_observations(extract_observations(recs_tr, t0=0, t_end=1200), man_tr)
        te = label_observations(extract_observations(recs_te, t0=0, t_end=1200), man_te)
        tr_atk, te_atk = tr[tr["label"] == 1], te[te["label"] == 1]
        clf = Stage2Classifier().fit(tr_atk, tr_atk["category"])
        preds = clf.predict(te_atk)
        acc = np.mean([p["label"] == t for p, t in zip(preds, te_atk["category"])])
        self.assertGreater(acc, 0.7)


if __name__ == "__main__":
    unittest.main(verbosity=2)
