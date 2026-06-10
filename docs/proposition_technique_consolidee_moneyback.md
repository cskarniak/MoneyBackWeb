# Proposition technique consolidée — MONEYBACK Web

Date: 10/06/2026
Version: consolidée à partir de deux analyses indépendantes

---

## 1. Objectif

Redévelopper MONEYBACK en application web métier riche, avec une ergonomie proche du desktop WinDev :

- navigation rapide et contextuelle ;
- grilles de données denses avec édition inline ;
- filtres croisés puissants et sauvegardables ;
- traitements métier fiables côté backend ;
- imports et recalculs robustes et asynchrones ;
- tableaux de bord réactifs.

Priorité : **application métier interactive**, pas un site vitrine ni une cible SEO.

---

## 2. Stack retenue

### 2.1 Frontend

| Rôle | Choix | Justification |
|---|---|---|
| Framework | **Next.js 16** (App Router) | BFF léger intégré, déploiement unifié, structure pérenne |
| Langage | **TypeScript** | Type-safety end-to-end |
| UI Library | **Mantine 7** | DatePicker, NumberInput, Combobox, Modals, Notifications prêts à l'emploi — plus productif qu'un Tailwind custom pour une app financière |
| Data grid pivot | **AG Grid Community** | Tri, filtre, édition inline, solde progressif, virtualisation — indispensable sur `FEN_Table_OPERATION` |
| Data grid standard | **TanStack Table** | Listes secondaires (tiers, catégories, abonnements) |
| Charts | **Recharts** | Suffisant pour les synthèses et tableaux de bord |
| Formulaires | **React Hook Form + Zod** | Validation typée, performances |
| État serveur | **TanStack Query** | Cache, invalidation, mutations optimistes |
| État UI local | **Zustand** | Sessions de rapprochement, filtres actifs complexes, onglets ouverts |
| Raccourcis clavier | **react-hotkeys-hook** | Navigation power-user |
| Palette commandes | **cmdk** | Accès rapide compte / tiers / opération (`Cmd+K`) |

### 2.2 Backend

| Rôle | Choix | Justification |
|---|---|---|
| Framework | **NestJS** (TypeScript) | Architecture modulaire par domaine, DI, testabilité |
| API | **REST + OpenAPI** | Interopérable, documenté automatiquement, consommable par Postman |
| ORM | **Prisma** | Typage automatique depuis le schéma, migrations versionées |
| Base de données | **PostgreSQL** | Intégrité transactionnelle, requêtes analytiques, vues matérialisées |
| Jobs asynchrones | **BullMQ + Redis** | Imports lourds, recalculs de soldes, génération d'abonnements |
| Authentification | **better-auth** | Simple, sessions sécurisées, hash bcrypt |

### 2.3 Infra

| Rôle | Choix |
|---|---|
| Conteneurs | Docker (Compose en local, image en prod) |
| Déploiement | Coolify ou Railway (selon préférence hébergement) |
| Stockage fichiers | Disque monté ou bucket S3-compatible (imports) |
| Supervision | Sentry (erreurs frontend + backend) + logs applicatifs structurés |
| Sauvegardes | Sauvegardes PostgreSQL automatisées quotidiennes |

---

## 3. Architecture applicative

### 3.1 Monolithe modulaire

Un seul dépôt, un seul processus déployé. Les modules sont séparés logiquement, pas physiquement.

```
moneyback-web/
├── apps/
│   ├── web/          # Next.js 16 (App Router + pages SPA)
│   └── api/          # NestJS
├── packages/
│   ├── db/           # Prisma schema + migrations + seed
│   └── shared/       # Schémas Zod partagés (validation + types inférés)
├── docker-compose.yml
└── package.json      # pnpm workspaces
```

### 3.2 Modules backend (NestJS)

Chaque module expose ses routes REST et contient ses services métier :

- `AuthModule`
- `ParametresModule`
- `ComptesModule`
- `OperationsModule`
- `VentilationsModule`
- `BudgetsPostesModule`
- `CategoriesModule`
- `TiersModule`
- `AbonnementsModule`
- `ImportsModule`
- `RapprochementsModule`
- `PortefeuilleModule`
- `StatistiquesModule`
- `AdministrationModule`

### 3.3 Layout frontend — shell applicatif

