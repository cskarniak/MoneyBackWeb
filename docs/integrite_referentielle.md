# Intégrité référentielle de la base MoneyBack

## Objectif

Ce document décrit, pour chaque relation entre tables du référentiel métier (catégories, enveloppes, tiers,
moyens de paiement, types de mouvement, abonnements, comptes), ce qui se passe réellement en base quand
l'enregistrement référencé est supprimé, et comment l'application se protège contre les suppressions
destructrices. Il fait suite à un audit (juillet 2026) qui a révélé que plusieurs suppressions réussissaient
silencieusement en désassociant des données liées, sans aucune erreur ni avertissement.

Source des données : requête directe sur `information_schema` de la base (pas seulement le schéma Prisma,
qui peut diverger de la contrainte réellement posée en base par les migrations historiques).

```sql
SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
       ccu.table_name AS to_table, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY to_table, from_table;
```

## Les trois comportements possibles en base

- **`SET NULL`** : la colonne qui référence l'enregistrement supprimé est mise à `NULL`. La suppression
  réussit **sans erreur**, ce qui est dangereux si rien ne prévient l'utilisateur — c'est la cause du bug
  corrigé en juillet 2026 (voir plus bas).
- **`RESTRICT`** : Postgres refuse la suppression avec une erreur de contrainte si au moins une ligne
  référence encore l'enregistrement. Sûr par construction, mais l'erreur brute Postgres n'est pas
  présentable telle quelle à l'utilisateur (message technique, HTTP 500 si non interceptée).
- **`CASCADE`** : les lignes qui référencent l'enregistrement sont supprimées avec lui. Adapté uniquement
  aux relations de **possession** (une ligne de ventilation n'existe pas sans son abonnement/opération/tiers
  parent) — jamais à une relation de simple **référence** vers un référentiel partagé.

## Référentiel métier : catégories, enveloppes, tiers, abonnements, comptes

Colonnes réellement présentes en base (`information_schema.columns`), toutes en `ON DELETE SET NULL` sauf
mention contraire :

| Table (physique) | Modèle Prisma | `categorie_id` | `budget_id` | `tiers_id` | `abonnement_id` |
|---|---|---|---|---|---|
| `operations` | `Operation` | ✓ | ✓ | ✓ | ✓ (propre) |
| `operations_ventilees` | `OperationSplit` | ✓ | ✓ | — | — |
| `tiers` | `ThirdParty` | ✓ | ✓ | (lui-même) | — |
| `operations_ventilees_tiers` | `ThirdPartySplit` | ✓ | ✓ | ✓ (parent, `CASCADE`) | — |
| `abonnements` | `Subscription` | ✓ | ✓ | ✓ | (lui-même) |
| `abonnements_ventiles` | `SubscriptionSplit` | ✓ | ✓ | — | ✓ (parent, `CASCADE`) |

Une case "parent, `CASCADE`" désigne la relation de possession normale (ex: une ligne de ventilation d'un
tiers disparaît avec le tiers) — ce n'est pas une relation à protéger, contrairement aux autres colonnes de
ce tableau qui pointent vers un référentiel externe partagé.

Comptes (`comptes`) :

| Table | Colonne | Règle |
|---|---|---|
| `operations` | `compte_id` | `RESTRICT` |
| `abonnements` | `compte_id` | `RESTRICT` |
| `imports` | `compte_id` | `SET NULL` |

Moyens de paiement et types de mouvement :

| Table | Colonne | Règle |
|---|---|---|
| `operations` | `moyen_paiement_id` | `SET NULL` |
| `operations` | `type_mouvement_id` | `SET NULL` |
| `budgets` | `type_mouvement_id` | `SET NULL` |
| `abonnements` | `type_mouvement_id` | `SET NULL` |

Regroupements (`regroupements`) :

| Table | Colonne | Règle |
|---|---|---|
| `categories` | `regroupement_id` | `SET NULL` |
| `budgets` | `regroupement_id` | `SET NULL` |
| `budgets` | `regroupement_tableau_bord_id` | `SET NULL` |

## Protections applicatives (juillet 2026)

Toutes les colonnes `SET NULL` ci-dessus permettent en théorie une suppression silencieuse. L'application
ajoute désormais, au niveau service (avant tout appel `delete` Prisma), un contrôle d'usage qui bloque ou
détourne la suppression. Deux stratégies selon l'entité :

