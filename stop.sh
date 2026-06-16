#!/usr/bin/env bash

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "🛑  Arrêt des serveurs de développement..."
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null && echo "   Ports 3000 et 3001 libérés." || echo "   Aucun serveur actif."

echo "🐳  Arrêt des conteneurs Docker..."
docker compose -f docker/docker-compose.yml down
echo "   Terminé."
