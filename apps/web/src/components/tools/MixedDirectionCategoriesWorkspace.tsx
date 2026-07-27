'use client';

import { useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useMixedDirectionCategories, type MixedDirectionAnomalyRow } from '@/hooks/useCategories';
import { openSecondaryTab } from '@/lib/secondary-tab';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

const SOURCE_LABELS: Record<MixedDirectionAnomalyRow['source'], string> = {
  operation: 'Opération',
  operationSplit: 'Opération ventilée',
  subscription: 'Abonnement',
  subscriptionSplit: 'Abonnement ventilé',
  thirdPartySplit: 'Tiers ventilé',
};

function formatAmount(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDefaultDateFrom() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return toIsoDate(date);
}

function openRow(row: MixedDirectionAnomalyRow) {
  switch (row.source) {
    case 'operation':
    case 'operationSplit': {
      if (!row.accountId) return;
      const params = new URLSearchParams();
      params.set('accountId', row.accountId);
      params.set('operationId', row.openId);
      params.set('highlight', row.openId);
      openSecondaryTab(`/operations?${params.toString()}`);
      return;
    }
    case 'subscription':
    case 'subscriptionSplit':
      openSecondaryTab(`/abonnements/${row.openId}`);
      return;
    case 'thirdPartySplit':
      openSecondaryTab(`/referentiels/tiers/${row.openId}`);
      return;
  }
}

export function MixedDirectionCategoriesWorkspace() {
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(() => toIsoDate(new Date()));
  const query = useMixedDirectionCategories({ dateFrom, dateTo });
  const items = query.data?.items ?? [];

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Catégories en anomalie de sens</Text>

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
            Traitement
          </Box>

          <Stack gap={16} style={{ padding: '18px 20px' }}>
            {query.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{query.error?.message}</Text>
              </Alert>
            ) : null}

            <Text fz={13} c={TEXT_MUTED}>
              Recherche, sur la période choisie, le détail des mouvements (opérations, opérations ventilées,
              abonnements, abonnements ventilés, tiers ventilés) dont le sens (dépense ou recette) contredit le
              sens configuré de leur catégorie — chaque ligne peut être ouverte pour être corrigée. Les
              abonnements et tiers ventilés ne sont pas filtrés par date (peu nombreux, toujours actifs).
            </Text>

            <Group align="end">
              <Box style={{ minWidth: 160 }}>
                <Text fz={13} fw={600} mb={6}>Du</Text>
                <TextInput type="date" value={dateFrom} onChange={event => setDateFrom(event.currentTarget.value)} />
              </Box>
              <Box style={{ minWidth: 160 }}>
                <Text fz={13} fw={600} mb={6}>Au</Text>
                <TextInput type="date" value={dateTo} onChange={event => setDateTo(event.currentTarget.value)} />
              </Box>
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => query.refetch()}
                loading={query.isFetching}
              >
                Lancer la recherche
              </Button>
            </Group>
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
            Résultat {items.length > 0 ? `(${items.length})` : ''}
          </Box>

          {query.isFetching ? (
            <Center style={{ minHeight: 160 }}>
              <Loader size="sm" />
            </Center>
          ) : !query.data ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Lance la recherche pour afficher le résultat.</Text>
            </Center>
          ) : items.length === 0 ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Aucune anomalie trouvée sur cette période.</Text>
            </Center>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <Table
                styles={{
                  th: { padding: '6px 10px', fontSize: 12, borderBottom: `1px solid ${GRAY_BORDER}` },
                  td: { padding: '5px 10px', fontSize: 12, borderBottom: `1px solid ${GRAY_BORDER}` },
                }}
              >
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Compte</Table.Th>
                    <Table.Th>Libellé</Table.Th>
                    <Table.Th>TM</Table.Th>
                    <Table.Th>Catégorie</Table.Th>
                    <Table.Th>Sens catégorie</Table.Th>
                    <Table.Th>Sens mouvement</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Montant</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map(item => (
                    <Table.Tr key={`${item.source}-${item.id}`}>
                      <Table.Td>{formatDate(item.date)}</Table.Td>
                      <Table.Td>{SOURCE_LABELS[item.source]}</Table.Td>
                      <Table.Td>{item.accountName ?? '—'}</Table.Td>
                      <Table.Td style={{ maxWidth: 260 }}>
                        <Text fz={12} truncate title={item.label}>{item.label}</Text>
                      </Table.Td>
                      <Table.Td>{item.movementTypeLabel ?? '—'}</Table.Td>
                      <Table.Td>{item.categoryLabel}</Table.Td>
                      <Table.Td>
                        {item.categoryDirection === 'expense' ? 'Dépense' : item.categoryDirection === 'income' ? 'Recette' : '—'}
                      </Table.Td>
                      <Table.Td c="orange">
                        {item.amountDirection === 'expense' ? 'Dépense' : 'Recette'}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatAmount(item.amount)}</Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <Button size="xs" variant="outline" onClick={() => openRow(item)}>
                            Ouvrir
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            color="grape"
                            onClick={() => openSecondaryTab(`/referentiels/categories/${item.categoryId}`)}
                          >
                            Catégorie
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
