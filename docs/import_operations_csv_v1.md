# Import V1 des operations bancaires CSV

## Objectif

Definir un premier increment produit pour importer des operations bancaires depuis des fichiers `CSV` dont le format varie selon la banque.

Cette V1 privilegie :

- un apprentissage guide du masque a partir d'un export reel ;
- un masque persiste en base ;
- un rattachement explicite du masque a une banque ;
- un pipeline robuste `upload -> preview -> confirmation -> integration` ;
- un moteur simple, lisible et testable avant d'aller vers des regles plus riches.

L'objectif n'est pas encore :

- de detecter automatiquement tous les formats ;
- de gerer tous les cas d'auto-affectation metier avances ;
- de construire un studio complet de transformation libre ;
- de traiter OFX, QIF ou d'autres formats non CSV dans ce premier increment.

## Contexte et alignement avec l'existant

Le projet porte deja un sous-systeme d'import :

- `Import`
- `ImportJob`
- `ImportJobLine`
- `ImportProfile`

La documentation legacy montre deux approches :

- un import bancaire dedie pour les formats connus ;
- un systeme de masque d'import pour les fichiers tabulaires.

La V1 proposee reprend cette intuition mais en version modernisee :

- un moteur CSV generique ;
- des masques appris puis sauvegardes ;
- une normalisation explicite avant la creation des `Operation`.

## Principe fonctionnel

Le point d'entree utilisateur est un export CSV d'une banque.

Flux cible :

1. l'utilisateur choisit une banque
2. il charge un fichier CSV
3. l'application lit l'entete et une ou plusieurs lignes d'exemple
4. l'utilisateur mappe les colonnes utiles
5. l'application construit un masque d'import
6. le masque est enregistre en base
7. l'application produit une preview des operations normalisees
8. l'utilisateur confirme
9. l'integration cree les `Operation`

Le masque doit permettre au minimum d'identifier :

- la date d'operation ;
- le libelle ;
- soit deux colonnes `depense` / `recette` ;
- soit une colonne `montant` avec interpretation par le signe.

## Perimetre V1

### Inclus

- import de fichiers `CSV`
- apprentissage guide du masque
- persistence du masque en base
- rattachement du masque a une banque
- support des 2 strategies de montant :
  - `separateExpenseIncome`
  - `singleAmountSigned`
- preview avant ecriture
- confirmation utilisateur
- integration transactionnelle des operations
- dedoublonnage simple
- journalisation technique via `Import`, `ImportJob`, `ImportJobLine`

### Exclu de V1

- auto-detection intelligente du masque sans intervention
- moteur de formules libre type code embarque
- auto-ventilation avancee des tiers
- edition visuelle complexe de regles de transformation
- import multi-comptes complexes dans un seul fichier
- detection native OFX

## Rattachement a une banque

Le besoin exprime est qu'un masque soit rattache a une banque.

### Decision V1

En V1, il est acceptable de ne pas introduire tout de suite un referentiel `Bank` complet si celui-ci n'est pas utile ailleurs immediatement.

Le plus petit modele coherent est :

- ajouter sur `ImportProfile` un identifiant logique de banque ;
- permettre plusieurs masques pour une meme banque ;
- designer eventuellement un masque par defaut par banque plus tard.

### Proposition de champ V1

Ajouter sur `ImportProfile` :

- `bankKey: String`
- `bankLabel: String`

Raison :

- `bankKey` sert au rattachement stable en base et dans les APIs ;
- `bankLabel` permet d'afficher un libelle sans dependre tout de suite d'un referentiel externe.

Exemples :

- `bankKey = "credit-agricole"`
- `bankLabel = "Credit Agricole"`

### Evolution V2 possible

Si la notion de banque devient transverse dans l'application, on pourra introduire un vrai referentiel :

- `Bank`
- relation `ImportProfile.bankId -> Bank.id`

La V1 ne ferme pas cette evolution.

