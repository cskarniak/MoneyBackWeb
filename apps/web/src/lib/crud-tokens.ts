// Source unique des réglages visuels CRUD.
// C'est ici qu'on ajuste la densité des listes et quelques dimensions de base.
// Les valeurs sont aussi exposées automatiquement en variables CSS.

export const CRUD = {
  miseEnPage: {
    largeurMaxListe: 1120, // largeur maximale de la carte liste
    largeurMaxFiche: 780, // largeur maximale de la carte fiche
  },
  liste: {
    paddingVerticalLigne: 0, // hauteur visuelle des lignes du tableau
    paddingHorizontalLigne: 14, // marge intérieure gauche/droite des cellules
    paddingVerticalEntete: 4, // hauteur visuelle de l'entête de colonnes
    paddingHorizontalEntete: 14, // marge intérieure gauche/droite de l'entête
    paddingTopBarreOutils: 14, // espace au-dessus des boutons/filtres
    paddingHorizontalBarreOutils: 14, // marge intérieure horizontale de la barre d'outils
    paddingBottomBarreOutils: 18, // espace sous les boutons/filtres, avant le trait
    paddingTopPied: 14, // espace au-dessus de la pagination
    paddingHorizontalPied: 18, // marge intérieure horizontale du pied de liste
    rayonCarte: 18, // arrondi général de la carte liste
    rayonHautTitre: 14, // arrondi du bandeau titre en haut
  },
  couleurs: {
    fondBandeau: 'linear-gradient(180deg, #4c73f0 0%, #3d63dc 100%)', // fond du bandeau titre
    texteBandeau: '#ffffff', // couleur du texte dans le bandeau titre
    fondEnteteTableau: '#eef2f7', // fond de l'entête de colonnes
    grilleTableau: '#bcc9db', // séparateurs horizontaux et verticaux
    fondLigneImpaire: '#ffffff', // fond des lignes impaires
    fondLignePaire: '#edf3fb', // fond des lignes paires
    fondLigneSurvol: '#dce8f8', // fond au survol d'une ligne
    fondLigneActive: '#e5d0b6', // fond de mise en évidence d'un enregistrement
    fondMiseEnEvidenceZoom: '#ffe066', // fond de mise en évidence de la ligne source lors d'un zoom
  },
  typographie: {
    tailleTexte: 14, // taille standard du texte CRUD
    petiteTailleTexte: 12, // petite taille pour libellés secondaires
    tailleTitre: 20, // taille du titre dans le bandeau
  },
  fiche: {
    hauteurChamp: 30, // hauteur des champs de saisie
    tailleTexteChamp: 12, // taille du texte dans les champs
    espaceEntreChamps: 15, // espace vertical entre deux champs
    hauteurLabel: 42, // hauteur minimale de la zone label
    largeurLabel: 170, // largeur de la colonne des labels
    rayonCarte: 18, // arrondi général de la carte fiche
    paddingTopCorps: 28, // espace au-dessus du premier champ
    paddingHorizontalCorps: 28, // marge intérieure gauche/droite de la fiche
    paddingBottomCorps: 24, // espace sous le dernier champ
    paddingVerticalPied: 16, // hauteur interne de la zone des boutons
    paddingHorizontalPied: 28, // marge horizontale de la zone des boutons
    espaceSections: 18, // réserve pour d'autres blocs verticaux de fiche
    espaceBoutonsPied: 8, // espace horizontal entre boutons
  },
} as const;

