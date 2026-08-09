'use client';

import { Alert, Anchor, Box, Center, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useBudgetBalanceAnomalies, type Enveloppe } from '@/hooks/useEnveloppes';
import { openSecondaryTab } from '@/lib/secondary-tab';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

function formatAmount(value: string) {
  return Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null) {
  if (!value) return 'jamais recalculé';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatExpectedRange(item: Enveloppe) {
  const min = item.expectedBalanceMin;
  const max = item.expectedBalanceMax;
  if (min != null && max != null && Number(min) === Number(max)) {
    return `= ${formatAmount(min)} €`;
  }
  if (min != null && max != null) return `${formatAmount(min)} € à ${formatAmount(max)} €`;
  if (min != null) return `≥ ${formatAmount(min)} €`;
  if (max != null) return `≤ ${formatAmount(max)} €`;
  return '—';
}

export function BudgetBalanceAnomaliesWorkspace() {
  const { data, isLoading, error } = useBudgetBalanceAnomalies();

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Anomalies de solde enveloppes</Text>

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
            Enveloppes hors de leur plage de solde attendue
          </Box>

          <Stack gap={0} style={{ padding: '18px 20px' }}>
            <Text fz={13} c={TEXT_MUTED} mb={12}>
              Compare le solde persisté de chaque enveloppe (voir l&apos;outil &laquo;&nbsp;Recalcul soldes
              enveloppes&nbsp;&raquo;) à la plage attendue configurée sur sa fiche (&laquo;&nbsp;Solde
              cible&nbsp;&raquo;). Seules les enveloppes actives avec une plage définie sont contrôlées.
            </Text>

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">Erreur lors du chargement des anomalies.</Text>
              </Alert>
            )}

            {isLoading ? (
              <Center style={{ minHeight: 120 }}>
                <Loader size="sm" />
              </Center>
            ) : data && data.total === 0 ? (
              <Center style={{ minHeight: 100 }}>
                <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
              </Center>
            ) : (
              <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th>Enveloppe</Table.Th>
                    <Table.Th>Regroupement</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Solde actuel</Table.Th>
                    <Table.Th>Plage attendue</Table.Th>
                    <Table.Th>Date de calcul</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data?.items.map(item => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.label}</Table.Td>
                      <Table.Td>{item.regroupement?.label ?? '—'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right', color: Number(item.balance) < 0 ? '#e03131' : undefined }}>
                        {formatAmount(item.balance)} €
                      </Table.Td>
                      <Table.Td>{formatExpectedRange(item)}</Table.Td>
                      <Table.Td>{formatDate(item.balanceReferenceDate)}</Table.Td>
                      <Table.Td>
                        <Group gap={12} wrap="nowrap">
                          <Anchor
                            fz={13}
                            onClick={() => openSecondaryTab(`/referentiels/enveloppes/${item.id}`)}
                          >
                            Fiche
                          </Anchor>
                          <Anchor
                            fz={13}
                            onClick={() => openSecondaryTab(`/statistiques?budgetId=${item.id}&autoRun=true`)}
                          >
                            Statistique détaillée
                          </Anchor>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
