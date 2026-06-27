'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Radio, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useEnvelopeSummary, type EnvelopeSummaryFilters } from '@/hooks/useEnvelopeSummary';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const NEGATIVE_AMOUNT = '#c92a2a';
const POSITIVE_AMOUNT = '#2b8a3e';

function toIsoDate(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatAmount(value: string) {
  return Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function EnvelopeSummaryWorkspace() {
  const { data: accounts = [] } = useAccountsAll();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<'today' | 'date'>('today');
  const [referenceDateInput, setReferenceDateInput] = useState('');
  const [submittedFilters, setSubmittedFilters] = useState<EnvelopeSummaryFilters | null>(null);

  useEffect(() => {
    setReferenceDateInput(currentValue => currentValue || getTodayInputValue());
  }, []);

  const currentQuery = useEnvelopeSummary(
    submittedFilters
      ? { accountId: submittedFilters.accountId }
      : null,
  );
  const calculatedQuery = useEnvelopeSummary(submittedFilters);

  const accountOptions = useMemo(
    () => accounts.map(account => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const showCalculatedColumn = dateMode === 'date' && submittedFilters?.referenceDate !== undefined;

  const mergedItems = useMemo(() => {
    const currentItems = currentQuery.data?.items ?? [];
    const calculatedItems = calculatedQuery.data?.items ?? [];
    const calculatedMap = new Map(calculatedItems.map(item => [item.budgetId, item]));

    return currentItems
      .map(item => ({
        budgetId: item.budgetId,
        budgetLabel: item.budgetLabel,
        budgetActive: item.budgetActive,
        budgetGroupingLabel: item.budgetGroupingLabel,
        currentBalance: item.totalBalance,
        calculatedBalance: calculatedMap.get(item.budgetId)?.totalBalance ?? null,
      }))
      .filter(item => item.budgetActive || Number(item.currentBalance) !== 0);
  }, [calculatedQuery.data?.items, currentQuery.data?.items]);

  const totalCurrentBalance = useMemo(
    () => mergedItems.reduce((sum, item) => sum + Number(item.currentBalance || 0), 0),
    [mergedItems],
  );
  const totalCalculatedBalance = useMemo(
    () => mergedItems.reduce((sum, item) => sum + Number(item.calculatedBalance || 0), 0),
    [mergedItems],
  );

  const handleRun = () => {
    setSubmittedFilters({
      accountId: accountId ?? undefined,
      referenceDate: dateMode === 'date' ? toIsoDate(referenceDateInput) : undefined,
    });
  };

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 854, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Synthèse par enveloppe</Text>

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
            {(currentQuery.isError || calculatedQuery.isError) ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{currentQuery.error?.message ?? calculatedQuery.error?.message}</Text>
              </Alert>
            ) : null}

            <Group align="end" wrap="wrap">
              <Select
                style={{ minWidth: 320 }}
                label="Compte"
                placeholder="Tous les comptes"
                data={accountOptions}
                value={accountId}
                onChange={setAccountId}
                clearable
                searchable
              />
              <Radio.Group
                label="Période de calcul"
                value={dateMode}
                onChange={value => setDateMode(value as 'today' | 'date')}
              >
                <Group mt={8}>
                  <Radio value="today" label="À ce jour" />
                  <Radio value="date" label="À la date du" />
                </Group>
              </Radio.Group>
              <TextInput
                label="Date de référence"
                type="date"
                value={referenceDateInput}
                onChange={event => setReferenceDateInput(event.currentTarget.value)}
                disabled={dateMode !== 'date'}
              />
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={handleRun}
                loading={currentQuery.isLoading || calculatedQuery.isLoading}
              >
                Calculer
              </Button>
            </Group>

            <Text fz={13} c={TEXT_MUTED}>
              Cette vue correspond à une synthèse agrégée par enveloppe. Les opérations ventilées sont comptées sur leurs lignes
              de ventilation, comme dans l’ancien calcul par poste.
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

          {currentQuery.isLoading || calculatedQuery.isLoading ? (
            <Center style={{ minHeight: 160 }}>
              <Loader size="sm" />
            </Center>
          ) : !submittedFilters ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Lance le calcul pour afficher la synthèse par enveloppe.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Box>
                  <Text fw={600}>{mergedItems.length} enveloppe(s)</Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    Référence calculée : {showCalculatedColumn ? formatDate(calculatedQuery.data?.referenceDate) : '—'}
                  </Text>
                </Box>
                <Group gap={18}>
                  <Text fz={13} c={totalCurrentBalance < 0 ? NEGATIVE_AMOUNT : undefined}>
                    À ce jour: <strong>{formatAmount(String(totalCurrentBalance))}</strong>
                  </Text>
                  {showCalculatedColumn ? (
                    <Text fz={13} c={totalCalculatedBalance < 0 ? NEGATIVE_AMOUNT : undefined}>
                      À la date: <strong>{formatAmount(String(totalCalculatedBalance))}</strong>
                    </Text>
                  ) : null}
                </Group>
              </Group>

              <Table
                style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                styles={{
                  th: {
                    padding: '5px 10px',
                    fontSize: 12,
                    lineHeight: 1.05,
                    borderRight: `1px solid ${GRAY_BORDER}`,
                  },
                  td: {
                    padding: '4px 10px',
                    fontSize: 12,
                    lineHeight: 1.05,
                    borderRight: `1px solid ${GRAY_BORDER}`,
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th style={{ width: '30%' }}>Enveloppe</Table.Th>
                    <Table.Th style={{ width: '27%' }}>Regroupement</Table.Th>
                    <Table.Th style={{ textAlign: 'right', width: '14.5%' }}>Montant à ce jour</Table.Th>
                    <Table.Th style={{ textAlign: 'right', width: '14.5%' }}>Montant date calcul</Table.Th>
                    <Table.Th style={{ textAlign: 'right', width: '14%' }}>Différence</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {mergedItems.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '16px 12px' }}>
                        <Text c={TEXT_MUTED}>Aucune enveloppe trouvée pour les critères sélectionnés.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    mergedItems.map((item, index) => {
                      const rowBackground =
                        index % 2 === 1
                          ? CRUD.couleurs.fondLignePaire
                          : CRUD.couleurs.fondLigneImpaire;
                      const difference =
                        item.calculatedBalance !== null
                          ? Number(item.currentBalance) - Number(item.calculatedBalance)
                          : null;

                      return (
                      <Table.Tr key={item.budgetId}>
                        <Table.Td style={{ background: rowBackground }}>
                          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.budgetLabel}
                          </span>
                        </Table.Td>
                        <Table.Td style={{ background: rowBackground }}>{item.budgetGroupingLabel ?? '—'}</Table.Td>
                        <Table.Td style={{ background: rowBackground, textAlign: 'right', color: Number(item.currentBalance) < 0 ? NEGATIVE_AMOUNT : undefined }}>
                          {formatAmount(item.currentBalance)}
                        </Table.Td>
                        <Table.Td
                          style={{
                            background: rowBackground,
                            textAlign: 'right',
                            color: item.calculatedBalance !== null && Number(item.calculatedBalance) < 0 ? NEGATIVE_AMOUNT : undefined,
                          }}
                        >
                          {showCalculatedColumn && item.calculatedBalance !== null ? formatAmount(item.calculatedBalance) : '—'}
                        </Table.Td>
                        <Table.Td
                          style={{
                            background: rowBackground,
                            textAlign: 'right',
                            color:
                              difference !== null
                                ? difference < 0
                                  ? NEGATIVE_AMOUNT
                                  : difference > 0
                                    ? POSITIVE_AMOUNT
                                    : undefined
                                : undefined,
                          }}
                        >
                          {showCalculatedColumn && difference !== null ? formatAmount(String(difference)) : '—'}
                        </Table.Td>
                      </Table.Tr>
                    );
                    })
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
