# Import legacy des abonnements

## Fichiers sources

- `migration windev/export_abonnement.csv`
- `migration windev/export_abonnement_ventilé.csv`

## Commande

```bash
pnpm --filter api import:subscriptions:legacy --mode preview
pnpm --filter api import:subscriptions:legacy --mode apply
```

## Mapping principal

- `ABO_ID` -> `Subscription.idSource`
- `ABO_LIBELLE` -> `Subscription.label`
- `ABO_LibelleEcriture` -> `Subscription.entryLabel`
- `ABO_Depense` / `ABO_Recette` -> `Subscription.expense` / `Subscription.income`
- `ABO_PERIODICITE` -> `Subscription.periodicity`
- `ABO_DatePremiereEcheance` -> `Subscription.firstDueDate`
- `ABO_DateProchaineEcheance` -> `Subscription.nextDueDate`
- `ABO_DateFin` -> `Subscription.endDate`
- `ABO_DatederniereEcheanceGeneree` -> `Subscription.lastGeneratedDueDate`
- `ABO_DateDerniereGénération` -> `Subscription.lastGeneratedDate`
- `ABO_Jour` -> `Subscription.dayOfPeriod`
- `ABO_TYPE` -> `Subscription.subscriptionType`
- `ABO_Ventile` + `export_abonnement_ventilé.csv` -> `Subscription.splits`
- `CPT_ID`, `BUD_ID`, `CAT_ID`, `TIE_ID`, `ABO_TYM_ID` -> résolution via `idSource`

## Périodicités legacy

- `1` -> `daily`
- `2` -> `weekly`
- `3` -> `monthly`
- `4` -> `bimonthly`
- `5` -> `quarterly`
- `6` -> `semiannual`
- `7` -> `annual`

## Type d'abonnement

- `1` -> `real`
- `2` -> `simulation`

## Limites V1

- `OPE_ID` n'est pas relié au modèle d'abonnement actuel.
- `ABO_OPerationGeneree` est ignoré.
- `ABO_Plannifie` est ignoré.
- `ABO_DateDerniereEcheance` est seulement signalé en warning.
