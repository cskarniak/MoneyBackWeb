# Proposition technique de refonte web MONEYBACK

Date: 10/06/2026

Source d'analyse:

- `documentation_fonctionnelle_moneyback.md`
- `Dossier_MONEYBACK_layout.txt`

## 1. Objectif

Proposer une architecture web moderne pour redevelopper `MONEYBACK` en conservant une ergonomie riche, proche d'une application desktop:

- navigation rapide;
- ecrans denses sans perte de lisibilite;
- edition inline;
- filtres puissants;
- traitements metier fiables;
- imports et recalculs robustes;
- tableaux de bord reactifs.

La priorite n'est pas le SEO ni un site vitrine. Il s'agit d'une application metier interactive de gestion financiere.

## 2. Recommandation cible

### 2.1 Choix global recommande

Je recommande une architecture `web app metier riche` en trois couches:

1. `Frontend SPA riche` en `React + TypeScript`
2. `Backend metier modulaire` expose en API `REST`
3. `Base PostgreSQL` avec traitements asynchrones pour les taches lourdes

## 3. Stack proposee

### 3.1 Frontend

- `Next.js 16` avec `App Router`
- `React 19`
- `TypeScript`
- `TanStack Query` pour cache, synchro serveur et mutations
- `TanStack Table` pour les listes standards
- `AG Grid Enterprise` si besoin de puissance desktop sur les grilles critiques
- `React Hook Form` + `Zod` pour les formulaires
- `Tailwind CSS` + bibliotheque de composants interne
- `Recharts` ou `ECharts` pour les tableaux de bord
- `zustand` pour l'etat UI local complexe
- `react-hotkeys-hook` pour raccourcis clavier

### 3.2 Backend

- `NestJS` en `TypeScript`
- architecture modulaire par domaine metier
- `Prisma` comme ORM
- `PostgreSQL`
- `BullMQ` + `Redis` pour jobs asynchrones
- `OpenAPI` pour contrat API et generation de clients

### 3.3 Infra

- conteneurs `Docker`
- deploiement sur `Coolify`, `Render`, `Railway` ou cloud classique
- stockage fichiers sur disque monte ou objet compatible `S3`
- supervision avec `Sentry` + logs applicatifs
- sauvegardes PostgreSQL automatisees

## 4. Pourquoi cette cible est adaptee a MONEYBACK

La documentation montre une application:

- tres centree sur des grilles de donnees;
- avec beaucoup de filtres croises;
- comportant des calculs de soldes et de statistiques;
- avec imports, rapprochements et traitements recurrentiels;
- avec plusieurs modules, mais un coeur metier tres lie aux ecritures.

Une application web riche doit donc se comporter comme un client lourd dans le navigateur:

- chargement rapide des listes;
- edition contextuelle sans rechargement;
- panneaux lateraux au lieu d'ouvrir des dizaines d'ecrans;
- calculs et imports en tache de fond;
- feedback immediat sur les actions utilisateur.

## 5. Principes d'ergonomie riche

Pour ne pas perdre le confort WinDev, je recommande les principes suivants.

### 5.1 Navigation

- shell applicatif fixe avec menu lateral par module
- onglets de travail internes pour garder plusieurs contextes ouverts
- fil d'Ariane metier simple
- ouverture des fiches en `drawer` ou panneau lateral plutot qu'en page pleine a chaque fois

### 5.2 Grilles

- tri multi-colonnes
- filtres sauvegardables
- colonnes configurables
- totaux en pied de grille
- selection multiple
- edition inline sur les champs simples
- navigation clavier
- virtualisation pour gros volumes

### 5.3 Formulaires

- autosave optionnel sur brouillons
- validations immediates
- pre-affectations automatiques visibles et modifiables
- duplication d'operation en un clic
- ventilation sur sous-grille imbriquee

### 5.4 Traitements longs

- imports et recalculs lances en tache asynchrone
- barre de progression
- journal de traitement
- possibilite de corriger les lignes en erreur sans relancer tout le flux

### 5.5 Productivite

