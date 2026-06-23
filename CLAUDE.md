# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes essentielles

```bash
# Démarrer les bases de données (PostgreSQL + Redis) — requis avant tout
pnpm docker:up

# Développement (web + api en parallèle)
pnpm dev

# Une seule app
pnpm dev:web     # Next.js sur http://localhost:3000
pnpm dev:api     # NestJS sur http://localhost:3001

# Base de données
pnpm db:migrate  # Appliquer les migrations Prisma
pnpm db:generate # Regénérer le client Prisma après modification du schéma
pnpm db:studio   # Ouvrir Prisma Studio

# Vérifications
pnpm typecheck   # tsc --noEmit sur tous les packages
pnpm build       # Build web puis api
```

**Premier démarrage :**
```bash
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm dev
```

## Architecture

Monorepo **pnpm workspaces** avec deux applications et trois packages partagés :

```
apps/web     → Next.js 16 (App Router) — interface SPA riche
apps/api     → NestJS 11 — API REST exposée sur /api/*
packages/db  → Prisma 6 + schéma PostgreSQL — source de vérité du modèle
packages/shared → Schémas Zod + enums métier — partagés web ↔ api
packages/config → tsconfig de base (base.json)
docker/      → PostgreSQL 16 + Redis 7 via docker compose
```

### Frontend (`apps/web`)

- **Mantine 7** pour tous les composants UI (ne pas introduire Tailwind ni d'autre lib de composants)
- **AG Grid Community** sur les écrans pivots à forte densité (liste des opérations) ; **TanStack Table** pour les listes secondaires
- **TanStack Query** pour toute communication avec l'API — pas de `fetch` direct dans les composants
- **Zustand** pour l'état UI local complexe : onglets ouverts, filtres actifs
- **React Hook Form + Zod** pour tous les formulaires ; les schémas Zod viennent de `@moneyback/shared`
- **cmdk** pour la palette de commandes (`Cmd+K`)
- Les filtres actifs sont persistés dans les **search params URL** (TanStack Router)

### Backend (`apps/api`)

- Chaque domaine métier est un **module NestJS** indépendant dans `src/modules/`
- L'API est préfixée `/api` et documentée via Swagger à `/api/docs`
- **Règle critique** : toute logique de calcul financier (soldes, recalcul postes, affectation tiers) vit exclusivement dans les **services** du module correspondant — jamais dans les controllers ni le frontend
- Les traitements longs (imports, génération abonnements, recalcul soldes) passent par **BullMQ + Redis** — jamais dans la requête HTTP
- Pour les statistiques analytiques complexes (`REQ_STATISTIQUE_ORI` et dérivées), utiliser **SQL brut via `prisma.$queryRaw`** dans un repository dédié au lieu de l'ORM

### Base de données (`packages/db`)

Le schéma Prisma est dans `packages/db/prisma/schema.prisma`. Le client généré va dans `packages/db/src/generated/client` (ignoré par git).

**Groupes d'entités :**
- Auth : `users`, `roles`, `user_roles`
- Comptes : `accounts`
- Opérations : `operations`, `operation_splits`
- Référentiels : `budgets`, `categories`, `groupings`, `third_parties`, `payment_methods`, `movement_types`
- Abonnements : `subscriptions`, `subscription_runs`
- Imports : `imports`, `import_jobs`, `import_job_lines`, `import_profiles`
- Portefeuille : `portfolio_transactions`, `portfolio_matchings`, `portfolio_prices`, `portfolio_labels`
- Transverse : `settings`, `audit_logs`

Après toute modification du schéma : `pnpm db:generate` puis `pnpm db:migrate`.

**Conventions de nommage Prisma :** clés UUID, colonnes en `snake_case` via `@map()`, tables en `snake_case` via `@@map()`, timestamps `created_at` / `updated_at` systématiques.

### Package partagé (`packages/shared`)

- `enums.ts` : constantes métier (`OperationType`, `Periodicity`, `ImportSource`, `UserRole`…)
- `schemas.ts` : schémas Zod de validation (DTOs) utilisés à la fois pour la validation NestJS et les formulaires React

Ajouter ici tout type ou schéma qui doit être cohérent entre le frontend et le backend.

## Règles métier clés

Issues des procédures globales WinDev originales — à implémenter côté API uniquement :

- **`CalculateAccountBalance`** : solde = solde de clôture + recettes − dépenses des opérations non clôturées
- **`CalculateAccountBalanceAtDate`** : idem filtré sur `operation_date <= date`
- **`RebuildBudgetBalances`** : remet à zéro les soldes `budgets`, rejoue toutes les opérations + ventilations
- **`AutoAssignThirdParty`** : matching tiers via règles explicites et conditions, sans ancien système `keyword1/2/3`
- **`SplitOperation`** : décompose une opération en `operation_splits` ; la somme des splits doit égaler le montant principal
- **`GenerateDueSubscriptions`** : sélectionne les abonnements dont `next_due_date <= dateRef` et génère les opérations

Pour les arbitrages métier validés au fil des sessions, consulter aussi `docs/regles_gestion_impl.md`.

Le **solde progressif** affiché dans AG Grid est calculé localement côté frontend pour la fluidité d'affichage — le backend reste la source de vérité en cas d'écart.

## Variables d'environnement

Copier `.env.example` → `.env`. Variables critiques :

| Variable | Usage |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (Prisma) |
| `REDIS_URL` | Connexion Redis (BullMQ) |
| `API_PORT` | Port NestJS (défaut 3001) |
| `NEXT_PUBLIC_API_URL` | URL de l'API côté browser |
| `AUTH_SECRET` | Secret de signature des sessions |
