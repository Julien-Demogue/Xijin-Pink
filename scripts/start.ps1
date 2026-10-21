# Start the whole platform on Windows (PowerShell). Equivalent of start.sh.
#   .\scripts\start.ps1          # everything (profile "ai")
#   .\scripts\start.ps1 base     # business SI + observability + WAF only
param([string]$Profile = "ai")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "infra\docker\.env"

Write-Host "== Xijin-Pink start (profil: $Profile) =="

# Docker up?
docker info *> $null
if ($LASTEXITCODE -ne 0) { Write-Error "Le démon Docker ne tourne pas (lance Docker Desktop)."; exit 1 }

# .env with strong generated secrets
function New-Secret { -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) }) }
if (-not (Test-Path $envFile)) {
  Write-Host "  génération de infra/docker/.env (secrets forts)..."
  @(
    "DB_NAME=xijin_pink",
    "DB_USER=xijin",
    "DB_PASSWORD=$(New-Secret)",
    "DB_ROOT_PASSWORD=$(New-Secret)",
    "JWT_SECRET=$(New-Secret)",
    "PSP_WEBHOOK_SECRET=$(New-Secret)",
    "PUBLIC_FRONT_URL=http://localhost:5173",
    "PUBLIC_PSP_URL=http://localhost:3003"
  ) | Set-Content -Encoding ascii $envFile
} else { Write-Host "  .env déjà présent — inchangé." }

# Ollama models (RAG), if installed
if (Get-Command ollama -ErrorAction SilentlyContinue) {
  foreach ($m in @("nomic-embed-text", "qwen2.5:3b")) {
    if (-not (ollama list | Select-String ($m -split ':')[0])) { Write-Host "  ollama pull $m..."; ollama pull $m }
  }
} else { Write-Host "  ollama absent — RAG actif une fois Ollama installé + modèles pull." }

# Launch
Push-Location (Join-Path $root "infra\docker")
Write-Host "== build + démarrage (premier lancement = long) =="
if ($Profile -eq "base") { docker compose up -d --build }
else { docker compose --profile ai up -d --build }
Pop-Location

Write-Host ""
Write-Host "  WAF (ingress)          http://localhost:8080"
Write-Host "  Dashboard supervision  http://localhost:3000/d/xijin-resilience"
Write-Host "  SOC / SIEM            http://localhost:3000/d/xijin-soc"
Write-Host "  Back-office (visage)   http://localhost:3005"
Write-Host "  RAG assistant          http://localhost:3020"
