"""Unit tests for the parts that need no camera: the lock/retry state machine,
the habilitations store, and the cosine/verify math.

    cd services/face-auth && python -m unittest discover -s tests -v
"""

import os
import sys
import tempfile
import time
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flow import AuthFlow  # noqa: E402
from recognition import COSINE_THRESHOLD, FaceRecognizer  # noqa: E402
from store import Store  # noqa: E402


class TestFlow(unittest.TestCase):
    def test_one_retry_then_lock(self):
        os.environ["FACE_LOCK_SECONDS"] = "300"
        f = AuthFlow()
        self.assertFalse(f.status("u")["locked"])
        r1 = f.record_failure("u")          # 1st failure: a retry remains
        self.assertFalse(r1["locked"])
        self.assertEqual(r1["attemptsLeft"], 1)
        r2 = f.record_failure("u")          # 2nd failure: locked
        self.assertTrue(r2["locked"])
        self.assertGreater(r2["lockedForSeconds"], 250)

    def test_escalating_lock(self):
        f = AuthFlow()
        f.record_failure("v"); first = f.record_failure("v")["lockedForSeconds"]
        # force the lock to expire, then fail twice more -> longer lock
        f._state["v"]["lock_until"] = time.time() - 1
        f.record_failure("v"); second = f.record_failure("v")["lockedForSeconds"]
        self.assertGreater(second, first)   # 5 min -> 10 min

    def test_reset_clears_fails(self):
        f = AuthFlow()
        f.record_failure("w")
        f.reset("w")
        self.assertEqual(f.status("w")["attemptsLeft"], 2)


class TestStore(unittest.TestCase):
    def test_enroll_and_list(self):
        path = os.path.join(tempfile.mkdtemp(), "faces.json")
        s = Store(path)
        s.enroll("a@test", "Alice", "admin", np.ones(128, dtype=np.float32))
        s.enroll("a@test", "Alice", "admin", np.ones(128, dtype=np.float32))  # 2nd sample
        self.assertEqual(len(s.embeddings("a@test")), 2)
        users = s.list_users()
        self.assertEqual(users[0]["identifier"], "a@test")
        self.assertEqual(users[0]["role"], "admin")
        # persisted across reloads
        self.assertEqual(len(Store(path).embeddings("a@test")), 2)


class TestMatchMath(unittest.TestCase):
    def test_cosine_and_verify(self):
        same = np.array([1, 0, 0, 0], dtype=np.float32)
        near = np.array([0.95, 0.1, 0, 0], dtype=np.float32)
        far = np.array([0, 1, 0, 0], dtype=np.float32)
        self.assertAlmostEqual(FaceRecognizer.cosine(same, same), 1.0, places=5)
        # identical sample is clearly above the identity threshold
        ok, score = FaceRecognizer.verify(FaceRecognizer, near, [same])
        self.assertGreater(score, COSINE_THRESHOLD)
        self.assertTrue(ok)
        # orthogonal sample is below threshold
        ok2, score2 = FaceRecognizer.verify(FaceRecognizer, far, [same])
        self.assertFalse(ok2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
