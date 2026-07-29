export function confirmSimpleDelete(message: string): boolean {
  return window.confirm(message);
}

export function confirmStrongDelete(message: string): boolean {
  const input = window.prompt(`${message}\n\nCet élément est ventilé. Tapez OUI pour confirmer la suppression.`);
  return (input ?? '').trim().toUpperCase() === 'OUI';
}
