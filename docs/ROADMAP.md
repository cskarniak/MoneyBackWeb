# Roadmap MoneyBack Web

Suivi d'avancement de la refonte web de l'application MONEYBACK (WinDev 25 → web).

Légende : ✅ terminé · 🔄 en cours · ⬜ à faire

---

## Socle technique

| # | Tâche | Statut |
|---|---|---|
| S1 | Monorepo pnpm workspaces | ✅ |
| S2 | apps/web — Next.js 16 + Mantine 7 + AG Grid | ✅ |
| S3 | apps/api — NestJS 11 + Swagger | ✅ |
| S4 | packages/db — Prisma 6 + schéma PostgreSQL complet | ✅ |
| S5 | packages/shared — Zod schemas + enums métier | ✅ |
| S6 | docker-compose PostgreSQL 16 + Redis 7 | ✅ |
| S7 | CLAUDE.md | ✅ |

---

## Pré-implémentation (avant le premier sprint)

Ces 5 livrables doivent être produits avant de coder les modules métier.

| # | Livrable | Statut |
|---|---|---|
| P1 | Cartographie détaillée de `FEN_Table_OPERATION` (colonnes, filtres, calcul solde progressif) | ⬜ |
| P2 | Schéma de données cible commenté avec équivalences WinDev | ⬜ |
| P3 | Mapping de reprise de données WinDev HyperFile → PostgreSQL | ⬜ |
| P4 | Maquettes fonctionnelles : Opérations · Statistiques · Rapprochement | ⬜ |
| P5 | Inventaire des procédures globales WinDev et destination backend | ⬜ |

---

## MVP

Objectif : couvrir le cœur de valeur métier et remplacer l'usage quotidien de WinDev.

### Auth & Paramètres

| # | Fonctionnalité | Statut |
|---|---|---|
| A1 | Login / logout | ⬜ |
| A2 | Gestion des rôles (admin · gestion · consultation) | ⬜ |
| A3 | Paramètres généraux de l'application | ⬜ |

### Comptes

| # | Fonctionnalité | Statut |
|---|---|---|
| C1 | Liste des comptes | ⬜ |
| C2 | Création / modification / fermeture d'un compte | ⬜ |
| C3 | Calcul du solde (`CalculateAccountBalance`) | ⬜ |
| C4 | Solde à une date donnée (`CalculateAccountBalanceAtDate`) | ⬜ |

### Opérations

| # | Fonctionnalité | Statut |
|---|---|---|
| O1 | Liste des opérations — AG Grid avec filtres (compte, période, statuts) | ⬜ |
| O2 | Solde progressif en colonne calculée | ⬜ |
| O3 | Création / modification / suppression d'une opération | ⬜ |
| O4 | Duplication d'opération | ⬜ |
| O5 | Virement entre comptes | ⬜ |
| O6 | Verrouillage / déverrouillage | ⬜ |
| O7 | Masquage des écritures verrouillées et rapprochées | ⬜ |

### Ventilation

| # | Fonctionnalité | Statut |
|---|---|---|
| V1 | Décomposition d'une opération en sous-lignes (`SplitOperation`) | ⬜ |
| V2 | Affectation budget/catégorie par sous-ligne | ⬜ |
| V3 | Contrôle de cohérence montant principal / sous-total ventilé | ⬜ |

### Référentiels — Budgets / Catégories / Tiers

| # | Fonctionnalité | Statut |
|---|---|---|
| R1 | CRUD budgets (postes) + rattachement regroupement | ⬜ |
| R2 | CRUD catégories + rattachement regroupement | ⬜ |
| R3 | CRUD tiers + mots-clés d'affectation automatique | ⬜ |
| R4 | Affectation automatique du tiers par analyse libellé (`AutoAssignThirdParty`) | ⬜ |
| R5 | Recalcul des soldes postes (`RebuildBudgetBalances`) | ⬜ |
| R6 | Moyens de paiement + types de mouvement | ⬜ |