- raccourcis clavier sur les ecrans pivots
- palette de commande pour acces rapide a un compte, un tiers, une operation
- recherches globales
- vues favorites par utilisateur

## 6. Macro-architecture fonctionnelle

Je recommande un `monolithe modulaire` plutot qu'une architecture microservices.

Cela colle mieux a:

- la taille probable de l'equipe;
- les dependances fortes entre modules;
- la necessite de reprendre vite les regles metier;
- la simplicite de maintenance.

Modules backend et frontend alignes:

- `auth`
- `parametres`
- `comptes`
- `operations`
- `ventilations`
- `budgets-postes`
- `categories`
- `tiers`
- `abonnements`
- `imports`
- `rapprochements`
- `portefeuille`
- `statistiques`
- `administration`

## 7. Modele de donnees cible

### 7.1 Base principale

`PostgreSQL` est le meilleur choix pour:

- integrite transactionnelle;
- requetes analytiques solides;
- gestion fine des index;
- possibilite de vues materialisees pour les statistiques;
- bon compromis cout/fiabilite.

### 7.2 Principes de modelisation

- tables coeur proches du fonctionnel historique
- cles techniques UUID ou bigint
- colonnes d'audit: `created_at`, `updated_at`, `created_by`, `updated_by`
- soft delete uniquement quand utile
- historisation explicite sur les donnees sensibles si necessaire

### 7.3 Tables majeures a reprendre

- `accounts`
- `operations`
- `operation_splits`
- `budgets`
- `categories`
- `groupings`
- `third_parties`
- `subscriptions`
- `subscription_schedules`
- `payment_methods`
- `movement_types`
- `imports`
- `import_profiles`
- `portfolio_transactions`
- `portfolio_matchings`
- `portfolio_prices`
- `portfolio_labels`

## 8. Regles metier a isoler dans le backend

Il faut absolument sortir du frontend toute logique critique issue de WinDev:

- calcul du solde compte
- calcul du solde a date
- recalcul des postes
- gestion des operations ventilees
- affectation automatique des tiers
- generation des abonnements
- rapprochement bancaire
- pointage achat/vente portefeuille

Je recommande un modele `services metier + cas d'usage`:

- `CalculateAccountBalance`
- `CalculateBudgetBalances`
- `SplitOperation`
- `GenerateSubscriptions`
- `AutoAssignThirdParty`
- `RunBankReconciliation`
- `MatchPortfolioTrades`

## 9. Strategie API

### 9.1 Style

Je recommande une API `REST` claire, versionnee et documentee.

Exemples:

- `GET /api/accounts`
- `GET /api/accounts/:id/operations`
- `POST /api/operations`
- `POST /api/operations/:id/split`
- `POST /api/reconciliations/:accountId/start`
- `POST /api/subscriptions/generate`
- `POST /api/imports/bank-file`
- `GET /api/statistics/operations`

### 9.2 Pourquoi REST ici

`REST` est suffisant et plus simple que `GraphQL` pour:

- une equipe reduite;
- des ecrans bien identifies;
- un domaine transactionnel;
- une reprise progressive.

Si besoin, on peut ajouter plus tard un endpoint analytique dedie ou quelques vues optimisees.

## 10. Gestion des statistiques

La partie statistiques est transverse et potentiellement couteuse.

Je recommande:

- requetes SQL dediees pour les vues principales
- index composites sur compte, date, categorie, budget, tiers
- vues materialisees pour certaines syntheses lourdes
- recalculs incrementaux si le volume devient important

Il ne faut pas tout faire via ORM. Une partie des statistiques devra probablement passer par SQL maitrise.

## 11. Gestion des imports

Les imports sont un sujet central et doivent etre industrialises.

### 11.1 Pipeline recommande

1. depot du fichier
2. creation d'un `import job`
3. parsing du fichier
4. normalisation des lignes
5. controle metier
6. previsualisation des anomalies
7. validation utilisateur
8. integration transactionnelle
9. journal d'audit

### 11.2 Types d'import

- Excel parametrable
- fichiers bancaires
- transactions DEGIRO
- cours de bourse

