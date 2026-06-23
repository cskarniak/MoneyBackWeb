'use client';

import { useMemo, useState } from 'react';
import { Alert, Box, Button, Center, Checkbox, Group, Loader, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconEye, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useGenerateSubscriptions, usePreviewSubscriptionsGeneration } from '@/hooks/useSubscriptions';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function SubscriptionGenerationWorkspace() {
  const previewMutation = usePreviewSubscriptionsGeneration();
  const generateMutation = useGenerateSubscriptions();
  const [dateRef, setDateRef] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitted, setSubmitted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const result = generateMutation.data;
  const preview = previewMutation.data;
  const title = useMemo(
    () => `Génération des abonnements`,
    [],
  );

  const allSelected =
    preview !== undefined
      && preview.items.length > 0
      && selectedIds.length === preview.items.length;

  const handlePreview = async () => {
    setSubmitted(false);
    const data = await previewMutation.mutateAsync({ dateRef: toIsoDate(dateRef) });
    setSelectedIds(data.items.map(item => item.id));
  };

  const handleGenerate = async () => {
    setSubmitted(true);
    await generateMutation.mutateAsync({ dateRef: toIsoDate(dateRef), subscriptionIds: selectedIds });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds(current => (
      checked
        ? [...current, id]
        : current.filter(item => item !== id)
    ));
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? (preview?.items.map(item => item.id) ?? []) : []);
  };

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Text fw={700} fz={22}>{title}</Text>

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
            {(previewMutation.isError || generateMutation.isError) ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{previewMutation.error?.message ?? generateMutation.error?.message}</Text>
              </Alert>
            ) : null}

            <Group align="end">
              <Box style={{ minWidth: 260 }}>
                <Text fz={13} fw={600} mb={6}>Date de référence</Text>
                <TextInput
                  type="date"
                  value={dateRef}
                  onChange={event => setDateRef(event.currentTarget.value)}
                />
              </Box>
              <Button
                variant="default"
                leftSection={<IconEye size={14} />}
                onClick={handlePreview}
                loading={previewMutation.isPending}
              >
                Voir les éligibles
              </Button>
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={handleGenerate}
                loading={generateMutation.isPending}
                disabled={!preview || selectedIds.length === 0}
              >
                Générer
              </Button>
            </Group>

            <Text fz={13} c={TEXT_MUTED}>
              La génération ignore les abonnements inactifs. Les abonnements en simulation restent générables et produisent une écriture explicitement marquée simulation.
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
            Abonnements éligibles
          </Box>

          {previewMutation.isPending ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : !preview ? (
            <Center style={{ minHeight: 140 }}>
              <Text c={TEXT_MUTED}>Lance d’abord l’analyse des abonnements éligibles.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>{preview.totalEligible} abonnement(s) éligible(s)</Text>
                <Checkbox
                  label="Tout cocher"
                  checked={allSelected}
                  onChange={event => toggleAll(event.currentTarget.checked)}
                />
              </Group>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <Table.Thead>
                    <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                      <Table.Th>Sélection</Table.Th>
                      <Table.Th>Abonnement</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Compte</Table.Th>
                      <Table.Th>Tiers</Table.Th>
                      <Table.Th>Périodicité</Table.Th>
                      <Table.Th>Échéance</Table.Th>
                      <Table.Th>Ventilation</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {preview.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '18px 16px' }}>
                        <Text c={TEXT_MUTED}>Aucun abonnement éligible pour cette date.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    preview.items.map(item => (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onChange={event => toggleSelected(item.id, event.currentTarget.checked)}
                          />
                        </Table.Td>
                        <Table.Td>{item.label}</Table.Td>
                        <Table.Td>{item.subscriptionType === 'simulation' ? 'Simulation' : 'Réel'}</Table.Td>
                        <Table.Td>{item.account.name}</Table.Td>
                        <Table.Td>{item.thirdParty?.name ?? '—'}</Table.Td>
                        <Table.Td>{item.periodicity}</Table.Td>
                        <Table.Td>{formatDate(item.nextDueDate)}</Table.Td>
                        <Table.Td>{item.hasSplits ? `${item.splitCount} ligne(s)` : 'Non ventilé'}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
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

          {generateMutation.isPending ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !result ? (
            <Center style={{ minHeight: 140 }}>
              <Text c={TEXT_MUTED}>Aucune génération lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>{result.generatedOperations} opération(s) générée(s)</Text>
                <Text c={TEXT_MUTED} fz={13}>{result.subscriptionsProcessed} abonnement(s) traité(s)</Text>
              </Group>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th>Abonnement</Table.Th>
                    <Table.Th>Générées</Table.Th>
                    <Table.Th>Dernière échéance</Table.Th>
                    <Table.Th>Prochaine échéance</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4} style={{ textAlign: 'center', padding: '18px 16px' }}>
                        <Text c={TEXT_MUTED}>Aucun abonnement à générer pour cette date.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    result.items.map(item => (
                      <Table.Tr key={item.id}>
                        <Table.Td>{item.label}</Table.Td>
                        <Table.Td>{item.generated}</Table.Td>
                        <Table.Td>{formatDate(item.lastDueDate)}</Table.Td>
                        <Table.Td>{formatDate(item.nextDueDate)}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
