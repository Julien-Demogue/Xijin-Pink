"""Face-auth back-office (Consigne Additionnelle 1).

Three-step login: identifier → face recognition (USB/any camera) → password.
Runs on the host (camera is captured in the browser and posted here). Delegates
passwords to auth-service and drives the ESP8266 LED. Serves the back-office page.

    uvicorn app:app --host 0.0.0.0 --port 3005
"""

from __future__ import annotations

import os
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from authclient import verify_password
from flow import AuthFlow
from led import set_led
from recognition import FaceRecognizer, NoFaceError, decode_image
from store import Store

RECOGNIZED_TTL = float(os.environ.get("FACE_RECOGNIZED_TTL", "120"))  # seconds
HERE = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="Xijin-Pink face-auth back-office")

# Allow the donor front (its own origin, e.g. http://localhost:5173) to call the
# identify/password endpoints. No credentials are used (token travels in the body).
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

recognizer = FaceRecognizer()
store = Store()
flow = AuthFlow()
_recognized: dict[str, float] = {}  # identifier -> expiry (passed the face gate)


class EnrollBody(BaseModel):
    identifier: str
    image: str
    displayName: str | None = None
    role: str | None = "operator"


class IdentifyBody(BaseModel):
    identifier: str
    image: str


class PasswordBody(BaseModel):
    identifier: str
    password: str


@app.get("/")
def backoffice():
    return FileResponse(os.path.join(HERE, "static", "backoffice.html"))


@app.get("/health")
def health():
    return {"status": "ok", "enrolled": len(store.list_users())}


@app.get("/users")
def users():
    """Habilitations: enrolled identifiers + roles (no embeddings exposed)."""
    return {"users": store.list_users()}


@app.post("/enroll")
def enroll(body: EnrollBody):
    try:
        emb = recognizer.embedding(decode_image(body.image))
    except NoFaceError:
        return JSONResponse({"error": "no_face", "message": "Aucun visage détecté"}, status_code=400)
    except ValueError:
        return JSONResponse({"error": "bad_image"}, status_code=400)
    result = store.enroll(body.identifier, body.displayName or body.identifier,
                          body.role or "operator", emb)
    return {"enrolled": True, **result}


@app.post("/identify")
def identify(body: IdentifyBody):
    ident = body.identifier
    gate = flow.status(ident)
    if gate["locked"]:
        set_led("OFF")
        return {"recognized": False, **gate}

    if store.get(ident) is None:
        # Unknown identifier is treated as "not recognized" (don't leak existence).
        gate = flow.record_failure(ident)
        set_led("RED_30S")
        return {"recognized": False, **gate}

    try:
        emb = recognizer.embedding(decode_image(body.image))
    except NoFaceError:
        set_led("OFF")  # soft: no face in frame is not a security failure
        return {"recognized": False, "reason": "no_face", **flow.status(ident)}
    except ValueError:
        return JSONResponse({"error": "bad_image"}, status_code=400)

    is_match, score = recognizer.verify(emb, store.embeddings(ident))
    if is_match:
        flow.reset(ident)
        _recognized[ident] = time.time() + RECOGNIZED_TTL
        set_led("GREEN_BLINK")
        return {"recognized": True, "score": round(score, 3)}

    gate = flow.record_failure(ident)
    set_led("RED_30S")
    return {"recognized": False, "score": round(score, 3), **gate}


@app.post("/password")
def password(body: PasswordBody):
    ident = body.identifier
    # Server-side gate: the face step must have passed recently.
    if _recognized.get(ident, 0) < time.time():
        return JSONResponse(
            {"ok": False, "error": "face_required",
             "message": "Reconnaissance faciale requise d'abord"}, status_code=403)

    token = verify_password(ident, body.password)
    if token:
        _recognized.pop(ident, None)
        set_led("GREEN_30S")
        return {"ok": True, "token": token}

    # Wrong password: restart the whole identification phase.
    _recognized.pop(ident, None)
    set_led("RED_BLINK_10")
    return {"ok": False, "restart": True}
