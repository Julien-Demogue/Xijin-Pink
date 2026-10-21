"""Corpus loader: walk the team docs + runbooks and split them into chunks,
one per heading section, with light metadata (path, heading, language, incident
categories). Small corpus, so chunking is simple and deterministic."""

from __future__ import annotations

import glob
import os
import re
from dataclasses import dataclass

from .config import CORPUS_DIRS, REPO

_HEADING = re.compile(r"^(#{1,3})\s+(.*)$")
_FR_HINTS = (" le ", " la ", " les ", " des ", " une ", " est ", " pas ", " pour ",
             " aux ", " avec ", " vérifier ", " réponse ")

# Map runbook filenames to the alert categories they cover (for retrieval boost).
_CATEGORY_BY_KEYWORD = {
    "disponibilite": "availability",
    "dos": "availability",
    "force-brute": "auth-abuse",
    "auth": "auth-abuse",
    "injection": "injection",
    "exfiltration": "exfiltration",
    "inconnu": "unknown",
}


@dataclass
class Chunk:
    path: str          # repo-relative, e.g. docs/runbooks/injection.md
    heading: str
    text: str
    lang: str
    categories: list[str]


def _lang(text: str) -> str:
    low = f" {text.lower()} "
    return "fr" if sum(low.count(h) for h in _FR_HINTS) >= 2 else "en"


def _categories(path: str) -> list[str]:
    low = path.lower()
    cats = {cat for kw, cat in _CATEGORY_BY_KEYWORD.items() if kw in low}
    return sorted(cats)


def _split(path: str, raw: str) -> list[tuple[str, str]]:
    """Return (heading, section_text) pairs, splitting on markdown headings."""
    sections, heading, buf = [], os.path.basename(path), []
    for line in raw.splitlines():
        m = _HEADING.match(line)
        if m:
            if buf:
                sections.append((heading, "\n".join(buf).strip()))
            heading, buf = m.group(2).strip(), [line]
        else:
            buf.append(line)
    if buf:
        sections.append((heading, "\n".join(buf).strip()))
    return [(h, t) for h, t in sections if t]


def load_chunks() -> list[Chunk]:
    chunks: list[Chunk] = []
    for base in CORPUS_DIRS:
        for path in sorted(glob.glob(os.path.join(base, "**", "*.md"), recursive=True)):
            rel = os.path.relpath(path, REPO).replace(os.sep, "/")
            with open(path, encoding="utf-8") as fh:
                raw = fh.read()
            cats = _categories(rel)
            for heading, text in _split(rel, raw):
                chunks.append(Chunk(rel, heading, text, _lang(text), cats))
    return chunks