### Statistiques principales

| # | Fonctionnalité | Statut |
|---|---|---|
| ST1 | Vue statistiques avec filtres croisés (compte · catégorie · tiers · poste · période) | ⬜ |
| ST2 | Synthèse par compte | ⬜ |
| ST3 | Synthèse par période | ⬜ |
| ST4 | Synthèse par poste/regroupement | ⬜ |
| ST5 | Filtres statistiques enregistrés (sauvegarder une combinaison de filtres sous un nom, la retrouver ensuite) | ⬜ |
| ST6 | Raccourcis de plage de dates sur les filtres (ex. M = mois en cours, S = semaine en cours, A = année en cours) remplissant automatiquement bornes inf/sup | ⬜ |

### Rapprochement bancaire

| # | Fonctionnalité | Statut |
|---|---|---|
| RB1 | Démarrage de session de rapprochement | ⬜ |
| RB2 | Vue deux panneaux (opérations non rapprochées · résumé relevé) | ⬜ |
| RB3 | Marquage par lot + recalcul d'écarts en temps réel | ⬜ |
| RB4 | Validation atomique (`ValidateReconciliation`) | ⬜ |
| RB5 | Reprise / annulation de session | ⬜ |

### Import prioritaire

| # | Fonctionnalité | Statut |
|---|---|---|
| I1 | Pipeline import (dépôt → parsing → preview → confirmation → intégration) | ⬜ |
| I2 | Import Excel avec profil de mapping configurable | ⬜ |
| I3 | Import fichiers bancaires (OFX / CSV) | ⬜ |
| I4 | Journal d'audit des imports | ⬜ |

---

## V1.5

Stabilisation avant d'ouvrir les modules avancés.

| # | Fonctionnalité | Statut |
|---|---|---|
| L1 | Scripts de reprise de données WinDev → PostgreSQL | ⬜ |
| L2 | Validation croisée soldes / statistiques ancien ↔ nouveau système | ⬜ |
| L3 | Optimisation performances AG Grid (virtualisation, filtres serveur) | ⬜ |
| L4 | Journal d'audit complet (suppressions, recalculs, imports, admin) | ⬜ |
| L5 | Export PDF des états | ⬜ |
| L6 | Premiers tableaux de bord configurables | ⬜ |

---

## V2

| # | Fonctionnalité | Statut |
|---|---|---|
| W1 | Abonnements récurrents + planning (`GenerateDueSubscriptions`) | ⬜ |
| W2 | Abonnements ventilés | ⬜ |
| W3 | Import transactions DEGIRO | ⬜ |
| W4 | Import cours ABC Bourse | ⬜ |
| W5 | Portefeuille titres — transactions manuelles | ⬜ |
| W6 | Portefeuille — pointage achat/vente (`MatchPortfolioTrades`) | ⬜ |
| W7 | Portefeuille — historique des cours | ⬜ |
| W8 | Portefeuille — synthèse dividendes / marges | ⬜ |
| W9 | Outils de maintenance (réindexation, réaffectation, suppression relevé) | ⬜ |
| W10 | Tableaux de bord enrichis | ⬜ |

---

## Décisions techniques actées

| Date | Décision |
|---|---|
| 2026-06-10 | Stack retenue : Next.js 16 · NestJS 11 · PostgreSQL · Prisma 6 · BullMQ + Redis · Mantine 7 · AG Grid |
| 2026-06-10 | Monolithe modulaire — deux processus (web + api) dans un seul monorepo |
| 2026-06-10 | API REST + OpenAPI (pas tRPC) |
| 2026-06-10 | Décision AG Grid Community vs Enterprise reportée après maquettage de l'écran Opérations |
| 2026-06-10 | Stats analytiques complexes en SQL brut (`$queryRaw`) — pas via ORM |
| 2026-06-10 | Logique de calcul financier côté backend uniquement (jamais dans le frontend) |
