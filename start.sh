#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# ── 1. Docker Desktop ────────────────────────────────────────────────────────
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

# ── 2. Conteneurs PostgreSQL + Redis ────────────────────────────────────────
echo "📦  Démarrage des conteneurs (PostgreSQL + Redis)..."
docker compose -f docker/docker-compose.yml up -d

# ── 3. Attente que PostgreSQL soit prêt ─────────────────────────────────────
echo -n "   Attente de PostgreSQL"
until docker exec moneyback-postgres pg_isready -U moneyback &>/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " prêt."

# ── 4. Migrations Prisma ─────────────────────────────────────────────────────
echo "🗄️   Migrations Prisma..."
pnpm --filter @moneyback/db migrate:dev --name auto 2>/dev/null || \
  echo "   (aucune migration à appliquer)"

# ── 5. Compilation des packages partagés ────────────────────────────────────
echo "⚙️   Compilation des packages partagés..."
pnpm build:packages

# ── 6. Lancement en parallèle ────────────────────────────────────────────────
echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│  MoneyBack est prêt !                               │"
echo "│                                                     │"
echo "│  Application web  →  http://localhost:3000          │"
echo "│  API REST         →  http://localhost:3001/api      │"
echo "│  Swagger docs     →  http://localhost:3001/api/docs │"
echo "│                                                     │"
echo "│  Appuyez sur Ctrl+C pour tout arrêter.             │"
echo "└─────────────────────────────────────────────────────┘"
echo ""
pnpm --parallel --filter api --filter web dev
