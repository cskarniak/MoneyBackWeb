# Import legacy des budgets / enveloppes

## Objectif

Définir le premier importeur ciblé pour migrer les `budgets` depuis l'ancienne base WinDev vers le modèle actuel MoneyBackWeb.

Ce document couvre uniquement l'import des budgets depuis le fichier :

- `migration windev/exports postes.csv`

L'objectif du premier incrément n'est pas de construire tout le sous-système produit d'import, mais un importeur robuste et testable permettant :

- de lire le fichier legacy ;
- de produire une prévisualisation ;
- de signaler clairement les erreurs et ambiguïtés ;
- d'intégrer les budgets dans la base actuelle ;
- de conserver les correspondances de migration via `idSource`.

## Contexte du fichier source

Le fichier analysé présente les caractéristiques suivantes :

- format : `CSV`
- encodage : `latin-1`
- séparateur : `;`
- présence d'une colonne parasite en début de ligne
- colonnes métier observées :
  - `BUD_ID`
  - `BUD_LIBELLE`
  - `BUD_ANCIEN_CODE`
  - `BUD_COMMENTAIRE`
  - `CAR_ID`
  - `BUD_SYNTHESE`
  - `BUD_SOLDEFACTURE`
  - `BUD_DESACTIVE`
  - `BUD_TB`
  - `BUD_SOLDE`
  - `TYM_ID`

Exemple :

```text
N° Enr.;;BUD_ID;BUD_LIBELLE;BUD_ANCIEN_CODE;BUD_COMMENTAIRE;CAR_ID;BUD_SYNTHESE;BUD_SOLDEFACTURE;BUD_DESACTIVE;BUD_TB;BUD_SOLDE;TYM_ID
148;...;174;Assurance;Assurance;;0;1;0;0;42;280,680000;0
```

## Hypothèses de mapping

### Mapping direct vers `Budget`

| Colonne legacy | Cible actuelle | Règle |
|---|---|---|
| `BUD_ID` | `budget.idSource` | entier legacy à conserver |
| `BUD_LIBELLE` | `budget.label` | obligatoire |
| `BUD_COMMENTAIRE` | `budget.comment` | nullable |
| `BUD_SYNTHESE` | `budget.summary` | `1 => true`, `0 => false` |
| `BUD_DESACTIVE` | `budget.active` | inversé : `1 => false`, `0 => true` |
| `BUD_SOLDEFACTURE` | `budget.invoiceBalance` | décimal legacy |
| `BUD_SOLDE` | `budget.balance` | décimal legacy |

### Mapping avec dépendances

| Colonne legacy | Cible actuelle | Condition |
|---|---|---|
| `CAR_ID` | `budget.groupingId` | résolution via `Grouping.idSource` |
| `TYM_ID` | `budget.movementTypeId` | résolution via `MovementType.idSource` |

### Colonnes non intégrées en V0

| Colonne legacy | Décision V0 |
|---|---|
| `BUD_ANCIEN_CODE` | ignorée |
| colonne vide après `N° Enr.` | ignorée |
| chemin image / colonne technique | ignorée |
| `BUD_TB` | non importée automatiquement en V0 |

## Point métier à arbitrer : `BUD_TB`

`BUD_TB` ne ressemble pas à un booléen dans le fichier source. Les valeurs observées sont des identifiants numériques comme `42`, `16`, `29`, etc.

La documentation legacy suggère que :

- `CAR_ID` = regroupement principal du budget
- `BUD_TB` = regroupement utilisé pour la vue tableau de bord

Or le schéma actuel ne porte que :

- `dashboard: Boolean` sur `Budget`

Il n'existe pas aujourd'hui de second lien explicite vers un regroupement tableau de bord.

### Conséquence

En V0, l'importeur ne doit pas tenter de déduire `dashboard` depuis `BUD_TB`.

Il doit plutôt :

- exposer `BUD_TB` dans le rapport de preview ;
- produire un warning quand `BUD_TB` est non nul ;
- laisser `dashboard` à sa valeur courante ou à `false` par défaut, sauf règle métier explicitement validée ensuite.

### Suite possible

Si on confirme que la donnée est importante, il faudra probablement faire évoluer le modèle :

- soit en ajoutant un champ technique `dashboardGroupingId`
- soit en redéfinissant la sémantique actuelle de `dashboard`

## Prérequis techniques

Avant d'exécuter l'import `budgets`, les référentiels suivants doivent être disponibles :

- `Grouping` avec `idSource`
- `MovementType` avec `idSource`

Sans cela, l'importeur ne pourra pas résoudre :

- `CAR_ID`
- `TYM_ID`

## Stratégie de résolution des liens

### Grouping

- si `CAR_ID` est vide ou `0` : `groupingId = null`
- sinon : rechercher `grouping` par `idSource = CAR_ID`
- si aucun regroupement n'est trouvé : erreur de ligne bloquante

### MovementType

- si `TYM_ID` est vide ou `0` : `movementTypeId = null`
- sinon : rechercher `movementType` par `idSource = TYM_ID`
- si aucun type de mouvement n'est trouvé : erreur de ligne bloquante

## Stratégie d'upsert

L'identifiant métier de migration doit être `Budget.idSource`.

Règle :

- si aucun budget n'existe avec `idSource = BUD_ID` : création
- si un budget existe déjà avec `idSource = BUD_ID` : mise à jour

Clés à ne jamais utiliser pour le matching :

- `label`
- `comment`
- anciens codes textuels

## Modes d'exécution

### 1. `preview`

