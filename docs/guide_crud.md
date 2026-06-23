# Guide CRUD MoneyBackWeb

Ce document explique comment construire un CRUD dans MoneyBackWeb en restant coherent avec l'architecture actuelle du projet.

Il s'appuie sur les patterns reels deja presents, notamment :
- CRUD de reference simple : enveloppes / budgets
- CRUD plus riche : tiers
- CRUD tres specifique : operations

## 1. Philosophie generale

Un CRUD MoneyBackWeb n'est pas seulement une liste et une fiche.

Il repose sur 5 couches qui doivent rester alignees :
- base de donnees Prisma ;
- schemas et DTO partages ;
- service et controller NestJS ;
- hooks React Query ;
- composants Next.js de liste et de fiche.

Principes a respecter :
- la base de verite des donnees est `packages/db/prisma/schema.prisma` ;
- les contrats front/back vivent dans `packages/shared/src/schemas.ts` et `packages/shared/src/enums.ts` ;
- la logique metier doit rester dans les services backend ;
- le frontend orchestre l'UI, les filtres, la navigation et la validation de formulaire ;
- les composants CRUD doivent reutiliser les tokens visuels centralises.

Regle de pagination CRUD :
- toute liste CRUD doit afficher `20` enregistrements par defaut ;
- cette valeur doit etre coherente entre le fallback frontend et le schema de filtres partage ;
- les options de pagination peuvent proposer d'autres valeurs, mais `20` doit etre la valeur initiale.

## 1bis. Reflexe avant generation

Avant de generer un nouveau CRUD, il faut se poser explicitement la question suivante :

- faut-il d'abord explorer la documentation et les ecrans WinDev de l'ancien logiciel ?

Regle pratique :
- si le referentiel ou l'ecran a un heritage metier probable, il vaut mieux verifier la doc et les captures WinDev avant de coder ;
- si le perimetre semble simple mais que le doute existe, demander explicitement si l'on doit d'abord consulter la doc WinDev ;
- si l'on part sans verification documentaire, l'hypothese doit etre volontaire et assumee.

Sources a verifier en priorite :
- `docs/Analyse ancien et projet et proposition/documentation_fonctionnelle_moneyback.md`
- `docs/modele_de_donnees_extrait.md`
- `docs/extracted_screens/`
- `docs/Analyse ancien et projet et proposition/screenshots/`

Ce reflexe est important car certains CRUD apparemment simples portent en realite des champs ou comportements historiques non evidents, comme cela a ete le cas pour le `code` du referentiel `moyens de paiement`.

## 2. Carte des fichiers d'un CRUD

Pour un referentiel standard nomme ici `things`, la structure cible ressemble a ceci :

### Base et contrats