export const crudCssVariables = {
  '--crud-list-max-width': `${CRUD.miseEnPage.largeurMaxListe}px`,
  '--crud-form-max-width': `${CRUD.miseEnPage.largeurMaxFiche}px`,
  '--crud-font-size': `${CRUD.typographie.tailleTexte}px`,
  '--crud-font-size-small': `${CRUD.typographie.petiteTailleTexte}px`,
  '--crud-header-font-size': `${CRUD.typographie.tailleTitre}px`,
  '--crud-row-cell-padding-y': `${CRUD.liste.paddingVerticalLigne}px`,
  '--crud-row-cell-padding-x': `${CRUD.liste.paddingHorizontalLigne}px`,
  '--crud-header-cell-padding-y': `${CRUD.liste.paddingVerticalEntete}px`,
  '--crud-header-cell-padding-x': `${CRUD.liste.paddingHorizontalEntete}px`,
  '--crud-field-height': `${CRUD.fiche.hauteurChamp}px`,
  '--crud-field-font-size': `${CRUD.fiche.tailleTexteChamp}px`,
  '--crud-form-field-gap': `${CRUD.fiche.espaceEntreChamps}px`,
  '--crud-label-height': `${CRUD.fiche.hauteurLabel}px`,
  '--crud-label-width': `${CRUD.fiche.largeurLabel}px`,
  '--crud-list-panel-radius': `${CRUD.liste.rayonCarte}px`,
  '--crud-list-title-radius-top': `${CRUD.liste.rayonHautTitre}px`,
  '--crud-list-toolbar-padding-top': `${CRUD.liste.paddingTopBarreOutils}px`,
  '--crud-list-toolbar-padding-x': `${CRUD.liste.paddingHorizontalBarreOutils}px`,
  '--crud-list-toolbar-padding-bottom': `${CRUD.liste.paddingBottomBarreOutils}px`,
  '--crud-list-footer-padding-top': `${CRUD.liste.paddingTopPied}px`,
  '--crud-list-footer-padding-x': `${CRUD.liste.paddingHorizontalPied}px`,
  '--crud-form-panel-radius': `${CRUD.fiche.rayonCarte}px`,
  '--crud-form-body-padding-top': `${CRUD.fiche.paddingTopCorps}px`,
  '--crud-form-body-padding-x': `${CRUD.fiche.paddingHorizontalCorps}px`,
  '--crud-form-body-padding-bottom': `${CRUD.fiche.paddingBottomCorps}px`,
  '--crud-form-footer-padding-y': `${CRUD.fiche.paddingVerticalPied}px`,
  '--crud-form-footer-padding-x': `${CRUD.fiche.paddingHorizontalPied}px`,
  '--crud-form-section-gap': `${CRUD.fiche.espaceSections}px`,
  '--crud-form-footer-gap': `${CRUD.fiche.espaceBoutonsPied}px`,
} as const;

type CrudFormOverrides = Partial<{
  hauteurChamp: number;
  tailleTexteChamp: number;
  espaceEntreChamps: number;
  hauteurLabel: number;
  largeurLabel: number;
  paddingTopCorps: number;
  paddingHorizontalCorps: number;
  paddingBottomCorps: number;
  paddingVerticalPied: number;
  paddingHorizontalPied: number;
  espaceSections: number;
  espaceBoutonsPied: number;
}>;

// Répertoire des formulaires actuellement présents dans l'application.
// La clé est le nom à utiliser pour documenter un formulaire et, si besoin,
// pour lui associer une surcharge dans `CRUD_FORM_OVERRIDES`.
//
// Formulaires recensés :
// - accountsFiche : fiche compte bancaire (`components/accounts/AccountsFiche.tsx`)
// - categoriesFiche : fiche catégorie (`components/categories/CategoriesFiche.tsx`)
// - enveloppesFiche : fiche enveloppe / budget (`components/enveloppes/EnveloppesFiche.tsx`)
// - groupingsFiche : fiche regroupement (`components/groupings/GroupingsFiche.tsx`)
// - movementTypesFiche : fiche type de mouvement (`components/movement-types/MovementTypesFiche.tsx`)
// - paymentMethodsFiche : fiche moyen de paiement (`components/payment-methods/PaymentMethodsFiche.tsx`)
// - operationsFiche : fiche opération classique (`components/operations/OperationsFiche.tsx`)
// - operationsInline : saisie d'opération dans la grille (`components/operations/OperationsInlineEditor.tsx`)
// - subscriptionsFiche : fiche abonnement (`components/subscriptions/SubscriptionsFiche.tsx`)
// - tiersFiche : fiche tiers (`components/tiers/TiersFiche.tsx`)
//
// Remarque : le référentiel `pods` n'a pas encore de composant de formulaire dédié.
export const CRUD_FORM_REGISTRY = {
  accountsFiche: 'Fiche compte bancaire',
  categoriesFiche: 'Fiche catégorie',
  enveloppesFiche: 'Fiche enveloppe / budget',
  groupingsFiche: 'Fiche regroupement',
  movementTypesFiche: 'Fiche type de mouvement',
  paymentMethodsFiche: 'Fiche moyen de paiement',
  operationsFiche: 'Fiche opération classique',
  operationsInline: "Saisie d'opération dans la grille",
  subscriptionsFiche: 'Fiche abonnement',
  tiersFiche: 'Fiche tiers',
} as const;

