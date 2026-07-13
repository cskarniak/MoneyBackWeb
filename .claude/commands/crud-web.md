# Skill : Générer un CRUD web homogène

Tu dois générer ou réviser un CRUD web de type **liste + fiche** en respectant strictement les règles ci-dessous.
L'entité cible est : **$ARGUMENTS**

Si aucun argument n'est fourni, demande le nom de l'entité et précise s'il s'agit d'un CRUD classique ou hiérarchique.

---

## Principe général

- Un CRUD est composé de 2 écrans distincts : `liste` et `fiche`.
- La `liste` sert à rechercher, trier, paginer, ouvrir et supprimer.
- La `fiche` sert à créer ou modifier un enregistrement.
- Les erreurs de validation restent sur la fiche.
- Les erreurs de chargement ou d'action lancées depuis la liste restent dans la liste.
- Après création ou modification, retour à la liste sur la page où l'enregistrement est visible selon le tri et les filtres actifs.

## Variante hiérarchique

Utiliser si l'entité est naturellement imbriquée (ex. `module > chapitre > leçon`) :

- Navigation structurelle à gauche, fiche d'édition à droite.
- L'arbre de gauche sert à ouvrir un élément et à créer ses enfants.
- La fiche de droite sert à créer, modifier ou supprimer l'élément sélectionné.
- Après création ou modification, rester sur la fiche de l'élément concerné.
- Après suppression, revenir sur le parent logique quand il existe.
- Les erreurs de navigation restent dans la colonne de gauche.
- Les erreurs de fiche restent dans la fiche de droite.
- La mise en évidence de l'élément sélectionné dans l'arbre doit être distincte du simple hover.

## Structure de page (layout + titre)

- Chaque section de l'application (ex. `/referentiels`) dispose d'un `layout.tsx` qui injecte la `AppNavbar` globale.
- La `AppNavbar` est une barre sombre sticky en haut avec logo, liens de navigation et section utilisateur :
  - `wrap="nowrap"` sur le Group principal — pas de retour à la ligne.
  - `flexShrink: 0` sur le logo et la section droite.
  - `flex: 1` + `overflow: hidden` sur la zone centrale des liens.
  - Liens en `size="xs"` avec `whiteSpace: 'nowrap'`.
  - Le lien actif est détecté par `pathname.startsWith(prefix)` et mis en vert.
- Chaque page (`page.tsx`) affiche en haut du contenu un **titre de page** (`emoji + nom`) en `<Title order={2}>` avant le composant liste ou fiche.
- Le composant fiche lui-même ne comporte **pas** de marge verticale supérieure (`margin: '0 auto'`) ; c'est la page qui gère le padding via `padding: '20px 24px'`.

## Écran Liste

- Bandeau bleu en haut avec le titre de la liste.
- Barre compacte sous le bandeau :
  - gauche : `Menu`, `Nouveau`
  - droite : `Afficher` (défaut 10, options 10/25/50/100), champ de recherche, icône loupe, bouton texte **`Clear`**
- Le bouton `Clear` est un `<Button size="xs" variant="default">` (pas un `ActionIcon`).
- Le sélecteur `Afficher` pilote réellement la pagination.
- Colonnes de données triables au clic sur l'en-tête.
- Afficher `▲` pour le tri croissant et `▼` pour le tri décroissant.
- La colonne `Actions` n'est pas triable.
- Actions de ligne en icônes compactes.
- Tableau compact, lisible, avec zébrage léger.
- Les colonnes booléennes (Actif, etc.) affichent `✓` pour vrai et rien pour faux — pas de Badge coloré.

## Règles de pagination

- La pagination est rendue sous forme de boutons texte : **`Précédent`**, `Page X sur Y`, **`Suivant`**.
- Utiliser des `<Button size="xs" variant="default">` avec `disabled` selon la page courante.
- Ne pas utiliser le composant `<Pagination>` de Mantine (trop encombrant visuellement).

## Repositionnement après création/modification

