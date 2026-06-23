#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "🛑  Arrêt de la stack Docker MoneyBack..."
pnpm docker:deploy:down
echo "   Terminé."
