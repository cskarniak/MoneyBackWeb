'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, Alert, Box, Button, Center, Group, Loader, Stack, Table, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconBug, IconCheck, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { useAccountsAll } from '@/hooks/useAccounts';
import {
  useCheckMissingDueDate,
  useCheckMissingSplits,
  useCheckUnexpectedSplits,
  useCheckDuplicateOperations,
  useCheckOrphanReferences,
  useCheckZeroAmount,
  useCheckPartialSplit,
  useCheckSplitMismatch,
  useCheckBalanceField,
  type MissingDueDateResult,
  type MissingSplitsResult,
  type UnexpectedSplitsResult,
  type DuplicateOperationResult,
  type OrphanReferenceResult,
  type ZeroAmountResult,
  type PartialSplitResult,
  type SplitMismatchResult,
  type BalanceFieldResult,
} from '@/hooks/useAnomalies';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const LOG_TABLE_FONT_SIZE = 11;
const COMPACT_CELL: React.CSSProperties = { padding: '2px 6px', lineHeight: 1.3 };
const COMPACT_CELL_RIGHT: React.CSSProperties = { ...COMPACT_CELL, textAlign: 'right' };

function defaultDateFrom() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

function operationHref(accountId: string, operationId: string) {
  return `/operations?accountId=${accountId}&operationId=${operationId}&highlight=${operationId}`;
}