export const CRUD_FORM_OVERRIDES = {
  operationsFiche: {
    hauteurChamp: 24,
    tailleTexteChamp: 11,
    espaceEntreChamps: 10,
    paddingTopCorps: 18,
    paddingHorizontalCorps: 18,
    paddingBottomCorps: 18,
    espaceSections: 12,
    espaceBoutonsPied: 6,
  },
  operationsInline: {
    hauteurChamp: 22,
    tailleTexteChamp: 10,
    espaceEntreChamps: 8,
    paddingTopCorps: 10,
    paddingHorizontalCorps: 10,
    paddingBottomCorps: 10,
    espaceSections: 10,
    espaceBoutonsPied: 4,
  },
  subscriptionsFiche: {
    hauteurChamp: 28,
    tailleTexteChamp: 11,
    espaceEntreChamps: 12,
    paddingTopCorps: 22,
    paddingHorizontalCorps: 22,
    paddingBottomCorps: 20,
    espaceSections: 14,
    espaceBoutonsPied: 8,
  },
} as const satisfies Record<string, CrudFormOverrides>;

export type CrudFormName = keyof typeof CRUD_FORM_OVERRIDES;

export function buildCrudFormCssVariables(formName?: CrudFormName, manualOverrides: CrudFormOverrides = {}) {
  const formOverrides = formName ? CRUD_FORM_OVERRIDES[formName] : undefined;
  const overrides = { ...formOverrides, ...manualOverrides };

  return {
    '--crud-field-height': `${overrides.hauteurChamp ?? CRUD.fiche.hauteurChamp}px`,
    '--crud-field-font-size': `${overrides.tailleTexteChamp ?? CRUD.fiche.tailleTexteChamp}px`,
    '--crud-form-field-gap': `${overrides.espaceEntreChamps ?? CRUD.fiche.espaceEntreChamps}px`,
    '--crud-label-height': `${overrides.hauteurLabel ?? CRUD.fiche.hauteurLabel}px`,
    '--crud-label-width': `${overrides.largeurLabel ?? CRUD.fiche.largeurLabel}px`,
    '--crud-form-body-padding-top': `${overrides.paddingTopCorps ?? CRUD.fiche.paddingTopCorps}px`,
    '--crud-form-body-padding-x': `${overrides.paddingHorizontalCorps ?? CRUD.fiche.paddingHorizontalCorps}px`,
    '--crud-form-body-padding-bottom': `${overrides.paddingBottomCorps ?? CRUD.fiche.paddingBottomCorps}px`,
    '--crud-form-footer-padding-y': `${overrides.paddingVerticalPied ?? CRUD.fiche.paddingVerticalPied}px`,
    '--crud-form-footer-padding-x': `${overrides.paddingHorizontalPied ?? CRUD.fiche.paddingHorizontalPied}px`,
    '--crud-form-section-gap': `${overrides.espaceSections ?? CRUD.fiche.espaceSections}px`,
    '--crud-form-footer-gap': `${overrides.espaceBoutonsPied ?? CRUD.fiche.espaceBoutonsPied}px`,
  } as Record<string, string>;
}

export function buildCrudGlobalCss() {
  return `
    :root {
      ${Object.entries(crudCssVariables)
        .map(([name, value]) => `${name}: ${value};`)
        .join('\n      ')}
    }
  `;
}
