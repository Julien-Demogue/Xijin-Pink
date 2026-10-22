#!/usr/bin/env bash
# One-time setup: prerequisites, strong secrets, AI models. Idempotent.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Xijin-Pink setup =="

# 1. Prerequisites ----------------------------------------------------------
command -v docker >/dev/null || { echo "ERREUR: Docker requis."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "ERREUR: docker compose v2 requis."; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERREUR: le démon Docker ne tourne pas (lance Docker Desktop)."; exit 1; }
echo "  docker: ok"

# 2. Secrets (.env) — generated, strong, git-ignored ------------------------
ENV="infra/docker/.env"
gen() { openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
if [ ! -f "$ENV" ]; then
  echo "  génération de $ENV (secrets forts)..."
  cat > "$ENV" <<EOF
DB_NAME=xijin_pink
DB_USER=xijin
DB_PASSWORD=$(gen)
DB_ROOT_PASSWORD=$(gen)
JWT_SECRET=$(gen)
PSP_WEBHOOK_SECRET=$(gen)
PUBLIC_FRONT_URL=http://localhost:5173
PUBLIC_PSP_URL=http://localhost:3003
EOF
  echo "  .env créé (git-ignoré). Pour le livrable: chiffrer avec SOPS, cf. infra/secrets/."
else
  echo "  .env déjà présent — inchangé."
fi

# 3. AI models (RAG) — only if Ollama is installed --------------------------
if command -v ollama >/dev/null 2>&1; then
  for m in nomic-embed-text qwen2.5:3b; do
    if ollama list 2>/dev/null | grep -q "${m%%:*}"; then echo "  ollama: $m ok";
    else echo "  ollama pull $m..."; ollama pull "$m"; fi
  done
else
  echo "  ollama absent — le RAG démarrera, mais répondra une fois Ollama installé"
  echo "    et les modèles récupérés: ollama pull nomic-embed-text && ollama pull qwen2.5:3b"
fi

echo "== setup terminé =="
