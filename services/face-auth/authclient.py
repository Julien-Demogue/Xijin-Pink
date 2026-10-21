"""Password verification delegated to the existing auth-service.

Face-auth never stores or checks passwords itself — it only confirms the face,
then hands the password to auth-service (bcrypt + JWT already there). Keeps the
biometric layer and the credential layer separate.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

AUTH_URL = os.environ.get("AUTH_URL", "http://localhost:3001")


def verify_password(identifier: str, password: str) -> str | None:
    """Return a JWT if the credentials are valid, else None."""
    try:
        req = urllib.request.Request(
            f"{AUTH_URL}/api/auth/login", method="POST",
            data=json.dumps({"email": identifier, "password": password}).encode(),
            headers={"content-type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.load(resp).get("token")
    except urllib.error.HTTPError:
        return None  # 401 / 400 — bad credentials
    except Exception:
        return None
