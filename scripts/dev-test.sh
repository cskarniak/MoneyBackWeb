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
TARGET_DB="${TARGET_DB:-moneyback_test}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-moneyback_postgres}"
POSTGRES_USER="${POSTGRES_USER:-moneyback}"

ensure_docker_and_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker n'est pas installé ou n'est pas dans le PATH."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker n'est pas démarré. Lance Docker Desktop puis relance 'pnpm dev:test'."
    exit 1
  fi

  echo "📦 Démarrage de PostgreSQL local..."
  pnpm docker:up >/dev/null
  wait_for_postgres
}

wait_for_postgres() {
  echo -n "⏳ Attente de PostgreSQL"
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null)" = "healthy" ]; do
    echo -n "."
    sleep 1
  done
  echo " prêt."
}

ensure_test_db_exists() {
  local db_exists
  db_exists="$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB'")"
  if [[ "$db_exists" != "1" ]]; then
    echo "La base de test '$TARGET_DB' n'existe pas."
    echo "Relance avec '--reset' si tu veux la recréer depuis 'moneyback'."
    exit 1
  fi
}

RESET_DB="${1:-}"
if [[ "$RESET_DB" != "--reset" ]]; then
  read -r -p "🗄️  Remettre à zéro la base de test (copie depuis moneyback) ? [y/N] " answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    RESET_DB="--reset"
  fi
fi

ensure_docker_and_postgres

if [[ "$RESET_DB" == "--reset" ]]; then
  echo "🧪 Remise à zéro de la base de test..."
  pnpm db:test:refresh
else
  ensure_test_db_exists
  echo "🧪 Utilisation de la base de test existante."
fi

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