Un simple surlignage local (garder l'id du dernier enregistrement en mémoire et mettre la ligne en gras si visible) **ne suffit pas**. Si l'enregistrement tombe hors de la page actuellement affichée selon le tri/recherche en cours (ex. libellé qui commence par une lettre tardive alors que la liste est triée par libellé et revient à la page 1), il n'apparaît sur aucune ligne visible : l'utilisateur a l'impression que le mécanisme ne fonctionne plus. Il faut donc calculer la page réelle et y naviguer automatiquement, pas seulement mettre en gras si visible par hasard.

Recette (implémentée pour les enveloppes — `budgets.service.ts` / `EnveloppesList.tsx` — à répliquer à l'identique pour comptes/catégories/tiers) :

1. **Schéma de filtres** (`packages/shared/src/schemas.ts`) : ajouter un champ optionnel `highlightId: z.string().uuid().optional()` au schéma de filtres de l'entité.
2. **Service backend** (`findAll`) : si `highlightId` est fourni, faire une requête supplémentaire `findMany({ where, orderBy, select: { id: true } })` (mêmes `where`/`orderBy` que la liste, sans pagination) et retourner `highlightIndex` = position (0-based) de cet id dans ce tri, ou `null` s'il n'est pas dans le jeu de résultats courant (ex. recherche active qui l'exclut).
3. **Hook frontend** (`useXxx`) : exposer `highlightId` en paramètre de filtre et `highlightIndex` dans le type de réponse (pas de transformation nécessaire, `...r.data` le propage déjà).
4. **Composant liste** :
   - Capturer le paramètre URL `highlight` **une seule fois** via un `useState(() => searchParams.get('highlight'))` (initialiseur paresseux) plutôt que via un `useEffect` — sinon la valeur se perd/rejoue de façon incontrôlée au fil des re-renders.
   - Passer ce `recentId` comme `highlightId` à la requête de liste dès le premier rendu (queryKey stable, pas de requête "sans highlightId" puis "avec" qui ferait courir deux variantes en parallèle).
   - Dans un seul `useEffect`, garder un `useRef(false)` (`hasRepositionedRef`) et **ne faire la correction qu'une seule fois** : si `data.highlightIndex` n'est pas `null`, calculer `targetPage = Math.floor(highlightIndex / limit) + 1` et, s'il diffère de la page courante, pousser cette page dans l'URL (`router.replace`, en conservant tri/recherche) en même temps que le nettoyage du paramètre `highlight`.
   - **Piège à éviter** : si cette correction n'est pas gardée par un flag "une seule fois" (ex. dépendance `[data]` sans garde), elle se redéclenche à **chaque** changement de page — y compris quand l'utilisateur clique sur `Suivant`/`Précédent` — et le renvoie de force sur la page de l'enregistrement mis en évidence, rendant la pagination manuelle inutilisable juste après un retour de fiche.
   - Le surlignage visuel (`recentId === row.original.id` → gras + fond saumon) reste actif indéfiniment tant que le composant liste n'est pas démonté — c'est voulu, seule la correction de page doit être ponctuelle.

## Règles de tableau

- Trait horizontal au-dessus de l'en-tête.
- Trait horizontal sous l'en-tête.
- Trait horizontal sous chaque ligne.
- Trait horizontal final sous le dernier item via le conteneur du tableau.
- Traits verticaux continus entre colonnes.
- Fond de l'en-tête reprend le gris du fond général.
- Les badges (`Rôle`, etc.) prennent uniquement la largeur de leur contenu — ne pas utiliser de Badge pour les booléens.
- La ligne de l'élément récemment créé ou modifié est mise en évidence avec un fond saumon pastel.
- Cette mise en évidence ne concerne que le fond, pas les traits.

## Écran Fiche

- Affichée dans une carte blanche.
- Bandeau bleu intégré en haut de la carte avec le titre fixe **"Fiche [entité]"** (ex. "Fiche catégorie", "Fiche regroupement") — pas de titre dynamique "Nouveau…" / "Modifier…".
- Le fond blanc de la fiche doit coller au bandeau bleu sans arrondi visible en haut.
- Labels à gauche, champs à droite.
- Champs à hauteur compacte et espacement vertical régulier.
- Les champs booléens sont rendus avec `<Checkbox>` — pas de `<Switch>` avec labels.
- **Boutons d'action en bas de la fiche, séparés en deux groupes :**
  - **Gauche** : `Supprimer` (variante `outline`, couleur rouge) — visible uniquement en mode édition.
  - **Droite** : `Annuler` + `Enregistrer`.
- Le bouton `Supprimer` demande une confirmation `window.confirm` avant d'agir.
- Après suppression, redirection vers la liste (`router.push('/...')`).

## Messages et feedback

- Erreurs de fiche dans la fiche, erreurs de liste dans la liste.
- Fond rouge clair pastel pour les erreurs.
- Les messages de succès non indispensables (`créé`, `modifié`) ne sont pas affichés.
- En cas d'erreur de validation, la fiche reste ouverte avec les valeurs saisies conservées.

## Règles de comportement

- Tous les champs de fiche pilotés par un état local du composant.
- Ne pas dépendre uniquement d'une relecture du DOM au moment du save.
- Le payload envoyé au backend vient de l'état local.
- Le calcul de la page de retour après création utilise la liste réelle après tri et filtrage.
- `Annuler` ferme la fiche et revient à la liste.
- `Enregistrer` revient à la liste uniquement si l'opération réussit.

## Règles visuelles

- Palette sobre et stable :
  - bleu soutenu (`#1971c2`) pour les bandeaux
  - gris clair pour le fond de page
  - gris doux pour les traits
  - saumon pastel pour l'élément mis en évidence
  - rouge pastel pour les erreurs
- Hauteurs compactes pour les champs, boutons et lignes.
- Espacements réguliers, sans zones vides excessives.
- Navbar sombre (`#1a1b1e`) avec liens vert actif (`#51cf66`).

## Checklist de reproduction

Avant de livrer le code, vérifie chaque point :

- [ ] Layout de section avec `AppNavbar` (sticky, nowrap, responsive)
- [ ] Titre de page (`emoji + nom`) dans chaque `page.tsx` au-dessus du composant
- [ ] Écran `liste` et écran `fiche` créés
- [ ] Recherche, pagination (Précédent / Page X sur Y / Suivant) et tri fonctionnels
- [ ] Bouton `Clear` texte (pas un ActionIcon)
- [ ] Colonne booléenne avec `✓` (pas de Badge)
- [ ] Limite par défaut 10, options 10/25/50/100
- [ ] Actions `ouvrir` et `supprimer` dans la liste
- [ ] Formulaire complet dans la fiche
- [ ] Champ booléen avec `<Checkbox>` (pas de `<Switch>`)
- [ ] Bouton `Supprimer` rouge à gauche (mode édition uniquement) + `Annuler`/`Enregistrer` à droite
- [ ] Valeurs conservées après erreur de validation
- [ ] Erreurs de fiche et de liste séparées
- [ ] Retour sur la bonne page de liste après création/modification (via `highlightId`/`highlightIndex`, pas un simple surlignage qui suppose que l'élément est sur la page 1)
- [ ] La correction de page ne se fait qu'une seule fois (garde `useRef`) — `Précédent`/`Suivant` restent utilisables juste après le retour de fiche
- [ ] Couleurs, espacements, traits et mise en évidence conformes
