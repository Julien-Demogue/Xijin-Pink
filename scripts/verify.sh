#!/usr/bin/env bash
# Quick health check of the running platform.
set -uo pipefail
ok=0; fail=0
check() {
  local name="$1" url="$2" exp="${3:-200}"
  local code; code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo 000)
  if [ "$code" = "$exp" ]; then echo "  OK   $name ($code)"; ok=$((ok+1))
  else echo "  FAIL $name ($code, attendu $exp) — $url"; fail=$((fail+1)); fi
}
echo "== vérification de la plateforme =="
check "WAF health"           http://localhost:8080/waf-health
check "WAF -> frontend"      http://localhost:8080/
check "WAF -> leaderboard"   http://localhost:8080/api/donations/leaderboard
check "auth-service"         http://localhost:3001/health
check "payment-api"          http://localhost:3002/health
check "psp-simulator"        http://localhost:3003/health
check "Grafana"              http://localhost:3000/api/health
check "Prometheus"           http://localhost:9090/-/healthy
echo "  -- AI (profil ai) --"
check "Détecteur ML"         http://localhost:3010/health
check "RAG assistant"        http://localhost:3020/health
check "Back-office visage"   http://localhost:3005/health
echo "== $ok OK, $fail FAIL =="
[ "$fail" -eq 0 ]