### 11.3 Conception

- adaptateurs par source
- moteur de mapping configurable
- regles de dedoublonnage
- simulation avant import definitif

## 12. Rapprochement bancaire

Le rapprochement doit avoir son propre ecran expert.

Je recommande:

- une vue a deux panneaux
- operations non rapprochees a gauche
- resume releve / ecarts a droite
- actions rapides de selection et marquage
- recalcul en temps reel du solde rapproche

Techniquement:

- transaction SQL pour valider un lot
- etat de session de rapprochement
- verrou logique pour eviter les conflits

## 13. Portefeuille titres

Ce module est suffisamment specifique pour etre isole fonctionnellement.

Je recommande:

- un sous-module distinct, mais dans le meme monolithe
- services dedies pour pointage achat/vente
- imports separes des operations bancaires
- tables specialisees pour prix, transactions et matchings

Cela permet de livrer le coeur bancaire d'abord, puis le portefeuille en phase 2 sans casser l'ensemble.

## 14. Securite et profils

Meme pour une application personnelle ou patrimoniale, il faut prevoir:

- authentification securisee
- hash des mots de passe
- chiffrement des secrets bancaires eventuels
- journal d'audit sur operations sensibles
- gestion des droits par role

Roles minimaux:

- `admin`
- `gestion`
- `consultation`

## 15. Strategie de migration depuis WinDev

### 15.1 Approche recommandee

Je recommande une refonte par `vertical slices`, pas une simple conversion ecran par ecran.

Ordre conseille:

1. socle technique + auth + parametres
2. comptes
3. operations
4. ventilation
5. budgets / categories / tiers
6. statistiques principales
7. rapprochement
8. imports prioritaires
9. abonnements
10. portefeuille

### 15.2 Reprise de donnees

- extraire le schema historique
- produire un mapping source -> cible
- ecrire des scripts d'import idempotents
- rejouer des jeux d'essai comparatifs
- valider les soldes et statistiques entre ancien et nouveau systeme

## 16. Proposition de roadmap

### 16.1 MVP

Objectif: couvrir le coeur de valeur metier.

- login
- comptes
- liste des operations
- fiche operation
- ventilation
- budgets/categories/tiers
- statistiques principales
- rapprochement simple
- un import prioritaire

### 16.2 V2

- abonnements complets
- imports avances
- portefeuille titres
- tableaux de bord enrichis
- maintenance avancee

## 17. Risques principaux

- sous-estimer la richesse de `FEN_Table_OPERATION`
- sous-estimer la logique cachee dans les procedures globales WinDev
- vouloir tout faire en ORM sans SQL cible pour les stats
- ne pas traiter les imports comme un vrai sous-systeme
- trop decouper l'architecture des le debut

## 18. Recommandation finale

La meilleure solution technique pour `MONEYBACK` est a mon sens:

- `Next.js + React + TypeScript` pour une interface web riche
- `NestJS` pour centraliser la logique metier
- `PostgreSQL` pour la robustesse transactionnelle et analytique
- `Redis + BullMQ` pour imports, generation d'abonnements et recalculs
- `AG Grid` sur les ecrans pivots si vous voulez retrouver un confort proche du desktop

Le point cle n'est pas seulement la stack. C'est surtout de concevoir l'application comme un `client metier web riche`, et non comme un simple site CRUD.

## 19. Variante si vous voulez reduire la complexite

Si vous souhaitez une stack plus legere a maintenir:

- `Next.js`
- `PostgreSQL`
- `Prisma`
- jobs `cron` + file simple
- `TanStack Table` partout au lieu de `AG Grid`

Cette variante est plus economique, mais un peu moins puissante sur les ecrans experts.

## 20. Prochaine etape conseillee

Avant de coder, je recommande de produire 3 livrables:

1. `cartographie detaillee de FEN_Table_OPERATION`
2. `modele de donnees cible`
3. `maquettes fonctionnelles web des ecrans pivots`

Ces 3 elements suffiront pour lancer un premier sprint de refonte dans de bonnes conditions.
