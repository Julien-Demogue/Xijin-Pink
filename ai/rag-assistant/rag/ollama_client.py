"""Thin Ollama HTTP client (stdlib only) for embeddings and chat generation.
Both run locally; nothing leaves the machine."""

from __future__ import annotations

import json
import re
import urllib.request

import numpy as np

from .config import EMBED_MODEL, LLM_MODEL, OLLAMA_URL

_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)


def _post(path: str, body: dict, timeout=120) -> dict:
    req = urllib.request.Request(
        f"{OLLAMA_URL}{path}", method="POST",
        data=json.dumps(body).encode(), headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def embed(texts: list[str]) -> np.ndarray:
    """Embed texts with the local embedding model; L2-normalized rows."""
    vectors = []
    for text in texts:
        out = _post("/api/embeddings", {"model": EMBED_MODEL, "prompt": text})
        vectors.append(out["embedding"])
    arr = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms


def chat(system: str, user: str, timeout=180) -> str:
    """One-shot grounded generation. Bounded output; any <think> block stripped
    as a safety net if a reasoning model is configured."""
    out = _post("/api/chat", {
        "model": LLM_MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 400},
    }, timeout=timeout)
    content = out.get("message", {}).get("content", "")
    return _THINK.sub("", content).strip()


def health() -> bool:
    try:
        urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=5).read()
        return True
    except Exception:
        return False
