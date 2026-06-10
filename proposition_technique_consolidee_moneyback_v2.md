# Proposition technique consolidée v2 — MONEYBACK Web

Date: 10/06/2026
Version: v2 consolidee et renforcee

## 1. Objectif

Redevelopper MONEYBACK sous forme d'application web metier riche, avec une ergonomie proche d'un client desktop:

- navigation rapide et contextuelle;
- grilles de donnees denses;
- edition inline;
- filtres puissants et memorisables;
- traitements metier fiables cote backend;
- imports, recalculs et rapprochements robustes;
- tableaux de bord reactifs.

La cible est une application de gestion patrimoniale et financiere interactive. Ce n'est ni un site vitrine, ni un produit optimise SEO.

## 2. Positionnement d'architecture

### 2.1 Recommandation

Je recommande un `monolithe modulaire logique`, mais `deux applications techniques` dans le meme monorepo:

- une application `web` en `Next.js`;
- une application `api` en `NestJS`.

Cela permet:

- une separation claire entre interface et logique metier;
- un deploiement simple et evolutif;
- une meilleure testabilite;
- une frontiere nette pour les calculs critiques.

Il faut donc eviter l'ambiguite "un seul processus deploye". La bonne formulation est:

- `un seul systeme`
- `un seul monorepo`
- `une seule base`
- `plusieurs processus deployes si necessaire`

### 2.2 Pourquoi ce choix colle a MONEYBACK

La documentation montre:

- un coeur applicatif fortement transactionnel;
- des modules relies entre eux;
- des ecrans riches de type tableur;
- des calculs fonctionnels centraux;
- des imports et recalculs potentiellement longs.

Ce contexte ne justifie pas des microservices au demarrage. En revanche, il justifie une vraie separation frontend/backend.

## 3. Stack retenue

### 3.1 Frontend

| Role | Choix | Commentaire |
|---|---|---|
| Framework | `Next.js 16` | Shell applicatif, routing, search params, deploiement moderne |
| Langage | `TypeScript` | Type-safety end-to-end |
| UI Library | `Mantine 7` | Productif pour une application metier dense |
| Grille pivot | `AG Grid` | Ecran operations, rapprochement, listes expertes |
| Grilles secondaires | `TanStack Table` | Listes plus simples et plus legeres |
| Formulaires | `React Hook Form + Zod` | Validation et performance |
| Etat serveur | `TanStack Query` | Cache, mutations, synchro avec l'API |
| Etat UI local | `Zustand` | Sessions locales, panneaux, onglets, filtres complexes |
| Raccourcis clavier | `react-hotkeys-hook` | Productivite utilisateur |
| Palette de commande | `cmdk` | Recherche transverse compte / tiers / operation |
| Graphiques | `Recharts` ou `ECharts` | `ECharts` si besoin d'analyses plus denses |

### 3.2 Point de vigilance sur AG Grid

La solution initiale mentionne `AG Grid Community`. C'est un bon point de depart, mais cette decision doit etre validee apres cartographie precise de `FEN_Table_OPERATION`.

Choisir `Community` si le besoin reel reste dans:

- tri;
- filtres standards;
- edition inline;
- virtualisation;
- selection;
- colonnes configurables.

Prevoir `Enterprise` si les besoins reels incluent fortement:

- groupements utilisateurs pousses;
- agregations natives complexes;
- pivot avance;
- export Excel riche;
- comportements tres proches d'un tableur expert.

Conclusion pratique:

- demarrer la conception en restant agnostique;
- ne verrouiller la licence qu'apres maquettage de l'ecran pivot.

### 3.3 Backend

| Role | Choix | Commentaire |
|---|---|---|
| Framework | `NestJS` | Modules, DI, architecture propre |
| API | `REST + OpenAPI` | Lisible, documente, simple a consommer |
| ORM | `Prisma` | Tres bon pour CRUD et modelisation cible |
| SQL metier | `SQL cible + repositories dedies` | Necessaire pour stats et traitements critiques |
| Base | `PostgreSQL` | Integrite, performance SQL, vues materialisees |
| Jobs | `BullMQ + Redis` | Imports, abonnements, recalculs |
| Auth | `better-auth` ou auth Nest dediee | A valider selon contraintes session/RBAC |

### 3.4 Infra

| Role | Choix recommande |
|---|---|
| Conteneurs | `Docker` |
| Orchestration simple | `docker compose` en local et preprod |
| Hebergement | `Coolify`, `Railway` ou VPS gere |
| Fichiers | stockage local monte ou `S3-compatible` |
| Monitoring | `Sentry` + logs structures |
| Sauvegardes | PostgreSQL quotidiennes + retention |

## 4. Structure cible du monorepo

```text
moneyback-web/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── db/
│   ├── shared/
│   ├── ui/
│   └── config/
├── docker/
├── docs/
└── package.json
```

Recommandation complementaire:

- `packages/db` pour schema Prisma, migrations et seeds;
- `packages/shared` pour schemas Zod, DTO partages et enums metier;
- `packages/ui` seulement si un design system interne emerge reellement.

