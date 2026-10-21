"""RAG assistant configuration. Everything local — Ollama for both embeddings
and generation, so nothing leaves the lab and the 8 GB budget holds
(qwen3:4b ~2.5 GB loaded on demand, nomic-embed-text ~0.3 GB)."""

from __future__ import annotations

import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.environ.get("RAG_EMBED_MODEL", "nomic-embed-text")
# Non-thinking instruct model: direct, grounded answers (qwen3:* are reasoning
# models that bury the answer in chain-of-thought — unsuitable here). qwen2.5:3b
# is ~2 GB, strong in French, well within the 8 GB budget. Swap via RAG_LLM_MODEL.
LLM_MODEL = os.environ.get("RAG_LLM_MODEL", "qwen2.5:3b")

# Read-only corpus: team docs + operator runbooks. RAG_CORPUS_DIR overrides the
# location (e.g. a mounted /app/docs in a container).
CORPUS_DIRS = [os.environ.get("RAG_CORPUS_DIR") or os.path.join(REPO, "docs")]

INDEX_PATH = os.environ.get("RAG_INDEX", os.path.join(os.path.dirname(__file__), "..", "index.pkl"))
DETECTOR_URL = os.environ.get("DETECTOR_URL", "http://localhost:3010")  # for explain-alert

TOP_K = int(os.environ.get("RAG_TOP_K", "4"))
