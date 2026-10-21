# RAG Operator Assistant

Local assistant for operators facing an incident. Retrieves from the team docs +
`docs/runbooks/` and answers with citations. **Everything runs on local Ollama** —
embeddings (`nomic-embed-text`) and generation (`qwen2.5:3b`, a ~2 GB non-thinking
instruct model, strong in French) — so nothing leaves the lab and the 8 GB budget
holds. (The `qwen3:*` models are reasoning models that bury the answer in
chain-of-thought; swap any model via `RAG_LLM_MODEL`.)

Boundaries (by design): **read-only** over docs, **no tools, no system access**,
and **not** the remediation automaton (that is `services/remediation-engine`).

## Layout

```
rag/
  config.py          Ollama URL + models + corpus/index paths
  loader.py          walk docs/** -> chunks (path, heading, language, categories)
  ollama_client.py   embeddings + chat over Ollama HTTP (stdlib only)
  index.py           flat numpy cosine index (build / save / load / query)
  assistant.py       grounded answer with citations; alert-aware retrieval
build_index.py       build the index from the corpus
ask.py               CLI: ask a question, or --explain the latest alert
service.py           FastAPI: /ask, /explain, /health, /reindex
```

## Use

```bash
pip install -r requirements.txt
# Ollama must be running with the models pulled:
#   ollama pull nomic-embed-text && ollama pull qwen2.5:3b
python build_index.py
python ask.py "comment réagir à un pic de latence sur payment-api ?"
python ask.py --explain            # explain the latest live detector alert
# or serve it:
uvicorn service:app --port 3020    # GET /ask?q=... , GET /explain
```

Containerized with the stack: `docker compose --profile ai up rag-assistant`.

## "Explain this alert" — the bridge to the detector

`/explain` fetches the newest alert from the detector (`DETECTOR_URL/alerts`),
biases retrieval toward that alert's **category** runbook, and answers with the
procedure. The alert is injected into the prompt as **untrusted data** (its
fields can carry attacker-controlled strings from logs), and the system prompt
forbids treating it as instructions — a concrete prompt-injection defense.

## Security note

The corpus is read-only. The assistant never executes anything and holds no
credentials. It only reads docs and calls the local LLM.