Objectif :

- parser le fichier ;
- transformer chaque ligne ;
- résoudre les dépendances ;
- signaler les erreurs ;
- ne rien écrire en base.

Résultat attendu :

- nombre total de lignes ;
- nombre de lignes valides ;
- nombre de lignes en erreur ;
- aperçu des budgets à créer ;
- aperçu des budgets à mettre à jour ;
- liste des warnings ;
- liste détaillée des erreurs de ligne.

### 2. `apply`

Objectif :

- exécuter le même pipeline que `preview` ;
- n'écrire en base que si la validation est acceptable ;
- réaliser les écritures dans une transaction Prisma.

Résultat attendu :

- nombre de créations ;
- nombre de mises à jour ;
- nombre de lignes ignorées ;
- nombre d'erreurs ;
- résumé final.

## Règles de parsing

### Entiers

Colonnes concernées :

- `BUD_ID`
- `CAR_ID`
- `TYM_ID`
- `BUD_TB`

Règles :

- trim préalable
- chaîne vide => `null`
- `0` peut être interprété soit comme `null`, soit comme valeur métier selon la colonne
- pour `CAR_ID` et `TYM_ID`, `0` sera traité comme absence de lien

### Booléens

Colonnes concernées :

- `BUD_SYNTHESE`
- `BUD_DESACTIVE`

Règles :

- `1 => true`
- `0 => false`
- toute autre valeur => erreur de parsing

### Décimaux

Colonnes concernées :

- `BUD_SOLDE`
- `BUD_SOLDEFACTURE`

Format observé :

- virgule décimale
- espaces de milliers possibles

Exemples :

- `280,680000`
- `1 082,830000`
- `-0,010000`

Règles :

- retirer les espaces
- remplacer `,` par `.`
- convertir vers `Prisma.Decimal`

## Validation métier minimale

Une ligne budget est invalide si :

- `BUD_ID` est absent
- `BUD_LIBELLE` est vide
- `CAR_ID` pointe vers un regroupement introuvable
- `TYM_ID` pointe vers un type de mouvement introuvable
- un booléen ou un décimal est illisible

Une ligne budget produit un warning si :

- `BUD_TB` est non nul
- `BUD_ANCIEN_CODE` est rempli
- le budget existe déjà et sera mis à jour

## Forme recommandée de l'outil

### Premier incrément

Un script CLI backend, par exemple :

- `apps/api/src/scripts/import-budgets-legacy.ts`

ou

- `packages/db/scripts/import-budgets-legacy.ts`

Préférence :

- `apps/api/src/scripts/`

Pourquoi :

- l'import relève du métier et de l'orchestration ;
- on pourra ensuite réutiliser les services backend ;
- cela prépare mieux l'intégration future avec `ImportJob`.

### Commande cible

Exemple :

```bash
pnpm --filter api tsx src/scripts/import-budgets-legacy.ts --file "migration windev/exports postes.csv" --mode preview
pnpm --filter api tsx src/scripts/import-budgets-legacy.ts --file "migration windev/exports postes.csv" --mode apply
```

## Architecture recommandée

Découpage conseillé en petites unités :

- `parseLegacyCsvFile`
- `normalizeLegacyBudgetRow`
- `resolveBudgetDependencies`
- `validateLegacyBudgetRow`
- `buildBudgetUpsertPayload`
- `previewBudgetImport`
- `applyBudgetImport`

### Types utiles

- `LegacyBudgetRowRaw`
- `LegacyBudgetRowNormalized`
- `LegacyBudgetPreviewItem`
- `LegacyBudgetImportError`
- `LegacyBudgetImportWarning`
- `LegacyBudgetImportReport`

## Algorithme cible

1. ouvrir le fichier avec encodage `latin-1`
2. parser le CSV avec séparateur `;`
3. ignorer les colonnes techniques inutiles
4. normaliser chaque ligne
5. charger en mémoire les `Grouping` et `MovementType` indexés par `idSource`
6. résoudre les dépendances
7. valider les lignes
8. produire un rapport `preview`
9. en mode `apply`, exécuter les `upsert` en transaction
10. afficher le rapport final

## Structure de rapport recommandée

```ts
type LegacyBudgetImportReport = {
  file: string;
  mode: 'preview' | 'apply';
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: Array<{
    line: number;
    budgetIdSource: number | null;
    code: string;
    message: string;
  }>;
  errors: Array<{
    line: number;
    budgetIdSource: number | null;
    code: string;
    message: string;
  }>;
};
```

## Points à traiter avant implémentation

1. décider si `Budget.idSource` reste en `String` ou passe en entier
2. ajouter `idSource` sur `Grouping`
3. ajouter `idSource` sur `MovementType`
4. décider du sort de `BUD_TB`
5. décider si `balance` et `invoiceBalance` doivent être importés tels quels ou recalculés ensuite

## Recommandation de mise en oeuvre

Ordre conseillé :

1. typer `idSource` comme entier sur les référentiels legacy
2. ajouter `idSource` sur `Grouping` et `MovementType`
3. implémenter le script `preview` seul
4. tester sur `postes.csv`
5. implémenter ensuite `apply`
6. seulement après, brancher ce moteur dans un vrai pipeline `Import` / `ImportJob`

## Décision proposée

Pour avancer sans bloquer le chantier :

- on commence par un importeur CLI `budgets` en mode `preview/apply`
- on n'intègre pas encore d'UI
- on ne traite pas `BUD_TB` automatiquement
- on prépare les futurs imports en s'appuyant sur `idSource`

