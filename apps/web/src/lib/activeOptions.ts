/**
 * Filtre une liste d'options de type PositioningSelect pour n'y garder que les entités actives,
 * tout en conservant les valeurs déjà sélectionnées (currentIds) même si elles sont devenues inactives,
 * pour ne pas casser l'affichage d'une opération/abonnement/fiche existant(e).
 */
export function filterActiveOptions<T extends { value: string }>(
  options: T[],
  isActive: (value: string) => boolean,
  currentIds: Array<string | null | undefined>,
): T[] {
  const keep = new Set(currentIds.filter((id): id is string => !!id));
  return options.filter(option => isActive(option.value) || keep.has(option.value));
}

/**
 * Une catégorie n'est jamais à la fois en dépense et en recette : selon le montant saisi
 * (dépense ou recette), on ne propose que les catégories compatibles avec ce sens.
 * Tant qu'aucun montant n'est saisi, toutes les catégories restent proposées.
 */
export function resolveAmountDirection(expense?: number | string | null, income?: number | string | null): 'expense' | 'income' | null {
  if (Number(expense || 0) > 0) return 'expense';
  if (Number(income || 0) > 0) return 'income';
  return null;
}

/**
 * Certains types de mouvement (remboursement, trop perçu, affectation poste à poste...)
 * autorisent exceptionnellement une catégorie dans le sens inverse de son paramétrage :
 * dans ce cas, on ne filtre plus par sens et on propose toutes les catégories. Le sens est
 * porté par le type de mouvement de l'en-tête (opération, abonnement ou tiers) ; l'appelant
 * doit propager ce même indicateur aux lignes de ventilation pour rester cohérent.
 */
export function filterCategoryOptionsByDirection<T extends { value: string; direction?: 'expense' | 'income' | null }>(
  options: T[],
  expense?: number | string | null,
  income?: number | string | null,
  allowReversal?: boolean,
): T[] {
  if (allowReversal) return options;
  const direction = resolveAmountDirection(expense, income);
  if (!direction) return options;
  return options.filter(option => option.direction === direction);
}
