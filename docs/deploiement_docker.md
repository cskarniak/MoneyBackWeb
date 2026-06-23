# Déploiement Docker

## Conteneurs

- `moneyback_postgres`
- `moneyback_redis`
- `moneyback_api`
- `moneyback_web`

## Lancement

```bash
pnpm docker:deploy:up
```

Ou via le script :

```bash
./start-docker.sh
```

## Arrêt

```bash
pnpm docker:deploy:down
```

Ou via le script :

```bash
./stop-docker.sh
```

## Variables importantes

- `NEXT_PUBLIC_API_URL`
- `API_URL`
- `AUTH_SECRET`
- `DATABASE_BACKUPS_DIR`

## Sauvegardes base

Par défaut, les sauvegardes SQL sont écrites dans :

```bash
~/Downloads/moneyback_backups
```

En Docker, ce dossier hôte est monté dans le conteneur API.

## Remarque

Le fichier [docker-compose.yml](/Users/cs/Documents/dev/MoneyBackWeb/docker/docker-compose.yml) reste dédié à la base locale de développement.

Le fichier [docker-compose.deploy.yml](/Users/cs/Documents/dev/MoneyBackWeb/docker/docker-compose.deploy.yml) lance la stack complète :

- PostgreSQL
- Redis
- API NestJS
- Web Next.js