## Evolution de modele proposee

### `ImportProfile`

Le schema actuel contient deja :

- `name`
- `source`
- `mapping`
- `sheetName`
- `delimiter`
- `active`

Pour la V1 CSV bancaire, la proposition est d'ajouter :

- `bankKey`
- `bankLabel`
- `fileType`
- `encoding`
- `hasHeader`
- `startLine`

Deux options sont possibles.

### Option A - minimiser les colonnes

Conserver l'essentiel dans `mapping` et n'ajouter en colonne que :

- `bankKey`
- `bankLabel`

Avantages :

- evolution souple ;
- migration Prisma plus petite ;
- moins de duplication entre colonnes et JSON.

Inconvenient :

- moins de filtrage SQL natif sur les details du masque.

### Option B - extraire quelques champs frequents

Ajouter en colonnes :

- `bankKey`
- `bankLabel`
- `fileType`
- `encoding`
- `hasHeader`
- `startLine`

Avantages :

- lecture plus claire ;
- filtrage plus simple.

Inconvenient :

- plus de rigidite.

### Recommandation V1

Prendre l'option A :

- colonnes : `bankKey`, `bankLabel`
- details du format stockes dans `mapping`

Cela reste le meilleur compromis pour avancer vite sans enfermer le modele.

## Structure du `mapping`

Le champ `ImportProfile.mapping` doit stocker une definition declarative du format CSV.

Proposition V1 :

```json
{
  "version": 1,
  "kind": "bank-csv",
  "file": {
    "delimiter": ";",
    "encoding": "utf-8",
    "hasHeader": true,
    "startLine": 2
  },
  "date": {
    "column": "Date operation",
    "format": "dd/MM/yyyy"
  },
  "label": {
    "column": "Libelle"
  },
  "amount": {
    "mode": "singleAmountSigned",
    "column": "Montant",
    "decimalSeparator": ",",
    "thousandsSeparator": " ",
    "negativeIsExpense": true,
    "positiveIsIncome": true
  },
  "dedupe": {
    "strategy": "account-date-amount-label",
    "includeStatementRef": true
  }
}
```

Exemple avec deux colonnes montant :

```json
{
  "version": 1,
  "kind": "bank-csv",
  "file": {
    "delimiter": ";",
    "encoding": "utf-8",
    "hasHeader": true,
    "startLine": 2
  },
  "date": {
    "column": "Date",
    "format": "dd/MM/yyyy"
  },
  "label": {
    "column": "Libelle"
  },
  "amount": {
    "mode": "separateExpenseIncome",
    "expenseColumn": "Debit",
    "incomeColumn": "Credit",
    "decimalSeparator": ",",
    "thousandsSeparator": " "
  },
  "dedupe": {
    "strategy": "account-date-amount-label",
    "includeStatementRef": false
  }
}
```

## Champs obligatoires du masque V1

Le masque V1 doit obligatoirement definir :

- la banque cible ;
- le nom du masque ;
- le delimiteur ;
- la presence ou non d'un en-tete ;
- la ligne de debut des donnees ;
- la colonne date ;
- la colonne libelle ;
- un mode de montant.

## Modes de montant supportes

### 1. `singleAmountSigned`

Le fichier porte une seule colonne montant.

Regles :

- montant `< 0` -> `expense`
- montant `> 0` -> `income`
- montant `= 0` -> ligne invalide ou ignoree selon la regle retenue

### 2. `separateExpenseIncome`

Le fichier porte deux colonnes distinctes.

Regles :

- `expense` lit la colonne debit
- `income` lit la colonne credit
- les deux valeurs non nulles sur la meme ligne sont interdites
- les deux valeurs nulles sur la meme ligne sont invalides

## Format canonique intermediaire

Le parser CSV ne doit pas creer directement une `Operation`.

Il doit produire une structure normalisee intermediaire :

