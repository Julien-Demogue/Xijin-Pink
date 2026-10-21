"""Enrolled faces + habilitations (roles) — JSON persistence.

One record per identifier: reference embeddings + role. This is the "gestion
complète des habilitations" the consigne asks for, kept simple and file-backed.
Biometric data (face embeddings) are personal data — see docs governance note.
"""

from __future__ import annotations

import json
import os
import threading
import time

STORE_PATH = os.environ.get(
    "FACE_STORE", os.path.join(os.path.dirname(__file__), "data", "faces.json")
)


class Store:
    def __init__(self, path: str = STORE_PATH):
        self.path = path
        self._lock = threading.Lock()
        self._data = {"users": {}}
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            with open(self.path, encoding="utf-8") as fh:
                self._data = json.load(fh)
        self._data.setdefault("users", {})

    def _save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(self._data, fh)
        os.replace(tmp, self.path)

    def enroll(self, identifier: str, display_name: str, role: str, embedding) -> dict:
        with self._lock:
            user = self._data["users"].setdefault(
                identifier, {"displayName": display_name, "role": role,
                             "embeddings": [], "enrolledAt": time.time()}
            )
            user["displayName"] = display_name or user["displayName"]
            user["role"] = role or user.get("role", "operator")
            user["embeddings"].append([float(x) for x in embedding])
            self._save()
            return {"identifier": identifier, "samples": len(user["embeddings"]),
                    "role": user["role"]}

    def get(self, identifier: str) -> dict | None:
        return self._data["users"].get(identifier)

    def embeddings(self, identifier: str) -> list:
        user = self.get(identifier)
        return user["embeddings"] if user else []

    def list_users(self) -> list[dict]:
        return [
            {"identifier": k, "displayName": v.get("displayName"),
             "role": v.get("role"), "samples": len(v.get("embeddings", []))}
            for k, v in self._data["users"].items()
        ]

    def delete(self, identifier: str) -> bool:
        with self._lock:
            existed = self._data["users"].pop(identifier, None) is not None
            if existed:
                self._save()
            return existed
