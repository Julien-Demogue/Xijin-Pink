# Scripts — démarrage tout-en-un

Tout démarre avec **une commande**. Les scripts sont idempotents.

| Script | Rôle |
| --- | --- |
| `setup.sh` | Vérifie les prérequis, génère `infra/docker/.env` (secrets forts, git-ignoré), récupère les modèles Ollama du RAG si Ollama est installé. |
| `start.sh [ai\|base]` | Lance `setup.sh` puis **build + démarre toute la stack**. `ai` (défaut) = SI métier + observabilité + WAF + détecteur + RAG + back-office visage. `base` = sans l'IA. |
| `verify.sh` | Vérifie la santé de tous les endpoints (OK/FAIL). |
| `stop.sh [--volumes]` | Arrête la stack (`--volumes` supprime aussi les données). |
| `start.ps1` | Équivalent Windows/PowerShell de `start.sh`. |

## Démarrage

```bash
# Linux / macOS / Git-Bash
./scripts/start.sh
```
```powershell
# Windows PowerShell
.\scripts\start.ps1
```

Prérequis : **Docker** (démon lancé). **Ollama** est optionnel — sans lui, tout
tourne sauf les réponses du RAG (le service démarre quand même).

Le premier lancement **build toutes les images** (services Node, détecteur, RAG,
back-office visage) et télécharge les modèles — c'est long une fois, puis rapide.

## Après démarrage

```
WAF (ingress)            http://localhost:8080
Dashboard supervision    http://localhost:3000/d/xijin-resilience
SOC / SIEM              http://localhost:3000/d/xijin-soc
Back-office (visage)     http://localhost:3005
RAG assistant            http://localhost:3020
```

Vérifier : `./scripts/verify.sh` — Arrêter : `./scripts/stop.sh`
