"""Local RAG operator assistant (Ollama embeddings + LLM, read-only over docs)."""

from .assistant import Assistant
from .index import Index

__all__ = ["Assistant", "Index"]
