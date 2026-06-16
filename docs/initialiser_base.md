# Initialiser toute la base

## Option 1

Initialiser la base PostgreSQL du projet avec migrations + seed:

```bash
pnpm db:setup
```

Cette commande:

- démarre PostgreSQL et Redis via Docker;
- applique toutes les migrations Prisma;
- injecte un seed minimal.

## Option 2

Créer toute la base en une fois depuis le SQL généré:

Fichier: [full_schema.sql](/Users/cs/Documents/dev/MoneyBackWeb/packages/db/prisma/init/full_schema.sql)

Puis lancer le seed:

```bash
pnpm db:seed
```

## Ce que contient le seed

- rôles: `admin`, `gestion`, `consultation`
- moyens de paiement de base
- types de mouvement de base
- paramètres applicatifs minimaux

## Note

Sur cette machine, l'application réelle des migrations n'a pas pu être vérifiée car PostgreSQL local n'était pas accessible sur `localhost:5432` et Docker n'était pas démarré.