- `packages/db/prisma/schema.prisma`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/enums.ts` si besoin d'enums metier

### Backend API

- `apps/api/src/modules/things/things.module.ts`
- `apps/api/src/modules/things/things.controller.ts`
- `apps/api/src/modules/things/things.service.ts`

### Frontend data

- `apps/web/src/hooks/useThings.ts`

### Frontend UI

- `apps/web/src/components/things/ThingsList.tsx`
- `apps/web/src/components/things/ThingsFiche.tsx`

### Routage Next.js

- `apps/web/src/app/referentiels/things/page.tsx`
- `apps/web/src/app/referentiels/things/new/page.tsx`
- `apps/web/src/app/referentiels/things/[id]/page.tsx`

### Navigation

- `apps/web/src/components/layout/AppNavbar.tsx` si le CRUD doit etre visible dans le menu

## 3. Couche interface : fichiers de reglage

Le projet a une couche de reglage d'interface CRUD centralisee. Il faut la connaitre avant de construire un nouvel ecran.

### Fichier principal

- [apps/web/src/lib/crud-tokens.ts](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/lib/crud-tokens.ts)

Ce fichier contient :
- les largeurs maximales liste / fiche ;
- la densite des lignes et entetes ;
- les couleurs CRUD ;
- les tailles de typo ;
- les dimensions des champs ;
- les espacements internes ;
- les variables CSS exposees globalement ;
- le registre des formulaires ;
- les surcharges de certains formulaires.

### Injection globale des variables

- [apps/web/src/providers/Providers.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/providers/Providers.tsx)

Les variables CSS CRUD sont injectees globalement via `buildCrudGlobalCss()`.

Consequence :
- un nouveau CRUD doit prioritairement consommer les variables CSS existantes ;
- il faut eviter les tailles “en dur” sauf besoin ponctuel justifie.

### Registre des formulaires

Dans `crud-tokens.ts` :
- `CRUD_FORM_REGISTRY` documente les formulaires connus ;
- `CRUD_FORM_OVERRIDES` permet de surcharger localement la densite d'une fiche.

Exemple existant :
- `operationsInline` utilise `buildCrudFormCssVariables('operationsInline')` pour compacter la saisie inline.

Quand ajouter une entree :
- si le nouveau formulaire a des besoins de densite differents de la fiche standard ;
- si on veut expliciter dans le projet qu'il s'agit d'un formulaire CRUD reconnu.

## 3bis. Regle CRUD pour les listes a code court

Quand un champ de selection CRUD est volontairement compact et que la valeur utile au quotidien est un `code` court, il faut appliquer la regle suivante :

- champ replie : afficher uniquement le `code` ;
- liste deroulee : afficher le `code` et le `libelle complet` ;
- recherche : permettre la recherche a la fois sur le `code` et sur le `libelle complet` ;
- largeur : le champ replie peut rester compact, mais la liste deroulee doit etre plus large si necessaire pour lire le libelle.

Intention :
- gagner de la place dans les grilles et fiches denses ;
- conserver une lecture metier claire au moment du choix ;
- eviter les listes compactes illisibles une fois ouvertes.

Pattern recommande :
- preparer des options enrichies de type `value`, `label` et `fullLabel` ;
- utiliser `label` pour la valeur affichee dans le champ ;
- utiliser un rendu personnalise des options pour montrer `label + fullLabel` dans la liste ouverte ;
- personnaliser le filtrage pour chercher sur les deux informations.

Exemple deja implemente :
- `TM` et `MP` dans la saisie des operations.

## 4. Pattern base de donnees

### Quand le modele evolue

Modifier :
- `packages/db/prisma/schema.prisma`

Puis executer :
- `pnpm db:generate`
- la migration adaptee (`pnpm db:migrate` ou workflow equivalent du projet)

Conventions a respecter :
- noms Prisma clairs ;
- colonnes mappees en `snake_case` ;
- relations explicites ;
- timestamps coherents avec l'existant.

### Presenter les relations pour le frontend

Le backend ne renvoie pas forcement les noms Prisma bruts.

Exemple budget/enveloppe :
- en base : `groupingId`, `grouping`
- en sortie API : `regroupementId`, `regroupement`

Ce travail se fait dans une methode `presenter(...)` cote service, par exemple dans :
- [apps/api/src/modules/budgets/budgets.service.ts](/Users/cs/Documents/dev/MoneyBackWeb/apps/api/src/modules/budgets/budgets.service.ts)

Regle pratique :
- garder Prisma au plus pres de la base ;
- presenter l'objet API au plus pres du vocabulaire fonctionnel de l'UI.

## 5. Pattern schemas partages

Les schemas partages sont la charniere entre backend et frontend.

Fichier principal :
- [packages/shared/src/schemas.ts](/Users/cs/Documents/dev/MoneyBackWeb/packages/shared/src/schemas.ts)

Pour un CRUD standard, on cree :
- `CreateThingSchema`
- `UpdateThingSchema`
- `ThingFiltersSchema`
- les types inferes `CreateThingDto`, `UpdateThingDto`, `ThingFiltersDto`

Bonnes pratiques :
- mettre les `default(...)` quand ils representent une vraie intention metier ou API ;
- utiliser `z.preprocess(...)` pour les query params booleens ou numeriques ;
- garder `UpdateSchema = CreateSchema.partial()` quand c'est suffisant ;
- centraliser ici les enums partages si l'UI et l'API les consomment.

Pattern observe pour les filtres :
- `page`, `limit`, `sortBy`, `sortOrder`
- `search`
- filtres fonctionnels propres au domaine

## 6. Pattern backend NestJS

### Controller fin

Exemple :
- [apps/api/src/modules/budgets/budgets.controller.ts](/Users/cs/Documents/dev/MoneyBackWeb/apps/api/src/modules/budgets/budgets.controller.ts)

Le controller doit surtout :
- parser les query params via les schemas partages ;
- deleguer au service ;
- exposer les routes REST standards.

Structure cible :
- `GET /things`
- `GET /things/:id`
- `POST /things`
- `PATCH /things/:id`
- `DELETE /things/:id`

### Service epais

Le service porte :
- les filtres Prisma ;
- le tri ;
- les `include` ;
- la transformation de sortie ;
- les verifications d'existence ;
- la logique metier.

Pattern recommande :
1. `presenter(...)`
2. `findAll(filters)`
3. `findOne(id)`
4. `create(dto)`
5. `update(id, dto)`
6. `remove(id)`

Bonnes pratiques concretes :
- `findOne` leve un `NotFoundException` ;
- `findAll` utilise `$transaction([findMany, count])` pour liste + total ;
- les relations affichees en liste/fiche sont chargees directement via `include` ;
- la logique de normalisation ou de suppression des donnees vides se fait ici, pas dans le controller.

## 7. Pattern hooks React Query

Exemple :
- [apps/web/src/hooks/useEnveloppes.ts](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/hooks/useEnveloppes.ts)

Un hook CRUD standard expose en general :
- `useThings(filters)`
- `useThingsAll()` pour les selects
- `useThing(id)`
- `useCreateThing()`
- `useUpdateThing()`
- `useDeleteThing()`

Conventions importantes :
- definir une constante `KEY` stable ;
- invalider `queryKey: [KEY]` apres create/update/delete ;
- normaliser les donnees de l'API dans une fonction `normalizeThing(...)` si le frontend attend un vocabulaire different ;
- garder les types du hook proches de l'usage UI.

`useThingsAll()` est utile pour :
- les listes de reference dans des `Select` ;
- les dependances inter-CRUD ;
- eviter de dupliquer des appels ad hoc dans les composants.

## 8. Pattern composant liste

Exemple de reference :
- [apps/web/src/components/enveloppes/EnveloppesList.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/components/enveloppes/EnveloppesList.tsx)

Responsabilites d'une liste CRUD :
- lire les filtres dans l'URL ;
- appeler le hook liste ;
- gerer le tri, la pagination et la recherche ;
- afficher les actions ouvrir / supprimer ;
- pousser la navigation vers `new` et `:id` ;
- afficher un surlignage temporaire via `highlight`.

Pattern actuel de navigation/etat :
- `useSearchParams()` lit `page`, `limit`, `search`, `sortBy`, `sortOrder`, etc. ;
- `pushParams(...)` reecrit les query params ;
- `highlight` sert a mettre en evidence l'enregistrement venant d'etre cree ou modifie ;
- `router.replace(...)` nettoie `highlight` apres usage.

Pattern UI :
- `useReactTable(...)` pour les listes secondaires ;
- boutons et icones Mantine ;
- largeur max via `var(--crud-list-max-width)` ;
- bandeau titre, toolbar, tableau et pied avec tokens `CRUD`.

Elements visuels a reutiliser :
- `CRUD.couleurs.fondBandeau`
- `CRUD.couleurs.fondEnteteTableau`
- `CRUD.couleurs.grilleTableau`
- `CRUD.typographie.tailleTexte`
- `CRUD.liste.*`

Quand la liste devient plus metier :
- garder la logique de rendu dans le composant ;
- deplacer la logique fonctionnelle dans des helpers si elle grossit ;
- ne pas mettre de calcul financier structurant dans la liste.

## 9. Pattern composant fiche

Exemple de reference :
- [apps/web/src/components/enveloppes/EnveloppesFiche.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/components/enveloppes/EnveloppesFiche.tsx)

Responsabilites d'une fiche CRUD :
- charger l'entite si on est en edition ;
- charger les referentiels necessaires aux selects ;
- construire un schema local RHF/Zod adapte a l'UI ;
- transformer les valeurs du formulaire en payload API ;
- appeler create/update/delete ;
- rediriger vers la liste avec `highlight`.

Pattern conseille :
1. `schema`
2. `type FormValues`
3. `toPayload(values)`
4. `Props = { id?: string }`
5. `useThing(id ?? '')` + hooks annexes
6. `useForm(...)`
7. `useEffect(reset...)` pour l'edition
8. `onSubmit`
9. rendu de la fiche

Pattern UI de fiche :
- carte centree avec `var(--crud-form-max-width)` ;
- bandeau superieur identique aux listes ;
- labels dans une colonne fixe `var(--crud-label-width)` ;
- champs via `var(--crud-field-height)` et `var(--crud-field-font-size)` ;
- boutons de pied relies aux actions CRUD.

Elements visuels a reutiliser :
- `FIELD_BG`
- `LABEL_COLOR`
- `labelStyle`
- `topLabelStyle`
- `fieldInputStyle`

## 10. Pattern routage Next.js

Exemple enveloppes :
- [apps/web/src/app/referentiels/enveloppes/page.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/app/referentiels/enveloppes/page.tsx)
- [apps/web/src/app/referentiels/enveloppes/new/page.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/app/referentiels/enveloppes/new/page.tsx)
- [apps/web/src/app/referentiels/enveloppes/[id]/page.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/app/referentiels/enveloppes/[id]/page.tsx)

Pattern retenu :
- page liste : titre + composant liste, souvent dans `Suspense`
- page creation : titre + fiche sans `id`
- page edition : titre + fiche avec `id`

Ce routage simple est a privilegier pour un CRUD de referentiel.

## 11. Pattern navigation

Si le CRUD doit etre accessible depuis le menu principal, mettre a jour :
- [apps/web/src/components/layout/AppNavbar.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/components/layout/AppNavbar.tsx)

Le projet a aujourd'hui un sous-menu `Fichiers` pour les referentiels.

Regle pratique :
- ne pas ajouter un item de menu tant que le CRUD n'est pas suffisamment exploitable ;
- si le CRUD remplace un ancien nom metier, garder la coherence de vocabulaire dans le menu.

## 12. Construction pas a pas d'un nouveau CRUD

### Etape 1 - Clarifier le domaine

Definir :
- nom technique ;
- nom fonctionnel affiche ;
- champs obligatoires ;
- booleens et enums ;
- relations vers d'autres referentiels ;
- besoins de tri et de recherche ;
- regles metier non triviales.

### Etape 2 - Poser le modele Prisma

Faire evoluer `schema.prisma`, puis :
- generer Prisma ;
- creer la migration.

### Etape 3 - Poser les schemas partages

Ajouter :
- create ;
- update ;
- filters ;
- types inferes ;
- enums si necessaire.

### Etape 4 - Creer le module API

Creer :
- controller ;
- service ;
- module.

Puis brancher le module dans l'application si besoin.

### Etape 5 - Exposer les hooks frontend

Creer `useThings.ts` avec :
- types UI ;
- normalisation eventuelle ;
- queries ;
- mutations ;
- invalidation.

### Etape 6 - Construire la liste

Commencer par :
- colonnes indispensables ;
- recherche ;
- tri ;
- pagination ;
- suppression.

Ajouter ensuite :
- filtres metier ;
- navigation contextuelle ;
- badges ou etats specifiques.

### Etape 7 - Construire la fiche

Commencer par :
- formulaire minimal ;
- create ;
- update ;
- delete ;
- redirection.

Ajouter ensuite :
- sous-sections ;
- composants enrichis ;
- blocs enfants ;
- aides de saisie.

### Etape 8 - Regler l'interface

Par defaut :
- reutiliser les variables CRUD globales.

Si le formulaire a une densite particuliere :
- l'ajouter a `CRUD_FORM_REGISTRY` ;
- lui associer une surcharge dans `CRUD_FORM_OVERRIDES` ;
- utiliser `buildCrudFormCssVariables(...)` si necessaire.

## 13. Checklist de qualite avant de conclure

### Base / partage

- le modele Prisma est coherent ;
- les migrations sont propres ;
- les schemas partages couvrent create/update/filters ;
- les enums partages sont centralises si besoin.

### Backend

- le controller est fin ;
- le service porte la logique ;
- `findAll` renvoie `items`, `total`, `page`, `limit` ;
- `findOne` leve un `NotFoundException` ;
- les relations utiles sont incluses ;
- la sortie API est presentable par le frontend sans bricolage excessif.

### Frontend data

- les hooks utilisent React Query ;
- les mutations invalident correctement ;
- `useAll()` existe si le CRUD est reference ailleurs ;
- la normalisation est centralisee.

### Frontend UI

- la liste lit et ecrit les search params ;
- la fiche redirige avec `highlight` ;
- les styles consomment les tokens CRUD ;
- les messages d'erreur et chargement sont presents ;
- les labels metier sont coherents avec le vocabulaire du projet.

### Verification

- lancer au minimum la verification la plus petite pertinente ;
- si schema Prisma modifie : `pnpm db:generate` ;
- ensuite `pnpm typecheck` ou une verification cible selon le perimetre.

## 14. Anti-patterns a eviter

- mettre de la logique metier dans le controller ;
- faire des `fetch` directs dans les composants ;
- dupliquer des schemas entre web et api ;
- coder des tailles/espaces/couleurs sans passer par les tokens CRUD ;
- laisser le frontend interpreter seul des structures complexes de base ;
- modifier un CRUD existant en refonte gratuite alors qu'un pattern similaire existe deja.

## 15. CRUD de reference a copier selon le besoin

### CRUD simple de referentiel

Prendre comme base :
- enveloppes

Fichiers pivots :
- [apps/web/src/components/enveloppes/EnveloppesList.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/components/enveloppes/EnveloppesList.tsx)
- [apps/web/src/components/enveloppes/EnveloppesFiche.tsx](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/components/enveloppes/EnveloppesFiche.tsx)
- [apps/web/src/hooks/useEnveloppes.ts](/Users/cs/Documents/dev/MoneyBackWeb/apps/web/src/hooks/useEnveloppes.ts)
- [apps/api/src/modules/budgets/budgets.service.ts](/Users/cs/Documents/dev/MoneyBackWeb/apps/api/src/modules/budgets/budgets.service.ts)

### CRUD riche avec sous-structures

Prendre comme base :
- tiers

Utile si le domaine porte :
- lignes filles ;
- regles ;
- blocs repetables ;
- relations plus nombreuses.

### CRUD metier tres specifique

Prendre comme base :
- operations

Utile si le domaine porte :
- logique metier forte ;
- etats derives ;
- edition inline ;
- dependances multiples.

## 16. Recommandation pour le prochain essai

Pour tester ce guide, le plus simple est de choisir un nouveau CRUD de complexite faible a moyenne :
- un referentiel avec 5 a 10 champs ;
- 1 ou 2 relations maximum ;
- une liste triable/recherchable ;
- une fiche create/update/delete.

Strategie recommandee :
1. partir du couple `EnveloppesList` / `EnveloppesFiche` ;
2. adapter les schemas partages ;
3. construire le service API ;
4. brancher les hooks ;
5. regler l'UI via `crud-tokens.ts` seulement si un besoin apparait.

Ainsi, on testera le guide sur un cas propre sans etre pollue par la complexite des operations.
