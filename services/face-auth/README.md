# Face-auth back-office (Consigne Additionnelle 1)

Renforced authentication for the back-office: a **three-step login** —
**identifier → face recognition → password**. A lightweight CPU face model
confirms the person matches the entered identifier before the password field is
even reachable, and an ESP8266 LED mirrors the state.

> Lab note: the imposed constraints (camera physically on the PC Hôte, JetBrains
> CLion/PlatformIO as the only IDE) are **relaxed here for now** — the camera is
> captured in the browser (any webcam), and the firmware builds with any
> Arduino/PlatformIO toolchain.

## How it works

```
identifier ─▶ /identify (webcam frame) ─▶ YuNet detect + SFace embed + cosine match
                 │ recognized (≥ 0.363)            │ not recognized
                 ▼                                  ▼
          LED GREEN_BLINK                    LED RED_30S, identifier cleared,
          password field unlocked            1 retry then 5-min lock (escalating)
                 │
            /password ─▶ auth-service (bcrypt+JWT)
                 │ ok                         │ wrong
                 ▼                            ▼
          LED GREEN_30S, token         LED RED_BLINK_10, restart identification
```

- **Recognition:** OpenCV **YuNet** (detect) + **SFace** (128-d embedding),
  cosine ≥ 0.363 = same identity. 1:1 verification against the identifier's
  enrolled face(s). No dlib, no compiler, ~37 MB of models, CPU.
- **Habilitations:** `store.py` keeps enrolled identifiers + role; `/users` lists
  them. Passwords are never handled here — delegated to `auth-service`.
- **Server-side gate:** `/password` returns 403 unless the face step passed within
  `FACE_RECOGNIZED_TTL` seconds — the flow can't be skipped from the client.
- **LED:** `led.py` sends one state to the ESP8266 (`ESP8266_URL`); the firmware
  runs the timing. No `ESP8266_URL` → mock mode (logged), so it demos without HW.

## Run (host)

```bash
cd services/face-auth
pip install -r requirements.txt
python download_models.py                 # fetch the ONNX models (git-ignored)
uvicorn app:app --host 0.0.0.0 --port 3005
# open http://localhost:3005  → enrol a face (admin panel), then log in
```

Env: `AUTH_URL` (default `http://localhost:3001`), `ESP8266_URL` (optional, e.g.
`http://192.168.137.50`), `FACE_COSINE_THRESHOLD`, `FACE_LOCK_SECONDS`.

## Test

```bash
python -m unittest discover -s tests      # flow (retry/lock), store, match math
```

Recognition verified on real faces: same person across photos → match (~0.74),
different people → reject (~0.10). The browser page handles the live camera.

## Layout

```
app.py            FastAPI: /enroll /identify /password /users, serves the page
recognition.py    YuNet + SFace (detect, embed, verify)
store.py          enrolled faces + roles (habilitations), JSON-backed
flow.py           retry + escalating 5-min lock state machine
led.py            ESP8266 LED client (+ mock)
authclient.py     password check delegated to auth-service
static/backoffice.html   the 3-step login page (webcam + LED mirror)
```
