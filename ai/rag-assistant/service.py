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


@app.on_event("startup")
def _startup():
    global _assistant
    try:
        _assistant = Assistant()  # load a prebuilt index
    except Exception:
        index = Index.build()  # first run (e.g. fresh container): build it
        index.save()
        _assistant = Assistant(index=index)


@app.get("/health")
def health():
    return {"status": "ok", "ollama": ollama_health(), "chunks": len(_assistant.index.chunks)}


@app.get("/ask")
def ask(q: str):
    return _assistant.answer(q)


@app.get("/explain")
def explain_latest():
    return _assistant.explain_alert()


@app.get("/explain/{alert_id}")
def explain(alert_id: str):
    return _assistant.explain_alert(alert_id=alert_id)


@app.post("/reindex")
def reindex():
    global _assistant
    index = Index.build()
    index.save()
    _assistant = Assistant(index=index)
    return {"status": "ok", "chunks": len(index.chunks)}
