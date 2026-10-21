"""Vector index over the corpus chunks. numpy cosine similarity — the corpus is
small (dozens of chunks), so a flat index is instant and dependency-free."""

from __future__ import annotations

import pickle
from dataclasses import asdict

import numpy as np

from .config import INDEX_PATH, TOP_K
from .loader import Chunk, load_chunks
from .ollama_client import embed


class Index:
    def __init__(self, vectors: np.ndarray, chunks: list[Chunk]):
        self.vectors = vectors
        self.chunks = chunks

    @classmethod
    def build(cls) -> "Index":
        chunks = load_chunks()
        if not chunks:
            raise RuntimeError("empty corpus")
        vectors = embed([f"{c.heading}\n{c.text}" for c in chunks])
        return cls(vectors, chunks)

    def save(self, path: str = INDEX_PATH):
        with open(path, "wb") as fh:
            pickle.dump({"vectors": self.vectors, "chunks": [asdict(c) for c in self.chunks]}, fh)

    @classmethod
    def load(cls, path: str = INDEX_PATH) -> "Index":
        with open(path, "rb") as fh:
            data = pickle.load(fh)
        return cls(data["vectors"], [Chunk(**c) for c in data["chunks"]])

    def query(self, text: str, k: int = TOP_K, boost_categories: list[str] | None = None):
        q = embed([text])[0]
        sims = self.vectors @ q  # rows are normalized; q normalized
        if boost_categories:
            boost = np.array([
                0.15 if set(c.categories) & set(boost_categories) else 0.0
                for c in self.chunks
            ], dtype=np.float32)
            sims = sims + boost
        order = np.argsort(sims)[::-1][:k]
        return [(self.chunks[i], float(sims[i])) for i in order]
