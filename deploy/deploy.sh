#!/bin/bash
# Redéploiement de MoneyBackWeb sur skbox-mini après un push sur main.
# Usage : ssh skbox-mini 'cd ~/moneyback && bash deploy/deploy.sh'
set -euo pipefail

MONEYBACK_DIR="/home/christian/moneyback"
cd "$MONEYBACK_DIR"

echo "1. Pull dernier commit..."
git pull origin main

echo "2. Installation des dépendances..."
pnpm install

echo "3. Migrations Prisma..."
pnpm db:generate
pnpm db:deploy

echo "4. Build..."
NEXT_PUBLIC_API_URL="$(grep NEXT_PUBLIC_API_URL .env | cut -d= -f2- | tr -d '"')" pnpm build

echo "5. Redémarrage des services..."
sudo systemctl restart moneyback-api moneyback-web

echo "=== Déploiement terminé ==="
sudo systemctl status moneyback-api --no-pager || true
sudo systemctl status moneyback-web --no-pager || true
