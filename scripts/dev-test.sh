#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATABASE_URL="${DATABASE_URL:-postgresql://moneyback:moneyback@localhost:5432/moneyback_test}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
API_PORT="${API_PORT:-3003}"
PORT="${PORT:-3002}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:${API_PORT}/api}"
CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:${PORT}}"
NEXT_PUBLIC_APP_ENV_LABEL="${NEXT_PUBLIC_APP_ENV_LABEL:-TEST}"
NEXT_PUBLIC_APP_ENV_DESCRIPTION="${NEXT_PUBLIC_APP_ENV_DESCRIPTION:-Base clonée moneyback_test}"
NEXT_PUBLIC_APP_DB_NAME="${NEXT_PUBLIC_APP_DB_NAME:-moneyback_test}"
NEXT_PUBLIC_APP_WEB_URL="${NEXT_PUBLIC_APP_WEB_URL:-http://localhost:${PORT}}"
APP_ENV_LABEL="${APP_ENV_LABEL:-test}"

echo "🧪 Préparation de la base de test..."
pnpm db:test:refresh

echo "⚙️ Compilation des packages partagés..."
pnpm build:packages

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│  MoneyBack test est prêt !                          │"
echo "│                                                     │"
echo "│  Application web  →  http://localhost:${PORT}          │"
echo "│  API REST         →  http://localhost:${API_PORT}/api      │"
echo "│  Swagger docs     →  http://localhost:${API_PORT}/api/docs │"
echo "│  Base             →  moneyback_test                │"
echo "│                                                     │"
echo "│  Appuyez sur Ctrl+C pour arrêter.                  │"
echo "└─────────────────────────────────────────────────────┘"
echo ""

export DATABASE_URL
export REDIS_URL
export API_PORT
export PORT
export NEXT_PUBLIC_API_URL
export CORS_ORIGIN
export NEXT_PUBLIC_APP_ENV_LABEL
export NEXT_PUBLIC_APP_ENV_DESCRIPTION
export NEXT_PUBLIC_APP_DB_NAME
export NEXT_PUBLIC_APP_WEB_URL
export APP_ENV_LABEL

pnpm --parallel --filter api --filter web dev
