#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "🐳  Vérification de Docker..."
if ! docker info &>/dev/null; then
  echo "   Docker n'est pas démarré — ouverture de Docker Desktop..."
  open -a Docker
  echo -n "   Attente de Docker"
  until docker info &>/dev/null 2>&1; do
    echo -n "."
    sleep 2
  done
  echo " prêt."
fi

echo "📦  Construction et démarrage de la stack Docker complète..."
pnpm docker:deploy:up

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│  MoneyBack Docker est prêt !                        │"
echo "│                                                     │"
echo "│  Web             →  http://localhost:3000           │"
echo "│  API REST        →  http://localhost:3001/api       │"
echo "│  Swagger docs    →  http://localhost:3001/api/docs  │"
echo "│                                                     │"
echo "│  Conteneurs :                                       │"
echo "│  - moneyback_web                                    │"
echo "│  - moneyback_api                                    │"
echo "│  - moneyback_postgres                               │"
echo "│  - moneyback_redis                                  │"
echo "└─────────────────────────────────────────────────────┘"