```ts
type NormalizedBankOperation = {
  lineNum: number;
  operationDate: Date;
  label: string;
  expense: string | null;
  income: string | null;
  statementRef: string | null;
  rawData: Record<string, unknown>;
};
```

Champs optionnels V1 possibles sans etre obligatoires :

- `valueDate`
- `memo`
- `externalId`
- `currency`

## Pipeline V1 recommande

### 1. Upload et creation du lot

Creation de :

- `Import`
- `ImportJob`

Le lot porte :

- la source `bank-file`
- le nom du fichier
- le compte cible si force des le depart
- la banque choisie
- le masque eventuel

### 2. Lecture du CSV

Le systeme :

- detecte ou applique le delimiteur
- decode le fichier selon l'encodage choisi
- lit l'entete si presente
- extrait les lignes sources

### 3. Apprentissage du masque

L'utilisateur mappe les champs sur une ligne exemple.

Le systeme en deduit :

- les colonnes cibles ;
- le mode de montant ;
- les regles de parsing.

### 4. Sauvegarde du masque

Le masque est enregistre dans `ImportProfile`.

### 5. Preview

Chaque ligne est :

- parsee ;
- normalisee ;
- validee ;
- comparee aux doublons potentiels ;
- enregistree dans `ImportJobLine`.

La preview retourne :

- lignes valides ;
- lignes en erreur ;
- lignes potentiellement doublons ;
- apercu des operations a creer.

### 6. Confirmation

Si l'utilisateur confirme, le backend integre les lignes valides.

### 7. Integration transactionnelle

Pour chaque ligne valide :

- creation d'une `Operation`
- rattachement au `ImportJob`
- ecriture des dates et montants
- `integrationDate` fixee a la date choisie pour le lot

## Regles de validation V1

### Validation fichier

- fichier non vide
- delimiteur coherent
- presence des colonnes mappees
- au moins une ligne de donnees apres `startLine`

### Validation ligne

- date lisible
- libelle non vide
- montant exploitable
- une seule polarite de montant
- compte cible resolu

### Validation du masque

- les colonnes obligatoires existent
- les colonnes distinctes ne doivent pas pointer vers deux champs incompatibles
- le mode `singleAmountSigned` exige `amount.column`
- le mode `separateExpenseIncome` exige `expenseColumn` et `incomeColumn`

## Dedoublonnage V1

La V1 doit etre prudente et explicite.

### Strategie recommandee

Empreinte logique sur :

- `accountId`
- `operationDate`
- montant signe
- libelle normalise
- `statementRef` si disponible

### Comportement

- doublon certain : ligne marquee `skipped` ou `duplicate`
- doute : warning visible en preview
- aucune ecriture silencieuse

Remarque :

Le dedoublonnage V1 doit rester simple. Il ne doit pas tenter de resoudre des rapprochements metier compliques.

## Affectation du compte

La V1 doit supporter en priorite un compte force par l'utilisateur.

### Regle V1

- l'utilisateur choisit le compte cible avant preview ;
- toutes les operations du fichier sont rattachees a ce compte.

### Hors perimetre V1

- detection automatique du compte depuis le contenu du CSV
- import multi-comptes dans un seul fichier

## Logique metier d'integration

La logique metier doit vivre dans les services backend, jamais dans le frontend.

Au moment de la creation de `Operation` :

- `operationDate` vient du masque ;
- `label` vient du masque ;
- `expense` et `income` sont derives selon le mode ;
- `integrationDate` vient de la date d'import choisie ;
- `statementRef` est renseigne si mappe ;
- `entryMode` peut etre defini a une valeur technique d'import ;
- `operationValidated` suit la convention metier retenue pour les imports.

L'auto-affectation de tiers peut etre branchee ensuite comme etape complementaire, mais n'est pas requise pour la V1 fonctionnelle.

## API proposee

### Gestion des masques

