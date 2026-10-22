"""Render the engineering & governance dossier (dossier.html) to PDF.

Uses headless Chrome (or Edge). Two passes: the first render is read back with
pypdf to find the page each section starts on, so the table of contents can
show page numbers. Without pypdf the PDF is still produced, just without them.

    python docs/governance/dossier/build.py
    CHROME=/path/to/chrome python docs/governance/dossier/build.py
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = HERE / "dossier.html"
OUT = ROOT / "Workshop2026-M2-G2" / "Workshop2026-M2-G2-Dossier.pdf"

BROWSERS = [
    os.environ.get("CHROME"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "msedge",
]

NBSP = "\u00a0"
RAW_TAGS = ("style", "script", "pre", "code")


def find_browser() -> str:
    for candidate in BROWSERS:
        if not candidate:
            continue
        if Path(candidate).exists():
            return candidate
        found = shutil.which(candidate)
        if found:
            return found
    sys.exit("Chrome/Edge not found. Set CHROME=/path/to/chrome.")


def french_spacing(html: str) -> str:
    """Non-breaking spaces where French typography wants them (before : ; ? ! %,
    inside « », between a number and its unit). Text nodes only."""
    head, sep, body = html.partition("<body")
    parts = re.split(r"(<[^>]+>)", body)
    raw_depth = 0
    for i, part in enumerate(parts):
        if part.startswith("<"):
            name = re.match(r"</?\s*([a-zA-Z0-9]+)", part)
            if name and name.group(1).lower() in RAW_TAGS:
                raw_depth += -1 if part.startswith("</") else 1
            continue
        if raw_depth > 0:
            continue
        text = re.sub(r" ([:;?!»%])", NBSP + r"\1", part)
        text = text.replace("« ", "«" + NBSP)
        text = re.sub(r"(\d) (s|ms|min|h|Mo|Go)\b", r"\1" + NBSP + r"\2", text)
        parts[i] = text
    return head + sep + "".join(parts)


def table_heads(html: str) -> str:
    """Move each table's header row into <thead> so Chrome repeats it on a page
    break and never leaves it alone at the bottom of a page."""
    return re.sub(r"<table([^>]*)>(\s*<tr>\s*<th.*?</tr>)", r"<table\1><thead>\2</thead>", html, flags=re.S)


def render(browser: str, html: str, pdf: Path, workdir: Path) -> None:
    page = workdir / "dossier.html"
    page.write_text(html, encoding="utf-8")
    subprocess.run(
        [
            browser,
            "--headless=new",
            "--disable-gpu",
            f"--user-data-dir={workdir / 'profile'}",
            "--no-pdf-header-footer",
            "--print-to-pdf-no-header",
            f"--print-to-pdf={pdf}",
            page.as_uri(),
        ],
        check=True,
        capture_output=True,
        timeout=180,
    )


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace(NBSP, " ")).strip().lower()


def section_pages(pdf: Path, html: str) -> dict[str, int]:
    """Map each <h1 id> to the page it starts on (1-based)."""
    from pypdf import PdfReader

    titles = [
        (sid, _norm(re.sub(r"<[^>]+>", "", inner)))
        for sid, inner in re.findall(r'<h1 id="([^"]+)"[^>]*>(.*?)</h1>', html, re.S)
    ]
    pages = [_norm(p.extract_text() or "") for p in PdfReader(str(pdf)).pages]
    found, start = {}, 2  # skip the cover and the contents page
    for sid, title in titles:
        for n in range(start, len(pages)):
            if title in pages[n]:
                found[sid] = n + 1
                start = n
                break
    return found


def fill_toc(html: str, pages: dict[str, int]) -> str:
    def repl(m: re.Match) -> str:
        return f'{m.group(1)}{pages.get(m.group(2), "")}</span>'

    return re.sub(r'(<span class="toc-page" data-ref="([^"]+)">)</span>', repl, html)


def main() -> None:
    browser = find_browser()
    html = table_heads(french_spacing(SRC.read_text(encoding="utf-8")))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        render(browser, html, OUT, workdir)
        try:
            pages = section_pages(OUT, html)
        except ImportError:
            print("pypdf not installed: contents page left without page numbers.")
            pages = {}
        if pages:
            render(browser, fill_toc(html, pages), OUT, workdir)
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
