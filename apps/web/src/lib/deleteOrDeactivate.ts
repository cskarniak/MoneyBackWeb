import { confirmAction } from './confirmDelete';

function isUsageConflict(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && (error as { response?: { status?: number } }).response?.status === 409
  );
}

export type DeleteOrDeactivateOutcome = 'deleted' | 'deactivated' | 'cancelled';

/**
 * Tente une suppression ; si le backend la refuse car l'enregistrement est utilisé
 * (409), propose à l'utilisateur de le désactiver à la place au lieu de le faire
 * silencieusement.
 */
export async function deleteWithDeactivateFallback(params: {
  deleteFn: () => Promise<unknown>;
  deactivateFn: () => Promise<unknown>;
}): Promise<DeleteOrDeactivateOutcome> {
  try {
    await params.deleteFn();
    return 'deleted';
  } catch (error) {
    if (!isUsageConflict(error)) throw error;
    const message = error instanceof Error ? error.message : 'Cet enregistrement est utilisé.';
    const confirmed = await confirmAction(`${message}\n\nVoulez-vous le/la désactiver à la place ?`, 'Désactiver');
    if (!confirmed) {
      return 'cancelled';
    }
    await params.deactivateFn();
    return 'deactivated';
  }
}
