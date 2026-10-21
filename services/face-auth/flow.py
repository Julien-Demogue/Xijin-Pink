"""Identification state machine (Consigne Additionnelle 1).

Per identifier: on face-recognition failure the user may retry once; a second
failure locks them for 5 minutes, and each further lock cycle escalates
(5 → 10 → 20 min…, the consigne's "etc."). A successful recognition resets it.
"""

from __future__ import annotations

import os
import threading
import time

MAX_ATTEMPTS = int(os.environ.get("FACE_MAX_ATTEMPTS", "2"))   # 1 try + 1 retry
BASE_LOCK_S = float(os.environ.get("FACE_LOCK_SECONDS", "300"))  # 5 minutes


class AuthFlow:
    def __init__(self):
        self._lock = threading.Lock()
        self._state: dict[str, dict] = {}  # identifier -> {fails, lock_until, lock_count}

    def _entry(self, identifier: str) -> dict:
        return self._state.setdefault(identifier, {"fails": 0, "lock_until": 0.0, "lock_count": 0})

    def status(self, identifier: str) -> dict:
        """Current gate state for an identifier."""
        with self._lock:
            e = self._entry(identifier)
            now = time.time()
            locked = now < e["lock_until"]
            return {
                "locked": locked,
                "lockedForSeconds": max(0, round(e["lock_until"] - now)) if locked else 0,
                "attemptsLeft": max(0, MAX_ATTEMPTS - e["fails"]),
            }

    def record_failure(self, identifier: str) -> dict:
        """A failed recognition. Locks (escalating) once attempts are exhausted."""
        with self._lock:
            e = self._entry(identifier)
            e["fails"] += 1
            if e["fails"] >= MAX_ATTEMPTS:
                e["lock_count"] += 1
                e["lock_until"] = time.time() + BASE_LOCK_S * (2 ** (e["lock_count"] - 1))
                e["fails"] = 0
            now = time.time()
            locked = now < e["lock_until"]
            return {
                "locked": locked,
                "lockedForSeconds": max(0, round(e["lock_until"] - now)) if locked else 0,
                "attemptsLeft": max(0, MAX_ATTEMPTS - e["fails"]),
            }

    def reset(self, identifier: str):
        """Successful recognition — clear failure count (keep lock history minimal)."""
        with self._lock:
            self._state[identifier] = {"fails": 0, "lock_until": 0.0,
                                       "lock_count": self._entry(identifier)["lock_count"]}
