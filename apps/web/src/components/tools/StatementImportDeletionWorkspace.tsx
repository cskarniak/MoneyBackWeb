'use client';

import { useMemo, useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CRUD } from '@/lib/crud-tokens';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useDeleteStatementImport, useOperationStatementRefs } from '@/hooks/useOperations';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

export function StatementImportDeletionWorkspace() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [statementRef, setStatementRef] = useState<string | null>(null);
  const deleteMutation = useDeleteStatementImport();
  const {
    data: statementRefs = [],
    isLoading: loadingStatementRefs,
  } = useOperationStatementRefs(accountId ?? undefined);

  const accountOptions = useMemo(
    () => accounts.map(account => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const statementRefOptions = useMemo(
    () => statementRefs.map(value => ({ value, label: value })),
    [statementRefs],
  );

  const handleDelete = async () => {
    if (!accountId) {
      notifications.show({ message: 'Sélectionne d’abord le compte concerné.', color: 'orange' });
      return;
    }

    if (!statementRef) {
      notifications.show({ message: 'Sélectionne d’abord la référence du relevé.', color: 'orange' });
      return;
    }

    if (!window.confirm(`Confirmer la suppression du relevé "${statementRef}" ?`)) {
      return;
    }

    try {
      const result = await deleteMutation.mutateAsync({ accountId, statementRef });
      notifications.show({
        message: `${result.deletedCount} opération(s) supprimée(s) pour le relevé "${result.statementRef}".`,
        color: result.deletedCount > 0 ? 'green' : 'yellow',
      });

      if (result.deletedCount > 0) {
        setStatementRef(null);
      }
    } catch {
      // handled by mutation state
    }
  };

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 960, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Suppression d&apos;un relevé</Text>

        <Box
          style={{
            background: PANEL_BG,
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box
            style={{
              background: CRUD.couleurs.fondBandeau,
              color: CRUD.couleurs.texteBandeau,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Paramètres
          </Box>

          <Stack gap={16} style={{ padding: '18px 20px' }}>
            {deleteMutation.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{deleteMutation.error.message}</Text>
              </Alert>
            ) : null}

            <Group align="end" wrap="wrap">
              <Select
                style={{ minWidth: 320 }}
                label="Compte"
                placeholder={loadingAccounts ? 'Chargement des comptes...' : 'Choisir un compte'}
                data={accountOptions}
                value={accountId}
                onChange={value => {
                  setAccountId(value);
                  setStatementRef(null);
                }}
                searchable
                clearable
              />
              <Select
                style={{ minWidth: 320 }}
                label="Référence du relevé"
                placeholder={
                  !accountId
                    ? 'Choisis un compte'
                    : loadingStatementRefs
                    ? 'Chargement des relevés...'
                    : 'Choisir un relevé'
                }
                data={statementRefOptions}
                value={statementRef}
                onChange={setStatementRef}
                searchable
                disabled={!accountId}
              />
              <Button
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleDelete}
                loading={deleteMutation.isPending}
                disabled={!accountId || !statementRef}
              >
                Supprimer le relevé
              </Button>
            </Group>

            <Text fz={13} c={TEXT_MUTED}>
              Cette action supprime toutes les opérations du compte rattachées à la référence de relevé sélectionnée.
              Les ventilations associées sont supprimées automatiquement avec les opérations.
            </Text>
          </Stack>
        </Box>

        <Box
          style={{
            background: PANEL_BG,
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box
            style={{
              background: CRUD.couleurs.fondBandeau,
              color: CRUD.couleurs.texteBandeau,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            État
          </Box>

          {deleteMutation.isPending ? (
            <Center style={{ minHeight: 120 }}>
              <Loader size="sm" />
            </Center>
          ) : (
            <Center style={{ minHeight: 120 }}>
              <Text c={TEXT_MUTED}>
                {deleteMutation.data
                  ? `${deleteMutation.data.deletedCount} opération(s) supprimée(s) pour le relevé "${deleteMutation.data.statementRef}".`
                  : 'Aucune suppression lancée.'}
              </Text>
            </Center>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