- `POST /api/import-profiles`
- `GET /api/import-profiles?source=bank-file&bankKey=...`
- `GET /api/import-profiles/:id`
- `PUT /api/import-profiles/:id`
- `DELETE /api/import-profiles/:id`

### Import CSV bancaire

- `POST /api/imports/bank-csv/upload`
  - cree `Import` + `ImportJob`
  - stocke le fichier temporairement ou son contenu selon la strategie retenue

- `POST /api/imports/bank-csv/learn`
  - prend un echantillon de fichier et un mapping
  - retourne une preview du masque

- `POST /api/imports/bank-csv/preview`
  - prend `importJobId`, `profileId`, `accountId`, `integrationDate`
  - retourne les lignes normalisees et les erreurs

- `POST /api/imports/bank-csv/confirm`
  - integre les lignes valides

## UI V1 proposee

### Ecran 1 - Choix du contexte

- banque
- compte
- date d'integration
- reference d'integration
- fichier CSV
- choix : utiliser un masque existant ou apprendre un nouveau masque

### Ecran 2 - Apprentissage du masque

- affichage de l'entete
- affichage d'une ligne exemple
- selection des colonnes :
  - date
  - libelle
  - depense / recette ou montant
- choix du mode de montant
- regles de parsing :
  - format date
  - separateur decimal
  - ligne de debut

### Ecran 3 - Preview

- resume du masque
- nombre de lignes valides
- nombre de lignes en erreur
- lignes suspectes de doublon
- apercu des operations a creer

### Ecran 4 - Confirmation

- bouton d'integration
- recapitulatif final

## Responsabilites backend recommandees

### Module `imports`

Pilote :

- la creation des lots ;
- la preview ;
- la confirmation ;
- la persistance des lignes techniques.

### Service `bank-csv-parser`

Responsable de :

- decoder le fichier ;
- parser le CSV ;
- appliquer le masque ;
- produire `NormalizedBankOperation`.

### Service `bank-csv-import`

Responsable de :

- valider les lignes ;
- detecter les doublons ;
- convertir en donnees `Operation` ;
- integrer en transaction.

### Service `import-profiles`

Responsable de :

- CRUD des masques ;
- validation structurelle du `mapping`.

## DTOs partages a prevoir

Dans `packages/shared`, prevoir des schemas pour :

- `CreateImportProfileDto`
- `UpdateImportProfileDto`
- `BankCsvMappingSchema`
- `BankCsvPreviewRequestDto`
- `BankCsvPreviewResponseDto`
- `BankCsvConfirmRequestDto`

## Strategie de tests V1

### Tests unitaires

- parsing CSV avec `;` et `,`
- parsing date
- parsing montant signe
- parsing debit / credit
- validation des colonnes obligatoires
- normalisation des libelles

### Tests de service

- preview avec masque valide
- preview avec colonne manquante
- detection de doublon
- integration transactionnelle

### Tests d'integration API

- creation d'un masque
- preview a partir d'un masque sauvegarde
- confirmation d'import

## Arbitrages V1

### Ligne d'exemple unique ou plusieurs lignes

Recommandation :

- UI guidee a partir d'une ligne ;
- verification sur plusieurs lignes en preview.

### Rattachement banque par referentiel ou par cle libre

Recommandation V1 :

- `bankKey` + `bankLabel` portes par `ImportProfile`

### Gestion des regles avancees

Recommandation :

- pas de code libre dans le masque en V1 ;
- JSON declaratif uniquement.

## Resume de la proposition

La V1 retenue consiste a construire un import CSV bancaire par apprentissage guide :

- l'utilisateur part d'un export reel ;
- il mappe les champs essentiels ;
- le masque est enregistre en base ;
- le masque est rattache a une banque ;
- le backend produit une preview puis integre les operations.

Cette approche est :

- simple a comprendre ;
- coherente avec l'ancien concept de masque ;
- compatible avec le schema actuel ;
- extensible vers une V2 plus intelligente sans refonte majeure.
