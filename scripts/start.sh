#!/usr/bin/env bash
# Start the whole platform with one command. Runs setup first, then builds and
# launches every service (profile "ai" = business SI + observability + WAF +
# detector + RAG + face-auth).
#
#   ./scripts/start.sh          # everything (default)
#   ./scripts/start.sh base     # only the business SI + observability + WAF
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${1:-ai}"

bash "$ROOT/scripts/setup.sh"

cd "$ROOT/infra/docker"
echo
echo "== démarrage de la stack (profil: $PROFILE) — build au premier lancement, patiente =="
if [ "$PROFILE" = "base" ]; then
  docker compose up -d --build
else
  docker compose --profile ai up -d --build
fi

echo
echo "== stack démarrée =="
cat <<'EOF'

  WAF (ingress)            http://localhost:8080
  Frontend (don)          via le WAF  → http://localhost:8080   (direct: :5173)
  Dashboard supervision   http://localhost:3000/d/xijin-resilience
  SOC / SIEM              http://localhost:3000/d/xijin-soc
  Back-office (visage)    http://localhost:3005
  Détecteur ML /metrics   http://localhost:3010/metrics
  RAG assistant           http://localhost:3020
  phpMyAdmin              http://localhost:8081

  Vérifier:  ./scripts/verify.sh        Arrêter:  ./scripts/stop.sh
EOF