## 5. UX cible pour conserver une ergonomie riche

### 5.1 Principes

- shell applicatif fixe;
- sidebar par module;
- onglets de travail internes;
- drawers lateraux pour fiches;
- edition inline sur les listes critiques;
- raccourcis clavier;
- vues memorisees par utilisateur;
- filtres persistants dans l'URL.

### 5.2 Ecrans pivots

Les 3 ecrans a traiter comme references ergonomiques sont:

1. `Operations`
2. `Statistiques`
3. `Rapprochement bancaire`

### 5.3 Solde progressif

Le solde progressif peut etre calcule localement pour la fluidite d'affichage, mais ne doit jamais devenir la verite fonctionnelle.

Regle recommandee:

- le backend calcule les donnees de reference;
- le frontend recalcule uniquement l'affichage courant visible;
- en cas de pagination, filtrage serveur, rapprochement ou incoherence, le backend tranche.

## 6. Decoupage metier

Modules recommandes:

- `auth`
- `users`
- `settings`
- `accounts`
- `operations`
- `operation-splits`
- `budgets`
- `categories`
- `groupings`
- `third-parties`
- `subscriptions`
- `imports`
- `reconciliations`
- `portfolio`
- `statistics`
- `administration`

Bonne pratique:

- separer les modules par domaine;
- garder les cas d'usage transverses dans des services applicatifs explicites.

## 7. Modele de donnees cible

### 7.1 Principes de modelisation

- nommage anglais en `snake_case`;
- cles techniques homogenes, idealement `uuid` pour la plupart des tables metier;
- timestamps d'audit systematiques;
- historisation explicite sur les actions sensibles;
- soft delete uniquement si la suppression logique a une vraie valeur fonctionnelle.

### 7.2 Tables principales

```text
users
roles
user_roles
settings

accounts
account_reconciliations
account_reconciliation_lines

operations
operation_splits
operation_attachments

budgets
categories
groupings
third_parties
payment_methods
movement_types

subscriptions
subscription_schedules
subscription_runs

imports
import_jobs
import_job_lines
import_profiles

portfolio_transactions
portfolio_matchings
portfolio_prices
portfolio_labels

audit_logs
```

Point important:

- la solution initiale sous-modele legerement les imports et le rapprochement;
- il vaut mieux des tables explicites de session, de lignes et de traces.

## 8. Regles metier a centraliser dans le backend

Ces regles ne doivent jamais vivre uniquement dans le frontend:

- calcul de solde compte;
- calcul de solde a date;
- recalcul des budgets/postes;
- gestion des ventilations;
- affectation automatique de tiers;
- generation des abonnements;
- rapprochement bancaire;
- pointage portefeuille;
- dedoublonnage d'import;
- verrouillage et cloture des ecritures.

Exemples de cas d'usage:

- `CalculateAccountBalance`
- `CalculateAccountBalanceAtDate`
- `RebuildBudgetBalances`
- `SplitOperation`
- `AutoAssignThirdParty`
- `GenerateDueSubscriptions`
- `ValidateReconciliation`
- `ImportBankOperations`
- `MatchPortfolioTrades`

## 9. Strategie API

### 9.1 Style retenu

`REST` est le bon choix pour la phase de refonte:

- lisible;
- facile a documenter;
- testable simplement;
- adapte a des ecrans bien identifies.

### 9.2 Recommandation complementaire

Je recommande de distinguer trois types d'endpoints:

- `CRUD metier`
- `actions metier`
- `lecture analytique`

Exemples:

```text
GET    /api/accounts
GET    /api/accounts/:id
POST   /api/accounts

GET    /api/operations
POST   /api/operations
PUT    /api/operations/:id
POST   /api/operations/:id/duplicate
POST   /api/operations/:id/split
POST   /api/operations/:id/lock

POST   /api/reconciliations/:accountId/start
POST   /api/reconciliations/:accountId/lines
POST   /api/reconciliations/:accountId/validate

POST   /api/imports
GET    /api/imports/:id
GET    /api/imports/:id/preview
POST   /api/imports/:id/confirm

GET    /api/statistics/operations
GET    /api/statistics/by-period
GET    /api/statistics/by-budget
GET    /api/statistics/by-grouping
```

## 10. Statistiques et SQL metier

La proposition initiale est juste sur le fond, mais il faut aller un cran plus loin.

Recommandation:

- utiliser `Prisma` pour le transactionnel standard;
- utiliser des `repositories SQL` dedies pour les requetes de statistiques;
- encapsuler la logique analytique dans `StatisticsModule`, pas dans les controllers;
- documenter les equivalences entre `REQ_STATISTIQUE`, `REQ_STATISTIQUE_ORI` et les nouvelles requetes SQL.

### 10.1 Techniques recommandees

- index composites centres sur les filtres reels;
- vues materialisees seulement pour les syntheses couteuses et stables;
- refresh pilote apres import massif ou recalcul;
- tests de non-regression entre ancien resultat WinDev et nouvelle requete SQL.

### 10.2 Attention

