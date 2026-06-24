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

## Environnement de test local

Pour tester sans toucher aux données importées dans la base locale principale, le projet propose un environnement de test séparé basé sur une copie conforme de `moneyback`.

### Recréer la base miroir

```bash
pnpm db:test:refresh
```

Cette commande :

- démarre PostgreSQL local si nécessaire ;
- supprime `moneyback_test` si elle existe ;
- recrée `moneyback_test` à partir de `moneyback`.

### Lancer l'application sur la base de test

```bash
pnpm dev:test
```

Ports utilisés :

- web : `http://localhost:3002`
- api : `http://localhost:3003/api`
- swagger : `http://localhost:3003/api/docs`

L'interface affiche un badge `TEST` et la mention `Base clonée moneyback_test` pour éviter toute confusion avec l'environnement local principal.