```
┌─────────────────────────────────────────────────────────┐
│  Barre top : logo | compte actif | Cmd+K | profil       │
├────────────┬────────────────────────────────────────────┤
│            │  Onglets de travail ouverts                │
│  Sidebar   ├────────────────────────────────────────────┤
│            │  Barre de filtres rapides (compte/période) │
│  Comptes   ├────────────────────────────────────────────┤
│  Budgets   │                                            │
│  Tiers     │  AG Grid — liste des opérations            │
│  Abonnem.  │  colonnes : date / libellé / tiers /       │
│  Import    │  catégorie / poste / débit / crédit /      │
│  Portef.   │  solde progressif (calculé localement)     │
│  Stats     │                                            │
│  Admin     ├────────────────────────────────────────────┤
│            │  Drawer latéral : fiche opération          │
│            │  → ventilation inline / tiers / catégorie  │
└────────────┴────────────────────────────────────────────┘
```

Principes UX :
- **Drawer** pour les fiches (pas de navigation pleine page)
- **Onglets internes** pour garder plusieurs contextes ouverts
- **Filtres persistants** dans l'URL (search params Next.js)
- **Palette de commandes** `Cmd+K` pour accès direct à tout objet
- **Raccourcis clavier** : `N` nouvelle opération, `F` filtres, `R` rapprochement, `D` dupliquer

---

## 4. Modèle de données cible

### 4.1 Principes

- Clés techniques `uuid` ou `bigint serial` selon les tables
- Colonnes d'audit : `created_at`, `updated_at`
- Soft delete (`deleted_at`) uniquement sur `operations` et `accounts`
- Nommage en snake_case anglais

### 4.2 Tables principales

```
accounts              (≈ COMPTE)
operations            (≈ OPERATION)
operation_splits      (≈ OPERATIONVENTILEE)
budgets               (≈ BUDGET / POSTE)
categories            (≈ CATEGORIE)
groupings             (≈ REGROUPEMENT)
third_parties         (≈ TIERS)
payment_methods       (≈ MOYEN_PAIEMENT)
movement_types        (≈ TYPE_MOUVEMENT)
subscriptions         (≈ ABONNEMENT)
subscription_schedules(≈ ABONNEMENT_PLANNING)
imports               (≈ IMPORT)
import_profiles       (≈ MASQUEIMPORTATIONEXCEL)
portfolio_transactions(≈ PORTEFEUILLE)
portfolio_matchings   (≈ PORTEFEUILLE_POINT)
portfolio_prices      (≈ PORTEFEUILLE_COURS)
portfolio_labels      (≈ PORTEFEUILLE_LIBELLE)
users
settings
```

---

## 5. Règles métier isolées côté backend

Ces fonctions proviennent des procédures globales WinDev et **ne doivent jamais résider dans le frontend** :

| Service | Logique reprise |
|---|---|
| `CalculateAccountBalance` | Solde cloture + recettes - dépenses des opérations non clôturées |
| `CalculateAccountBalanceAtDate` | Idem, filtré sur `operation_date <= P_Date` |
| `CalculateBudgetBalances` | Remise à zéro + rejeu REQ_STATISTIQUE sur toutes les opérations et ventilations |
| `SplitOperation` | Décomposition en sous-lignes + contrôle de cohérence montant total |
| `AutoAssignThirdParty` | Analyse libellé par mots-clés (`ET`/`OU`) + formule avancée si présente |
| `GenerateSubscriptions` | Sélection abonnements dont échéance ≤ date référence, création opérations |
| `RunBankReconciliation` | Transaction SQL atomique sur lot de rapprochement |
| `MatchPortfolioTrades` | Pointage achat/vente avec calcul quantités et marges |

---

## 6. API REST — exemples de routes

```
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:id/operations
POST   /api/operations
PUT    /api/operations/:id
DELETE /api/operations/:id
POST   /api/operations/:id/split
POST   /api/operations/:id/duplicate

POST   /api/subscriptions/generate
GET    /api/subscriptions/planning

POST   /api/reconciliations/:accountId/start
PUT    /api/reconciliations/:accountId/validate

POST   /api/imports/bank-file
POST   /api/imports/excel
POST   /api/imports/degiro
GET    /api/imports/:jobId/status
GET    /api/imports/:jobId/preview
POST   /api/imports/:jobId/confirm

GET    /api/statistics/operations
GET    /api/statistics/by-period
GET    /api/statistics/by-budget
GET    /api/statistics/by-grouping
```

---

## 7. Statistiques — approche SQL ciblée

Les vues analytiques ne peuvent pas toutes passer par l'ORM.

