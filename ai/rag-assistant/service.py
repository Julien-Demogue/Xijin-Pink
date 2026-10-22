"""RAG assistant HTTP API (read-only). Run:  uvicorn service:app --port 3020

Exposes:
  GET /health
  GET /ask?q=...            grounded answer with citations
  GET /explain              explain the latest live detector alert
  GET /explain/{alert_id}   explain a specific alert
  POST /reindex             rebuild the index from the corpus
"""

from __future__ import annotations

from fastapi import FastAPI

from rag.assistant import Assistant
from rag.index import Index
from rag.ollama_client import health as ollama_health

app = FastAPI(title="xijin-pink RAG operator assistant")
_assistant: Assistant | None = None


def _try_build():
    """Load a prebuilt index, else build one. Returns an Assistant or None (if
    Ollama isn't ready yet) — the service stays up and builds lazily on first use."""
    try:
        return Assistant()  # load a prebuilt index
    except Exception:
        try:
            index = Index.build()  # first run: build it (needs Ollama)
            index.save()
            return Assistant(index=index)
        except Exception:
            return None


@app.on_event("startup")
def _startup():
    global _assistant
    _assistant = _try_build()  # never raises → the container never crash-loops


def _assistant_or_build():
    global _assistant
    if _assistant is None:
        _assistant = _try_build()
    if _assistant is None:
        raise RuntimeError("index not ready (Ollama unreachable or models not pulled)")
    return _assistant


@app.get("/health")
def health():
    ready = _assistant is not None
    return {"status": "ok", "ollama": ollama_health(), "ready": ready,
            "chunks": len(_assistant.index.chunks) if ready else 0}


@app.get("/ask")
def ask(q: str):
    return _assistant_or_build().answer(q)


@app.get("/explain")
def explain_latest():
    return _assistant_or_build().explain_alert()


@app.get("/explain/{alert_id}")
def explain(alert_id: str):
    return _assistant_or_build().explain_alert(alert_id=alert_id)


@app.post("/reindex")
def reindex():
    global _assistant
    index = Index.build()
    index.save()
    _assistant = Assistant(index=index)
    return {"status": "ok", "chunks": len(index.chunks)}
