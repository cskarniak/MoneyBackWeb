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
  // Passer des "features" à window.open (même juste noopener/noreferrer) fait basculer certains
  // navigateurs en mode fenêtre popup de petite taille au lieu d'un onglet plein écran : on force
  // donc explicitement une taille quasi plein écran pour ne jamais se retrouver avec un écran coupé.
  const width = Math.round(window.screen.availWidth * 0.95);
  const height = Math.round(window.screen.availHeight * 0.95);
  const left = Math.round((window.screen.availWidth - width) / 2);
  const top = Math.round((window.screen.availHeight - height) / 2);
  const features = `noopener,noreferrer,width=${width},height=${height},left=${left},top=${top}`;
  window.open(`${path}${separator}popup=1`, '_blank', features);
}

export function isSecondaryTabRequest(searchParams: URLSearchParams) {
  return searchParams.get('popup') === '1';
}
