#!/bin/bash
# Installation initiale de MoneyBackWeb sur skbox-mini (Mac Mini / Ubuntu 22.04).
# À exécuter une seule fois, en SSH sur la machine, avec un utilisateur sudo :
#   scp -r deploy christian@skbox-mini:~/moneyback-deploy-tmp
#   ssh skbox-mini
#   bash ~/moneyback-deploy-tmp/install.sh
set -euo pipefail

MONEYBACK_DIR="/home/christian/moneyback"
BACKUPS_DIR="/home/christian/moneyback_backups"
REPO_URL="https://github.com/cskarniak/MoneyBackWeb.git"
LAN_IP="192.168.1.11"
API_PORT=4001
WEB_PORT=4002

echo "1. PostgreSQL (paquet apt natif)..."
sudo apt update
sudo apt install -y postgresql
sudo systemctl enable --now postgresql

echo "2. Création base + utilisateur moneyback..."
DB_PASSWORD=$(openssl rand -hex 24)
if sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'moneyback'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER USER moneyback WITH PASSWORD '${DB_PASSWORD}';"
else
  sudo -u postgres psql -c "CREATE USER moneyback WITH PASSWORD '${DB_PASSWORD}';"
fi
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'moneyback'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE moneyback OWNER moneyback;"

echo "3. Clonage du repo..."
if [ ! -d "$MONEYBACK_DIR" ]; then
  git clone "$REPO_URL" "$MONEYBACK_DIR"
fi
mkdir -p "$BACKUPS_DIR"

echo "4. Dépendances + build..."
cd "$MONEYBACK_DIR"
corepack enable 2>/dev/null || true
pnpm install

AUTH_SECRET=$(openssl rand -hex 32)

cat > .env <<EOF
DATABASE_URL="postgresql://moneyback:${DB_PASSWORD}@localhost:5432/moneyback"
REDIS_URL="redis://localhost:6379/1"
API_PORT=${API_PORT}
API_URL="http://${LAN_IP}:${API_PORT}"
NEXT_PUBLIC_API_URL="http://${LAN_IP}:${API_PORT}"
CORS_ORIGIN="http://${LAN_IP}:${WEB_PORT}"
AUTH_SECRET="${AUTH_SECRET}"
DATABASE_BACKUPS_DIR="${BACKUPS_DIR}"
APP_ENV_LABEL="production"
EOF

ln -sf ../../.env packages/db/.env

pnpm db:generate
pnpm db:deploy
NEXT_PUBLIC_API_URL="http://${LAN_IP}:${API_PORT}" pnpm build

echo "5. Services systemd..."
sudo cp deploy/moneyback-api.service deploy/moneyback-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now moneyback-api moneyback-web

echo "6. Sudoers dédié (redémarrage services sans mot de passe pour deploy.sh)..."
sudo cp deploy/moneyback-sudoers /etc/sudoers.d/moneyback
sudo chmod 440 /etc/sudoers.d/moneyback
sudo visudo -cf /etc/sudoers.d/moneyback

echo "7. Pare-feu (UFW) — LAN uniquement..."
sudo ufw allow from 192.168.0.0/24 to any port ${API_PORT} proto tcp
sudo ufw allow from 192.168.1.0/24 to any port ${API_PORT} proto tcp
sudo ufw allow from 192.168.0.0/24 to any port ${WEB_PORT} proto tcp
sudo ufw allow from 192.168.1.0/24 to any port ${WEB_PORT} proto tcp

echo ""
echo "=== Installation terminée ==="
echo "  Web    : http://${LAN_IP}:${WEB_PORT}"
echo "  API    : http://${LAN_IP}:${API_PORT}/api"
echo "  Swagger: http://${LAN_IP}:${API_PORT}/api/docs"
sudo systemctl status moneyback-api --no-pager || true
sudo systemctl status moneyback-web --no-pager || true