function OperationLink({ accountId, operationId, label }: { accountId: string; operationId: string; label: string }) {
  return (
    <Anchor
      href={operationHref(accountId, operationId)}
      target="_blank"
      rel="noopener noreferrer"
      fz={LOG_TABLE_FONT_SIZE}
      style={{ whiteSpace: 'nowrap' }}
    >
      {label}
    </Anchor>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatAmount(expense: number, income: number) {
  if (expense > 0) return `-${expense.toFixed(2)}`;
  if (income > 0) return `+${income.toFixed(2)}`;
  return '0.00';
}

function formatDiff(value: number) {
  if (value === 0) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function PanelBox({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
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
        <Group gap={8}>
          {icon}
          {title}
        </Group>
      </Box>
      {children}
    </Box>
  );
}

export function AnomaliesWorkspace() {
  const router = useRouter();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const missingDueDateMutation = useCheckMissingDueDate();
  const missingSplitsMutation = useCheckMissingSplits();
  const unexpectedSplitsMutation = useCheckUnexpectedSplits();
  const duplicatesMutation = useCheckDuplicateOperations();
  const orphanRefsMutation = useCheckOrphanReferences();
  const zeroAmountMutation = useCheckZeroAmount();
  const partialSplitMutation = useCheckPartialSplit();
  const splitMismatchMutation = useCheckSplitMismatch();
  const balanceFieldMutation = useCheckBalanceField();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dueDateResult, setDueDateResult] = useState<MissingDueDateResult | null>(null);
  const [missingSplitsResult, setMissingSplitsResult] = useState<MissingSplitsResult | null>(null);
  const [unexpectedSplitsResult, setUnexpectedSplitsResult] = useState<UnexpectedSplitsResult | null>(null);
  const [duplicatesResult, setDuplicatesResult] = useState<DuplicateOperationResult | null>(null);
  const [orphanRefsResult, setOrphanRefsResult] = useState<OrphanReferenceResult | null>(null);
  const [zeroAmountResult, setZeroAmountResult] = useState<ZeroAmountResult | null>(null);
  const [partialSplitResult, setPartialSplitResult] = useState<PartialSplitResult | null>(null);
  const [splitResult, setSplitResult] = useState<SplitMismatchResult | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceFieldResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const accountOptions = accounts.map(a => ({ value: a.id, label: a.name }));
  const isAnalyzing = missingDueDateMutation.isPending || missingSplitsMutation.isPending || unexpectedSplitsMutation.isPending || duplicatesMutation.isPending || orphanRefsMutation.isPending || zeroAmountMutation.isPending || partialSplitMutation.isPending || splitMismatchMutation.isPending || balanceFieldMutation.isPending;

  const handleAnalyze = async () => {
    setSubmitted(true);
    const params = { accountId: accountId ?? undefined, dateFrom: dateFrom || undefined };
    try {
      const [dueDateRes, missingSplitsRes, unexpectedSplitsRes, duplicatesRes, orphanRefsRes, zeroAmountRes, partialSplitRes, splitRes, balanceRes] = await Promise.all([
        missingDueDateMutation.mutateAsync({ ...params, applyFix: false }),
        missingSplitsMutation.mutateAsync(params),
        unexpectedSplitsMutation.mutateAsync(params),
        duplicatesMutation.mutateAsync({ ...params, applyFix: false }),
        orphanRefsMutation.mutateAsync(params),
        zeroAmountMutation.mutateAsync(params),
        partialSplitMutation.mutateAsync(params),
        splitMismatchMutation.mutateAsync(params),
        balanceFieldMutation.mutateAsync({ ...params, applyFix: false }),
      ]);
      setDueDateResult(dueDateRes);
      setMissingSplitsResult(missingSplitsRes);
      setUnexpectedSplitsResult(unexpectedSplitsRes);
      setDuplicatesResult(duplicatesRes);
      setOrphanRefsResult(orphanRefsRes);
      setZeroAmountResult(zeroAmountRes);
      setPartialSplitResult(partialSplitRes);
      setSplitResult(splitRes);
      setBalanceResult(balanceRes);
      const totalAnomalies = dueDateRes.anomalyCount + missingSplitsRes.anomalyCount + unexpectedSplitsRes.anomalyCount + duplicatesRes.anomalyCount + orphanRefsRes.anomalyCount + zeroAmountRes.anomalyCount + partialSplitRes.anomalyCount + splitRes.anomalyCount + balanceRes.anomalyCount;
      notifications.show({
        color: totalAnomalies > 0 ? 'orange' : 'green',
        message: totalAnomalies > 0
          ? `${totalAnomalies} anomalie(s) détectée(s).`
          : 'Aucune anomalie détectée.',
      });
    } catch {
      // error handled by mutation state
    }
  };

  const handleFixDueDate = async () => {
    if (!dueDateResult || dueDateResult.anomalyCount === 0) return;
    if (!window.confirm(`Corriger ${dueDateResult.anomalyCount} opération(s) en reportant la date d'opération vers la date d'échéance ?`)) return;
    try {
      const fixRes = await missingDueDateMutation.mutateAsync({
        accountId: accountId ?? undefined,
        dateFrom: dateFrom || undefined,
        applyFix: true,
      });
      notifications.show({
        color: 'green',
        message: `${fixRes.fixedCount} opération(s) corrigée(s).`,
      });
      const freshRes = await missingDueDateMutation.mutateAsync({
        accountId: accountId ?? undefined,
        dateFrom: dateFrom || undefined,
        applyFix: false,
      });
      setDueDateResult(freshRes);
    } catch {
      // error handled by mutation state
    }
  };

  const handleFixBalance = async () => {
    if (!balanceResult || balanceResult.anomalyCount === 0) return;
    if (!window.confirm(`Recalculer le solde de ${balanceResult.anomalyCount} enregistrement(s) ?`)) return;
    try {
      const fixRes = await balanceFieldMutation.mutateAsync({
        accountId: accountId ?? undefined,
        dateFrom: dateFrom || undefined,
        applyFix: true,
      });
      notifications.show({
        color: 'green',
        message: `${fixRes.fixedCount} enregistrement(s) corrigé(s).`,
      });
      const freshRes = await balanceFieldMutation.mutateAsync({
        accountId: accountId ?? undefined,
        dateFrom: dateFrom || undefined,
        applyFix: false,
      });
      setBalanceResult(freshRes);
    } catch {
      // error handled by mutation state
    }
  };

  const handleFixDuplicates = async () => {
    if (!duplicatesResult || duplicatesResult.anomalyCount === 0) return;
    if (!window.confirm(`Annoter les doublons avec "opération 2", "opération 3"... dans le commentaire ?`)) return;
    try {
      const fixRes = await duplicatesMutation.mutateAsync({
        accountId: accountId ?? undefined,
        dateFrom: dateFrom || undefined,
        applyFix: true,
      });
      notifications.show({
        color: 'green',
        message: `${fixRes.fixedCount} opération(s) annotée(s).`,
      });
      const freshRes = await duplicatesMutation.mutateAsync({
        accountId: accountId ?? undefined,
        dateFrom: dateFrom || undefined,
        applyFix: false,
      });
      setDuplicatesResult(freshRes);
    } catch {
      // error handled by mutation state
    }
  };

  const anyError = missingDueDateMutation.isError || missingSplitsMutation.isError || unexpectedSplitsMutation.isError || duplicatesMutation.isError || orphanRefsMutation.isError || zeroAmountMutation.isError || partialSplitMutation.isError || splitMismatchMutation.isError || balanceFieldMutation.isError;
  const errorMessage = missingDueDateMutation.error?.message || missingSplitsMutation.error?.message || unexpectedSplitsMutation.error?.message || duplicatesMutation.error?.message || orphanRefsMutation.error?.message || zeroAmountMutation.error?.message || partialSplitMutation.error?.message || splitMismatchMutation.error?.message || balanceFieldMutation.error?.message;

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={12} style={{ maxWidth: 1298, margin: '0 auto' }}>
        <Group justify="space-between" align="center">
          <Text fw={700} fz={22}>Détection et correction des anomalies</Text>
          <Button variant="subtle" size="xs" onClick={() => router.push('/')}>Fermer</Button>
        </Group>

        {/* ── Paramètres ── */}
        <PanelBox title="Paramètres">
          <Stack gap={16} style={{ padding: '18px 20px' }}>
            {anyError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{errorMessage}</Text>
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
                label="Opérations depuis le"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.currentTarget.value)}
              />
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={handleAnalyze}
                loading={isAnalyzing}
              >
                Lancer l'analyse
              </Button>
            </Group>

            <Text fz={13} c={TEXT_MUTED}>
              L'analyse détecte les anomalies sans modifier la base. Les corrections ne sont appliquées qu'après confirmation.
            </Text>
          </Stack>
        </PanelBox>

        {/* ── Résultat : date d'échéance manquante ── */}
        <PanelBox title="Date d'échéance manquante" icon={<IconBug size={16} />}>
          {missingDueDateMutation.isPending ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !dueDateResult ? (
            <Center style={{ minHeight: 140 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Box>
                  <Text fw={600}>
                    {dueDateResult.applied
                      ? `${dueDateResult.fixedCount} opération(s) corrigée(s)`
                      : `${dueDateResult.anomalyCount} anomalie(s) détectée(s)`}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Correction : reporter la date d'opération vers la date d'échéance
                  </Text>
                  {dueDateResult.applied ? (
                    <Text c="green" fz={13} fw={600}>
                      <IconCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Corrections appliquées
                    </Text>
                  ) : null}
                </Box>
                {!dueDateResult.applied && dueDateResult.anomalyCount > 0 ? (
                  <Button
                    color="green"
                    onClick={handleFixDueDate}
                    loading={missingDueDateMutation.isPending}
                  >
                    Corriger les anomalies
                  </Button>
                ) : null}
              </Group>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Montant</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date échéance</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {dueDateResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    dueDateResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>
                          {formatAmount(item.expense, item.income)}
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text c="red" fz={LOG_TABLE_FONT_SIZE}>absente</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : ventilation absente ── */}
        <PanelBox title="Opération ventilée sans lignes de ventilation" icon={<IconBug size={16} />}>
          {missingSplitsMutation.isPending ? (
            <Center style={{ minHeight: 100 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !missingSplitsResult ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>
                  {missingSplitsResult.anomalyCount} anomalie(s) détectée(s) sur {missingSplitsResult.scannedCount} opération(s) ventilée(s)
                </Text>
                <Text c={TEXT_MUTED} fz={13}>
                  Opérations marquées ventilées (type V) mais sans aucune ligne de ventilation
                </Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Dépense</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Recette</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {missingSplitsResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    missingSplitsResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.expense.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.income.toFixed(2)}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : ventilation inattendue ── */}
        <PanelBox title="Ventilation sur opération non ventilée" icon={<IconBug size={16} />}>
          {unexpectedSplitsMutation.isPending ? (
            <Center style={{ minHeight: 100 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !unexpectedSplitsResult ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>
                  {unexpectedSplitsResult.anomalyCount} anomalie(s) détectée(s) sur {unexpectedSplitsResult.scannedCount} opération(s) non ventilée(s)
                </Text>
                <Text c={TEXT_MUTED} fz={13}>
                  Opérations non marquées ventilées mais possédant des lignes de ventilation
                </Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Type opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Nb ventilations</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {unexpectedSplitsResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    unexpectedSplitsResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text c="orange" fz={LOG_TABLE_FONT_SIZE}>{item.operationType ?? 'aucun'}</Text>
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.splitCount}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : références orphelines ── */}
        <PanelBox title="Références orphelines (enveloppe, tiers, catégorie)" icon={<IconBug size={16} />}>
          {orphanRefsMutation.isPending ? (
            <Center style={{ minHeight: 100 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !orphanRefsResult ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>
                  {orphanRefsResult.anomalyCount} anomalie(s) détectée(s) sur {orphanRefsResult.scannedCount} enregistrement(s)
                </Text>
                <Text c={TEXT_MUTED} fz={13}>
                  Enveloppe, tiers ou catégorie référencée mais supprimée ou inexistante
                </Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Type</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Référence manquante</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Source</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {orphanRefsResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    orphanRefsResult.items.map((item, idx) => (
                      <Table.Tr key={`${item.operationId}-${item.referenceType}-${item.source}-${idx}`}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text c="red" fz={LOG_TABLE_FONT_SIZE} fw={600}>{item.referenceType}</Text>
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text c={TEXT_MUTED} fz={9}>{item.referenceId}</Text>
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text fz={LOG_TABLE_FONT_SIZE} c={item.source === 'ventilation' ? 'violet' : undefined}>
                            {item.source === 'operation' ? 'Opération' : 'Ventilation'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : doublons ── */}
        <PanelBox title="Écritures en double" icon={<IconBug size={16} />}>
          {duplicatesMutation.isPending ? (
            <Center style={{ minHeight: 100 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !duplicatesResult ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Box>
                  <Text fw={600}>
                    {duplicatesResult.applied
                      ? `${duplicatesResult.fixedCount} opération(s) annotée(s)`
                      : `${duplicatesResult.anomalyCount} opération(s) en double sur ${duplicatesResult.scannedCount} opération(s)`}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Même date, libellé et montant sur le même compte — annotation « opération N » sur les doublons
                  </Text>
                  {duplicatesResult.applied ? (
                    <Text c="green" fz={13} fw={600}>
                      <IconCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Annotations appliquées
                    </Text>
                  ) : null}
                </Box>
                {!duplicatesResult.applied && duplicatesResult.anomalyCount > 0 ? (
                  <Button
                    color="green"
                    onClick={handleFixDuplicates}
                    loading={duplicatesMutation.isPending}
                  >
                    Annoter les doublons
                  </Button>
                ) : null}
              </Group>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Dépense</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Recette</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Commentaire</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Nb</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {duplicatesResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    duplicatesResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.expense.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.income.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text c={TEXT_MUTED} fz={LOG_TABLE_FONT_SIZE}>{item.comment ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>
                          <Text c="orange" fz={LOG_TABLE_FONT_SIZE} fw={600}>{item.duplicateCount}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : montant à zéro ── */}
        <PanelBox title="Opération avec montant à zéro" icon={<IconBug size={16} />}>
          {zeroAmountMutation.isPending ? (
            <Center style={{ minHeight: 100 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !zeroAmountResult ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>
                  {zeroAmountResult.anomalyCount} anomalie(s) détectée(s)
                </Text>
                <Text c={TEXT_MUTED} fz={13}>
                  Opérations avec dépense = 0 et recette = 0
                </Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {zeroAmountResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={3} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    zeroAmountResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : ventilation partielle non marquée ── */}
        <PanelBox title="Ventilation partielle non marquée P" icon={<IconBug size={16} />}>
          {partialSplitMutation.isPending ? (
            <Center style={{ minHeight: 100 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !partialSplitResult ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>
                  {partialSplitResult.anomalyCount} anomalie(s) détectée(s) sur {partialSplitResult.scannedCount} opération(s) avec ventilation
                </Text>
                <Text c={TEXT_MUTED} fz={13}>
                  Opérations dont les ventilations ne couvrent pas le montant total mais non marquées P
                </Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Type</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Solde opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Solde ventilations</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {partialSplitResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    partialSplitResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text c="orange" fz={LOG_TABLE_FONT_SIZE}>{item.operationType ?? 'aucun'}</Text>
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.operationBalance.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.splitsBalance.toFixed(2)}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : écart ventilation ── */}
        <PanelBox title="Écart entre opération et ventilations" icon={<IconBug size={16} />}>
          {splitMismatchMutation.isPending ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !splitResult ? (
            <Center style={{ minHeight: 140 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>
                  {splitResult.anomalyCount} anomalie(s) détectée(s) sur {splitResult.scannedCount} opération(s) ventilée(s)
                </Text>
                <Text c={TEXT_MUTED} fz={13}>
                  Comparaison du montant de l'opération avec la somme des lignes de ventilation
                </Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Solde opération</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Solde ventilations</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Écart</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {splitResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    splitResult.items.map(item => (
                      <Table.Tr key={item.operationId}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.operationBalance.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.splitsBalance.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>
                          <Text c="red" fz={LOG_TABLE_FONT_SIZE} fw={600}>
                            {formatDiff(item.diff)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>

        {/* ── Résultat : champ solde incohérent ── */}
        <PanelBox title="Champ solde incohérent" icon={<IconBug size={16} />}>
          {balanceFieldMutation.isPending ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : !submitted || !balanceResult ? (
            <Center style={{ minHeight: 140 }}>
              <Text c={TEXT_MUTED}>Aucune analyse lancée.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '8px 10px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Box>
                  <Text fw={600}>
                    {balanceResult.applied
                      ? `${balanceResult.fixedCount} enregistrement(s) corrigé(s)`
                      : `${balanceResult.anomalyCount} anomalie(s) détectée(s) sur ${balanceResult.scannedCount} enregistrement(s)`}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Vérification : solde stocké = recette − dépense (opérations et ventilations)
                  </Text>
                  {balanceResult.applied ? (
                    <Text c="green" fz={13} fw={600}>
                      <IconCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Corrections appliquées
                    </Text>
                  ) : null}
                </Box>
                {!balanceResult.applied && balanceResult.anomalyCount > 0 ? (
                  <Button
                    color="green"
                    onClick={handleFixBalance}
                    loading={balanceFieldMutation.isPending}
                  >
                    Corriger les anomalies
                  </Button>
                ) : null}
              </Group>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: LOG_TABLE_FONT_SIZE }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Type</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Compte</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Date</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>Libellé</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Dépense</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Recette</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Solde stocké</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Solde attendu</Table.Th>
                    <Table.Th fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>Écart</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {balanceResult.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <Text c={TEXT_MUTED}>Aucune anomalie détectée.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    balanceResult.items.map(item => (
                      <Table.Tr key={item.id}>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>
                          <Text fz={LOG_TABLE_FONT_SIZE} c={item.source === 'ventilation' ? 'violet' : undefined}>
                            {item.source === 'operation' ? 'Opération' : 'Ventilation'}
                          </Text>
                        </Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{item.accountName}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}>{formatDate(item.operationDate)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL}><OperationLink accountId={item.accountId} operationId={item.operationId} label={item.label} /></Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.expense.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.income.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.storedBalance.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>{item.expectedBalance.toFixed(2)}</Table.Td>
                        <Table.Td fz={LOG_TABLE_FONT_SIZE} style={COMPACT_CELL_RIGHT}>
                          <Text c="red" fz={LOG_TABLE_FONT_SIZE} fw={600}>
                            {formatDiff(item.diff)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </PanelBox>
      </Stack>
    </Box>
  );
}
