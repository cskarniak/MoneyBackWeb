/**
 * Convention "accès secondaire" : tout accès depuis un écran principal vers un écran
 * de consultation annexe (zoom statistiques, fiche liée, etc.) s'ouvre dans un nouvel
 * onglet plutôt que de naviguer dans l'onglet courant. L'écran ouvert ainsi détecte
 * qu'il est un onglet secondaire (paramètre `popup=1` dans l'URL) et son bouton
 * "Fermer" ferme alors l'onglet au lieu de naviguer, pour revenir à l'écran appelant
 * (resté ouvert, inchangé, dans son propre onglet).
 */

export function openSecondaryTab(path: string) {
  const separator = path.includes('?') ? '&' : '?';
  window.open(`${path}${separator}popup=1`, '_blank', 'noopener,noreferrer');
}

export function isSecondaryTabRequest(searchParams: URLSearchParams) {
  return searchParams.get('popup') === '1';
}
