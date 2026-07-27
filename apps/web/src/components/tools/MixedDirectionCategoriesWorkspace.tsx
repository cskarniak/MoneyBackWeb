'use client';

import Link from 'next/link';
import { Alert, Box, Button, Center, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useMixedDirectionCategories } from '@/hooks/useCategories';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

function formatAmount(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MixedDirectionCategoriesWorkspace() {
  const query = useMixedDirectionCategories();
  const items = query.data?.items ?? [];

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Catégories en dépense et en recette</Text>

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
              Recherche les catégories qui portent à la fois des mouvements en dépense et des mouvements en
              recette (opérations, opérations ventilées, abonnements, abonnements ventilés, tiers ventilés) —
              une catégorie ne devant désormais être que d&apos;un seul sens, il faut migrer ces mouvements
              vers deux catégories distinctes.
            </Text>

            <Group>
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
            Résultat
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
              <Text c={TEXT_MUTED}>Aucune catégorie mixte trouvée.</Text>
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
                    <Table.Th>Catégorie</Table.Th>
                    <Table.Th>Actif</Table.Th>
                    <Table.Th>Sens configuré</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Mouvements dépense</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Total dépense</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Mouvements recette</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Total recette</Table.Th>
                    <Table.Th>Sources</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map(item => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.label}</Table.Td>
                      <Table.Td>{item.active ? 'Oui' : 'Non'}</Table.Td>
                      <Table.Td>
                        {item.expenseFlag ? 'Dépense' : item.incomeFlag ? 'Recette' : '—'}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{item.expenseCount}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatAmount(item.expenseTotal)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{item.incomeCount}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatAmount(item.incomeTotal)}</Table.Td>
                      <Table.Td>{item.sources.join(', ')}</Table.Td>
                      <Table.Td>
                        <Button component={Link} href={`/referentiels/categories/${item.id}`} target="_blank" size="xs" variant="outline">
                          Ouvrir
                        </Button>
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