Règles :
- Requêtes Prisma suffisantes pour le CRUD et les listes simples
- **SQL brut via `prisma.$queryRaw`** pour `REQ_STATISTIQUE_ORI` et ses dérivées (jointures croisées OPERATION × OPERATIONVENTILEE × COMPTE)
- **Index composites** sur `(account_id, operation_date, category_id, budget_id)`
- **Vues matérialisées PostgreSQL** pour les synthèses lourdes (par regroupement, par période) avec refresh déclenché après import ou recalcul

---

## 8. Jobs asynchrones — pipeline import

BullMQ + Redis gère tous les traitements longs :

**Pipeline import en 9 étapes (queue `imports`) :**

1. Dépôt du fichier (stockage temporaire)
2. Création d'un `import_job` en base
3. Parsing du fichier (Excel, OFX, CSV DEGIRO…)
4. Normalisation des lignes selon le profil d'import
5. Contrôle métier (doublons, montants manquants, comptes inconnus)
6. Génération de la prévisualisation des anomalies
7. Attente validation utilisateur (job en pause)
8. Intégration transactionnelle en base
9. Journal d'audit + mise à jour soldes

**Autres queues :**
- `subscriptions` — génération d'abonnements à date
- `recalculations` — recalcul des soldes postes/budgets

---

## 9. Rapprochement bancaire

Écran dédié avec :
- Vue à deux panneaux (opérations non rapprochées | résumé relevé / écarts)
- Sélection multiple et marquage rapide
- Recalcul du solde rapproché en temps réel (Zustand local)
- Validation par transaction SQL atomique
- Verrou logique (`reconciliation_session`) pour éviter les conflits

---

## 10. Sécurité et profils

Même pour usage patrimonial :

| Rôle | Droits |
|---|---|
| `admin` | Accès complet + administration + outils |
| `gestion` | Saisie, import, rapprochement, statistiques |
| `consultation` | Lecture seule sur comptes et statistiques |

- Hash bcrypt des mots de passe (better-auth)
- Chiffrement des identifiants bancaires stockés
- Journal d'audit sur les opérations sensibles (suppression, rapprochement, import)

---

## 11. Stratégie de migration depuis WinDev

### 11.1 Approche : vertical slices

Pas de conversion écran par écran. Chaque slice livre une valeur métier complète et testable.

Ordre :

1. Socle technique + auth + paramètres
2. Comptes
3. Opérations (liste + fiche + ventilation)
4. Budgets / catégories / tiers
5. Statistiques principales
6. Rapprochement
7. Imports prioritaires (Excel ou bancaire selon usage réel)
8. Abonnements
9. Portefeuille titres (V2)

### 11.2 Reprise de données

- Extraire le schéma WinDev (fichiers HyperFile)
- Produire un mapping source → cible table par table
- Scripts d'import idempotents (relançables sans doublons)
- Jeux d'essai comparatifs : valider les soldes et statistiques entre ancien et nouveau système

---

## 12. Roadmap

### MVP

- Login + paramètres de base
- Comptes
- Liste des opérations (AG Grid complet)
- Fiche opération + ventilation inline
- Budgets / catégories / tiers
- Statistiques principales
- Rapprochement simple
- Un import prioritaire (Excel ou OFX)

### V2

- Abonnements complets + planning
- Imports avancés (DEGIRO, ABC Bourse)
- Portefeuille titres
- Tableaux de bord enrichis
- Outils de maintenance avancés
- Exports PDF

---

## 13. Risques principaux

| Risque | Mitigation |
|---|---|
| Sous-estimer `FEN_Table_OPERATION` | Cartographier cet écran en premier avant de coder |
| Logique cachée dans les procédures globales WinDev | Relire `COL_ProceduresGlobales` exhaustivement avant d'estimer |
| Tout faire via ORM pour les stats | SQL ciblé dès la conception, pas en rattrapage |
| Imports traités comme CRUD simple | Pipeline BullMQ dès le MVP |
| Sur-architecture dès le départ | Monolithe modulaire, pas de microservices |

---

## 14. Prochaines étapes avant de coder

Trois livrables à produire avant le premier sprint :

1. **Cartographie détaillée de `FEN_Table_OPERATION`** — colonnes, filtres, actions, règles de calcul du solde progressif
2. **Modèle de données cible complet** — schéma Prisma annoté avec les équivalences WinDev
3. **Maquettes fonctionnelles web des 3 écrans pivots** — opérations, statistiques, rapprochement

Ces trois éléments suffisent pour lancer le premier sprint dans de bonnes conditions.

---

*Document consolidé à partir de deux analyses indépendantes réalisées le 10/06/2026.*