`prisma.$queryRaw` seul ne suffit pas comme strategie d'architecture. Il faut une couche explicite de lecture analytique.

## 11. Imports et traitements asynchrones

Les imports doivent etre traites comme un sous-systeme, pas comme un simple upload.

### 11.1 Pipeline recommande

1. depot fichier
2. creation `import_job`
3. parsing selon format
4. normalisation
5. detection des doublons
6. controles metier
7. preview utilisateur
8. confirmation
9. integration transactionnelle
10. audit et recalculs associes

### 11.2 Modele de conception

- adaptateur par source;
- mapping configurable;
- idempotence forte;
- journal de traitement;
- relance partielle possible si erreurs corrigees.

Formats prioritaires selon la doc:

- Excel;
- fichiers bancaires;
- DEGIRO;
- cours portefeuille.

## 12. Rapprochement bancaire

Ce module doit etre traite comme une mini-application experte.

Fonctions attendues:

- demarrage de session;
- verrou logique;
- marquage par lot;
- recalcul des ecarts;
- validation atomique;
- annulation ou reprise de session.

Le modele devrait inclure:

- `account_reconciliations`
- `account_reconciliation_lines`
- eventuellement `reconciliation_session_locks`

## 13. Securite, authentification et audit

La section securite de la proposition initiale est bonne mais trop courte pour une application financiere.

### 13.1 Minimum recommande

- mots de passe hashes;
- sessions securisees;
- controle des roles;
- chiffrement des secrets et identifiants sensibles;
- audit logs sur suppression, import, rapprochement, recalcul et administration;
- rotation et stockage securise des secrets d'environnement;
- sauvegardes testees regulierement.

### 13.2 Point de decision

`better-auth` peut convenir, mais il faut le confirmer selon:

- mode d'hebergement;
- strategie de session;
- besoin RBAC;
- integration NestJS;
- administration des utilisateurs.

Si l'integration devient trop indirecte, une auth Nest plus classique peut etre preferable.

## 14. Strategie de migration depuis WinDev

### 14.1 Bonne approche

La logique `vertical slices` est la bonne.

### 14.2 Ordre recommande ajuste

1. socle technique, auth, roles, parametres
2. schema cible et scripts de reprise de donnees
3. comptes
4. operations et ventilation
5. budgets, categories, tiers
6. statistiques principales
7. rapprochement bancaire
8. import prioritaire
9. abonnements
10. portefeuille

Ce reordonnancement place plus tot la reprise de donnees, car elle influence tres vite le schema reel.

### 14.3 Strategie de verification

Pour chaque lot migre:

- comparer soldes;
- comparer nombre d'operations;
- comparer resultats statistiques;
- verifier cas ventiles;
- verifier cas rapproches;
- conserver des jeux de reference.

## 15. Roadmap pratique

### 15.1 MVP

- authentification;
- comptes;
- operations;
- ventilation;
- budgets / categories / tiers;
- statistiques principales;
- rapprochement simple;
- import prioritaire.

### 15.2 V1.5

- fiabilisation reprise de donnees;
- optimisation grilles;
- audit;
- exports;
- premiers tableaux de bord.

### 15.3 V2

- abonnements complets;
- portefeuille titres;
- imports avances;
- outils de maintenance;
- tableaux de bord enrichis.

## 16. Risques principaux et mitigations

| Risque | Mitigation |
|---|---|
| Sous-estimer `FEN_Table_OPERATION` | Cartographier d'abord l'ecran et maquettter la grille avant la stack finale |
| Decider trop tot AG Grid Community | Reporter la decision licence apres prototype fonctionnel |
| Sous-modeliser imports et rapprochements | Prevoir des tables explicites de jobs, sessions et lignes |
| Se disperser entre ORM et SQL | Definir une strategie claire `CRUD Prisma / stats SQL` |
| Oublier la reprise de donnees reellement sale | Construire des scripts idempotents et des jeux comparatifs |
| Logique cachee WinDev | Inventorier exhaustivement les procedures globales avant chiffrage |

## 17. Prochaines etapes avant implementation

Les 5 livrables les plus utiles sont:

1. cartographie detaillee de `FEN_Table_OPERATION`
2. schema de donnees cible commente
3. mapping de reprise de donnees WinDev -> PostgreSQL
4. maquettes fonctionnelles des ecrans `Operations`, `Statistiques`, `Rapprochement`
5. liste des procedures globales WinDev et de leur future destination backend

## 18. Recommandation finale

La proposition consolidee initiale est bonne et peut servir de base. La version v2 la rend plus robuste sur les points qui conditionnent vraiment la reussite:

- clarification du vrai mode d'architecture;
- prudence sur le choix AG Grid;
- meilleure formalisation de la couche SQL analytique;
- modelisation plus explicite des imports et rapprochements;
- securite et migration mieux cadrees.

La cible recommandee reste:

- `Next.js`
- `NestJS`
- `PostgreSQL`
- `Prisma`
- `BullMQ + Redis`

Le succes du projet dependra moins du choix de framework que de la qualite de reprise des regles metier WinDev et de la conception des ecrans pivots.
