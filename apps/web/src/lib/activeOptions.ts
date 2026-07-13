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
