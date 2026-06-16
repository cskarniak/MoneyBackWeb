# Modele de donnees extrait de la documentation MONEYBACK

Source principale: [documentation_fonctionnelle_moneyback.md](/Users/cs/Documents/dev/MoneyBackWeb/docs/Analyse%20ancien%20et%20projet%20et%20proposition/documentation_fonctionnelle_moneyback.md)

## Objectif

Ce document synthétise le modèle métier extrait de la documentation WinDev et le traduit vers la base PostgreSQL/Prisma du projet web.

## Entites coeur

- `Account` (`COMPTE`): compte bancaire, informations de connexion, cloture, rapprochement, synchro.
- `Operation` (`OPERATION`): écriture bancaire principale, montants, dates, typage, verrouillage, liens métier.
- `OperationSplit` (`OPERATIONVENTILEE`): ventilation analytique d'une opération.
- `Budget` (`BUDGET` / poste): poste budgétaire, regroupement, synthèse, tableau de bord, soldes.
- `Category` (`CATEGORIE`): axe de catégorisation, regroupement, sens dépense/recette.
- `Grouping` (`REGROUPEMENT`): regroupement de catégories et de postes.
- `ThirdParty` (`TIERS`): contrepartie, mots-clés d'affectation automatique, formule d'affectation.
- `PaymentMethod` (`MOYEN_PAIEMENT`): moyen de paiement.
- `MovementType` (`TYPE_MOUVEMENT`): type de mouvement métier.

## Entites recurrentes

- `Subscription` (`ABONNEMENT`): abonnement récurrent.
- `SubscriptionRun`: historique des générations.
- `SubscriptionSplit`: ventilation d'abonnement.
- `SubscriptionPlanning` (`ABONNEMENT_PLANNING`): échéancier prévisionnel/généré.

## Entites import

- `Import` (`IMPORT`): lot d'import, source, fichier, référence, rattachement éventuel au compte.
- `ImportJob`: exécution technique du lot d'import.
- `ImportJobLine`: lignes unitaires d'import.
- `ImportProfile` (`MASQUEIMORTATIONEXCEL`): masque/profil de mapping.

## Entites portefeuille

- `PortfolioTransaction` (`PORTEFEUILLE`): transaction titres.
- `PortfolioMatching` (`PORTEFEUILLE_POINT`): pointage achat/vente.
- `PortfolioPrice` (`PORTEFEUILLE_COURS`): historique de cours.
- `PortfolioLabel` (`PORTEFEUILLE_LIBELLE`): référentiel libellé/marché par ISIN.

## Entites analyse et administration

- `Analysis` (`ANALYSE_1`): entête d'analyse persistée.
- `AnalysisDetail` (`ANALYSE_1_DETAIL`): détail d'analyse.
- `AccountReconciliation`: session de rapprochement bancaire.
- `AccountReconciliationLine`: lignes rapprochées.
- `Setting` (`PARAMETRE`): paramétrage applicatif.
- `AuditLog`: traçabilité backend.
- `User`, `Role`, `UserRole`: sécurité de l'application web.

## Relations majeures

- Un `Account` possède plusieurs `Operation`, `Subscription`, `Import`, `AccountReconciliation`.
- Une `Operation` appartient à un `Account` et peut référencer un `Budget`, une `Category`, un `ThirdParty`, un `PaymentMethod`, un `MovementType`, un `Subscription`, un `ImportJob` et une opération d'origine.
- Une `Operation` peut être ventilée en plusieurs `OperationSplit`.
- Un `Budget` et une `Category` appartiennent éventuellement à un `Grouping`.
- Un `Subscription` peut générer plusieurs `Operation`, plusieurs `SubscriptionSplit` et plusieurs entrées de `SubscriptionPlanning`.
- Un `Import` peut porter plusieurs `ImportJob` et plusieurs `PortfolioTransaction`.
- Une `PortfolioTransaction` peut être pointée contre d'autres transactions via `PortfolioMatching`.

## Traductions notables de la doc vers le schema

- Le terme WinDev `BUDGET` est conservé techniquement mais correspond fonctionnellement à un poste budgétaire.
- Les notions de rapprochement sont modélisées dans des tables dédiées plutôt que stockées uniquement sur `Account`.
- Les imports Excel sont portés par `ImportProfile`, qui joue le rôle de masque d'importation.
- Les analyses `ANALYSE_1` et `ANALYSE_1_DETAIL` sont modélisées comme objets persistés d'analyse, sans préjuger encore de leur usage UI final.

## Hypotheses retenues

- `Masquage` des écritures est rapproché du statut de verrouillage/exclusion métier existant.
- `ABONNEMENT_PLANNING` est interprété comme un échéancier matérialisé.
- Les champs historiques WinDev "ancien code" deviennent `legacyCode`.
- Les types très dépendants de l'ancien code WinDev restent des `String` pour ne pas figer prématurément des enums backend incomplètes.