### Désactiver au lieu de supprimer (entités avec un champ `actif`)

Si l'enregistrement est utilisé quelque part, l'API le passe à `actif = false` au lieu de le supprimer, et
répond `{ status: 'deactivated', item }`. Sinon, suppression réelle, `{ status: 'deleted', item }`.

| Entité | Fichier service | Tables vérifiées |
|---|---|---|
| Catégorie | `apps/api/src/modules/categories/categories.service.ts` (`remove`) | `operations`, `operations_ventilees`, `abonnements`, `abonnements_ventiles`, `tiers`, `operations_ventilees_tiers` |
| Enveloppe (budget) | `apps/api/src/modules/budgets/budgets.service.ts` (`remove`) | idem, colonne `budget_id`. Réutilise `update()` : si le solde n'est pas nul à la date du jour, la désactivation échoue avec le message métier déjà existant ("Recalcul soldes enveloppes" requis) au lieu de désactiver silencieusement. |
| Tiers | `apps/api/src/modules/third-parties/third-parties.service.ts` (`remove`) | `operations`, `abonnements` |
| Abonnement | `apps/api/src/modules/subscriptions/subscriptions.service.ts` (`remove`) | `operations` |
| Moyen de paiement | `apps/api/src/modules/payment-methods/payment-methods.service.ts` (`remove`) | `operations` (déjà en place avant l'audit) |
| Type de mouvement | `apps/api/src/modules/movement-types/movement-types.service.ts` (`remove`) | `operations`, `budgets`, `abonnements` (déjà en place avant l'audit) |

### Bloquer sans alternative automatique

| Entité | Fichier service | Comportement |
|---|---|---|
| Regroupement | `apps/api/src/modules/groupings/groupings.service.ts` (`remove`) | `ConflictException` si utilisé par des catégories ou enveloppes (compte précis dans le message). Pas de champ `actif` sur `Grouping`, donc pas de désactivation possible. |
| Compte | `apps/api/src/modules/accounts/accounts.service.ts` (`remove`) | `BadRequestException` si utilisé par des opérations, abonnements ou imports, avec renvoi vers la fermeture de compte existante (qui a sa propre règle : solde nul à la date du jour). Un compte a déjà une notion de fermeture (`closed`) distincte de la désactivation ; pas d'auto-fermeture déclenchée depuis la suppression. |

### Frontend

Chaque écran de suppression (liste et fiche) affiche désormais le message renvoyé par l'API — avant l'audit,
plusieurs fiches (`CategoriesFiche`, `EnveloppesFiche`, `GroupingsFiche`, `AccountsFiche`, `SubscriptionsFiche`,
`TiersFiche`) appelaient `deleteMutation.mutateAsync` sans capturer l'erreur, donc une suppression refusée ne
montrait rien à l'utilisateur. Les listes (ex: `PaymentMethodsList.tsx`) affichent en plus une notification
distincte "rendu inactif" en orange quand le statut renvoyé est `deactivated`.

## Hors périmètre (non traité par l'audit de juillet 2026)

- `imports.compte_id` (`SET NULL`) : supprimer un compte détache silencieusement son historique d'import.
  Jugé mineur (donnée de traçabilité, pas de solde ni d'opération), non bloqué.
- `portefeuille_points.transaction_achat_id` / `transaction_vente_id` (`RESTRICT`) : la suppression d'une
  transaction de portefeuille pointée échoue avec l'erreur Postgres brute si elle est encore rapprochée. Le
  module portefeuille n'a pas été audité (fonctionnalité indiquée "pas encore disponible" dans l'app).
- `operations.operation_origine_id` (`SET NULL`) : une opération dérivée perd son lien vers l'opération
  d'origine si celle-ci est supprimée. Comportement jugé acceptable (les opérations ne sont normalement pas
  supprimées, seulement marquées `date_suppression`).

## Comment vérifier après une future migration

Toute nouvelle relation vers un référentiel partagé (table qui peut être modifiée/supprimée depuis l'UI)
doit être ajoutée soit à la liste de comptage du service concerné (pattern "désactiver si utilisé"), soit
protégée explicitement (pattern "bloquer"). Ne jamais laisser une contrainte `SET NULL` sans contrôle
applicatif correspondant : elle rend une suppression destructrice invisible côté utilisateur.

Pour ré-auditer l'existant, relancer la requête `information_schema` ci-dessus sur la base et comparer avec
les tableaux de ce document.
