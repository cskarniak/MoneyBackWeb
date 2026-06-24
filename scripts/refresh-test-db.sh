#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SOURCE_DB="${SOURCE_DB:-moneyback}"
TARGET_DB="${TARGET_DB:-moneyback_test}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-moneyback_postgres}"
POSTGRES_USER="${POSTGRES_USER:-moneyback}"

echo "🐳 Vérification de Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker n'est pas démarré. Lance Docker Desktop puis réessaie."
  exit 1
fi

echo "📦 Démarrage de PostgreSQL local..."
pnpm docker:up >/dev/null

echo -n "⏳ Attente de PostgreSQL"
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null)" = "healthy" ]; do
  echo -n "."
  sleep 1
done
echo " prêt."

echo "🔎 Fermeture des connexions sur la base cible si nécessaire..."
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();" \
  >/dev/null

echo "🧹 Recréation de la base de test '$TARGET_DB' depuis '$SOURCE_DB'..."
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";"
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"$TARGET_DB\" WITH TEMPLATE \"$SOURCE_DB\" OWNER \"$POSTGRES_USER\";"

echo "✅ Base de test prête : $TARGET_DB"
