'use client';

import { useState } from 'react';
import { Alert, Box, Button, Center, Checkbox, Group, Loader, Modal, ScrollArea, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconListDetails, IconPlayerPlay } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CRUD } from '@/lib/crud-tokens';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useAutoAssignOperationThirdParties } from '@/hooks/useOperationAutoAssign';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const LOG_TABLE_FONT_SIZE = 11;

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatAssignmentRate(rate: number | null) {
  if (rate === null) return 'n/a (aucune opération sans enveloppe)';
  return `${rate.toFixed(1).replace('.', ',')} %`;
}

export function ThirdPartyAutoAssignWorkspace() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const mutation = useAutoAssignOperationThirdParties();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [operationDateFrom, setOperationDateFrom] = useState('');
  const [operationDateTo, setOperationDateTo] = useState('');
  const [onlyWithoutBudget, setOnlyWithoutBudget] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [logOpened, setLogOpened] = useState(false);
  const [lastRunApplied, setLastRunApplied] = useState(false);

  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: account.name,
  }));

  const result = mutation.data;

  const runTreatment = async (applyChanges: boolean) => {
    try {
      setSubmitted(true);
      setLastRunApplied(applyChanges);
      const response = await mutation.mutateAsync({
        accountId: accountId ?? undefined,
        operationDateFrom: operationDateFrom ? toIsoDate(operationDateFrom) : undefined,
        operationDateTo: operationDateTo ? toIsoDate(operationDateTo) : undefined,
        onlyWithoutBudget,
        applyChanges,
      });

      notifications.show({
        color: applyChanges && response.updatedCount > 0 ? 'green' : 'blue',
        message: applyChanges
          ? `Traitement appliqué : ${response.updatedCount} opération(s) mise(s) à jour sur ${response.scannedCount} analysée(s) (taux d’affectation : ${formatAssignmentRate(response.assignmentRate)}).`
          : `Analyse terminée : ${response.matchedCount} correspondance(s) trouvée(s) sur ${response.scannedCount} opération(s) analysée(s) (taux d’affectation : ${formatAssignmentRate(response.assignmentRate)}).`,
      });
    } catch (error) {
      void error;
    }
  };

  const handlePreview = async () => runTreatment(false);

  const handleApply = async () => {
    if (!result || result.matchedCount === 0) return;
    if (!window.confirm('Lancer maintenant le traitement d’affectation avec ces paramètres ?')) return;
    await runTreatment(true);
  };

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1298, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Affectation automatique des tiers</Text>

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
            {mutation.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{mutation.error.message}</Text>
              </Alert>
            ) : null}

            <Group align="end" wrap="wrap">
              <PositioningSelect
                style={{ minWidth: 320 }}
                label="Compte"
                placeholder={loadingAccounts ? 'Chargement des comptes...' : 'Tous les comptes'}
                data={accountOptions}
                value={accountId}
                onChange={setAccountId}
                clearable
              />
              <TextInput
                label="Date opération du"
                type="date"
                value={operationDateFrom}
                onChange={event => setOperationDateFrom(event.currentTarget.value)}
              />
              <TextInput
                label="au"
                type="date"
                value={operationDateTo}
                onChange={event => setOperationDateTo(event.currentTarget.value)}
              />
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={handlePreview}
                loading={mutation.isPending}
              >
                Analyser et afficher le log
              </Button>
            </Group>

            <Checkbox
              label="Cibler uniquement les opérations sans enveloppe"
              checked={onlyWithoutBudget}
              onChange={event => setOnlyWithoutBudget(event.currentTarget.checked)}
            />

            <Text fz={13} c={TEXT_MUTED}>
              Le premier lancement n’écrit rien en base : il analyse les libellés avec les règles définies sur les fiches tiers
              et affiche le log, puis tu peux confirmer l’application.
              {onlyWithoutBudget
                ? ' Le traitement cible uniquement les opérations sans enveloppe.'
                : ' Décoché : toutes les opérations sont réanalysées, y compris celles déjà affectées — utile après correction d’une règle.'}
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
            Résultat
          </Box>

          {mutation.isPending ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !result ? (
            <Center style={{ minHeight: 140 }}>
              <Text c={TEXT_MUTED}>Aucun traitement lancé.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Box>
                  <Text fw={600}>
                    {result.applyChanges ? `${result.updatedCount} opération(s) mise(s) à jour` : `${result.matchedCount} correspondance(s) prêtes à être appliquées`}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    {result.matchedCount} match(s) sur {result.scannedCount} opération(s) analysée(s)
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Opérations sans enveloppe : {result.beforeWithoutBudgetCount} avant traitement, {result.afterWithoutBudgetCount} après
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Taux d’affectation ((avant − après) / avant × 100) : {formatAssignmentRate(result.assignmentRate)}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Mode : {result.applyChanges ? 'application réelle' : 'analyse seule'}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Filtre : {result.onlyWithoutBudget ? 'opérations sans enveloppe uniquement' : 'toutes les opérations (y compris déjà affectées)'}
                  </Text>
                </Box>
                <Group gap={8}>
                  <Button
                    variant="default"
                    leftSection={<IconListDetails size={14} />}
                    onClick={() => setLogOpened(true)}
                    disabled={result.details.length === 0}
                  >
                    Voir le log
                  </Button>
                  {!result.applyChanges && (
                    <Button
                      color="green"
                      onClick={handleApply}
                      disabled={result.matchedCount === 0 || mutation.isPending}
                      loading={mutation.isPending && lastRunApplied}
                    >
                      Lancer le traitement
                    </Button>
                  )}
                </Group>
              </Group>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Tiers avant</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Tiers affecté</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Enveloppe avant</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Enveloppe après</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Règle</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Mise à jour</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.details.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '18px 16px' }}>
                        <Text c={TEXT_MUTED}>Aucune correspondance trouvée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    result.details.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.label}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.previousThirdPartyName ?? '—'}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.thirdPartyName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.previousBudgetLabel ?? '—'}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.nextBudgetLabel ?? '—'}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.matchedRuleLabel}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.updated ? 'Oui' : 'Non'}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </Box>

        <Modal
          opened={logOpened}
          onClose={() => setLogOpened(false)}
          title="Log d'affectation des tiers"
          size="xl"
          centered
        >
          <Stack gap={12}>
            <Text size="sm" c={TEXT_MUTED}>
              {result
                ? `${result.matchedCount} correspondance(s) trouvée(s), ${result.updatedCount} opération(s) mise(s) à jour, filtre sans enveloppe: ${result.onlyWithoutBudget ? 'oui' : 'non'}.`
                : 'Aucun log disponible.'}
            </Text>

            <ScrollArea.Autosize mah={520}>
              <Table withTableBorder striped highlightOnHover style={{ fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Tiers avant</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Tiers affecté</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Enveloppe avant</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Enveloppe après</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Règle</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE}>Mise à jour</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {!result || result.details.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '18px 16px' }}>
                        <Text c={TEXT_MUTED}>Aucune ligne de log disponible.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    result.details.map(item => (
                      <Table.Tr key={`log-${item.operationId}`}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.label}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.previousThirdPartyName ?? '—'}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.thirdPartyName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.previousBudgetLabel ?? '—'}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.nextBudgetLabel ?? '—'}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.matchedRuleLabel}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE}>{item.updated ? 'Oui' : 'Non'}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
}
