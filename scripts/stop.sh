#!/usr/bin/env bash
# Stop the platform. Add --volumes to also drop data (DB, Loki, models).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/infra/docker"
if [ "${1:-}" = "--volumes" ]; then
  echo "arrêt + suppression des volumes (données perdues)..."
  docker compose --profile ai down --volumes
else
  echo "arrêt de la stack (données conservées)..."
  docker compose --profile ai down
fi
