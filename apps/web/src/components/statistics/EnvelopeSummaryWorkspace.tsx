'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Center, Checkbox, Group, Loader, Radio, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconChevronDown, IconChevronRight, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useEnvelopeSummary, type EnvelopeSummaryFilters } from '@/hooks/useEnvelopeSummary';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const NEGATIVE_AMOUNT = '#c92a2a';
const POSITIVE_AMOUNT = '#2b8a3e';
const ROW_HOVER_BG = '#eef6ff';
const ROW_ACTIVE_BG = CRUD.couleurs.fondMiseEnEvidenceZoom;

type SortKey = 'budgetLabel' | 'budgetGroupingLabel' | 'currentBalance' | 'calculatedBalance' | 'difference';

function toIsoDate(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: accounts = [] } = useAccountsAll();
  const [isMounted, setIsMounted] = useState(false);
  const [hasAppliedInitialParams, setHasAppliedInitialParams] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<'today' | 'date'>('today');
  const [referenceDateInput, setReferenceDateInput] = useState('');
  const [useDueDate, setUseDueDate] = useState(true);
  const [showOnlyNonZeroDifferences, setShowOnlyNonZeroDifferences] = useState(false);
  const [hideZeroCurrentBalances, setHideZeroCurrentBalances] = useState(false);
  const [groupByGrouping, setGroupByGrouping] = useState(false);
  const [collapsedGroupings, setCollapsedGroupings] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('budgetLabel');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [submittedFilters, setSubmittedFilters] = useState<EnvelopeSummaryFilters | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [highlightedBudgetId, setHighlightedBudgetId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setReferenceDateInput(currentValue => currentValue || getTodayInputValue());
  }, []);

  useEffect(() => {
    if (hasAppliedInitialParams) {
      return;
    }

    const accountIdParam = searchParams.get('accountId');
    const dateModeParam = searchParams.get('dateMode');
    const referenceDateParam = searchParams.get('referenceDate');
    const useDueDateParam = searchParams.get('useDueDate');
    const showOnlyNonZeroDifferencesParam = searchParams.get('showOnlyNonZeroDifferences');
    const hideZeroCurrentBalancesParam = searchParams.get('hideZeroCurrentBalances');
    const groupByGroupingParam = searchParams.get('groupByGrouping');
    const sortKeyParam = searchParams.get('sortKey');
    const sortDirectionParam = searchParams.get('sortDirection');
    const autoRunParam = searchParams.get('autoRun');

    const hasParams = [
      accountIdParam,
      dateModeParam,
      referenceDateParam,
      useDueDateParam,
      showOnlyNonZeroDifferencesParam,
      hideZeroCurrentBalancesParam,
      groupByGroupingParam,
      sortKeyParam,
      sortDirectionParam,
      autoRunParam,
    ].some(value => value !== null);

    if (!hasParams) {
      setHasAppliedInitialParams(true);
      return;
    }

    if (accountIdParam) {
      setAccountId(accountIdParam);
    }

    if (dateModeParam === 'today' || dateModeParam === 'date') {
      setDateMode(dateModeParam);
    }

    if (referenceDateParam) {
      setReferenceDateInput(referenceDateParam);
    }

    if (useDueDateParam !== null) {
      setUseDueDate(useDueDateParam === 'true');
    }

    if (showOnlyNonZeroDifferencesParam !== null) {
      setShowOnlyNonZeroDifferences(showOnlyNonZeroDifferencesParam === 'true');
    }

    if (hideZeroCurrentBalancesParam !== null) {
      setHideZeroCurrentBalances(hideZeroCurrentBalancesParam === 'true');
    }

    if (groupByGroupingParam !== null) {
      setGroupByGrouping(groupByGroupingParam === 'true');
    }

    if (
      sortKeyParam === 'budgetLabel'
      || sortKeyParam === 'budgetGroupingLabel'
      || sortKeyParam === 'currentBalance'
      || sortKeyParam === 'calculatedBalance'
      || sortKeyParam === 'difference'
    ) {
      setSortKey(sortKeyParam);
    }

    if (sortDirectionParam === 'asc' || sortDirectionParam === 'desc') {
      setSortDirection(sortDirectionParam);
    }

    if (autoRunParam === 'true') {
      setSubmittedFilters({
        accountId: accountIdParam ?? undefined,
        referenceDate: dateModeParam === 'date' && referenceDateParam ? toIsoDate(referenceDateParam) : undefined,
        useDueDate: useDueDateParam === null ? true : useDueDateParam === 'true',
      });
    }

    setHasAppliedInitialParams(true);
  }, [hasAppliedInitialParams, searchParams]);

  const currentQuery = useEnvelopeSummary(
    submittedFilters
      ? { accountId: submittedFilters.accountId, useDueDate: submittedFilters.useDueDate }
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

  const displayedItems = useMemo(() => {
    let items = mergedItems;

    if (hideZeroCurrentBalances) {
      items = items.filter(item => Number(item.currentBalance) !== 0);
    }

    if (!showCalculatedColumn || !showOnlyNonZeroDifferences) {
      return items;
    }

    return items.filter(item => {
      if (item.calculatedBalance === null) {
        return false;
      }

      return Number(item.currentBalance) - Number(item.calculatedBalance) !== 0;
    });
  }, [hideZeroCurrentBalances, mergedItems, showCalculatedColumn, showOnlyNonZeroDifferences]);

  const sortedItems = useMemo(() => {
    const items = [...displayedItems];

    items.sort((left, right) => {
      const leftDifference = left.calculatedBalance !== null
        ? Number(left.currentBalance) - Number(left.calculatedBalance)
        : 0;
      const rightDifference = right.calculatedBalance !== null
        ? Number(right.currentBalance) - Number(right.calculatedBalance)
        : 0;

      let result = 0;

      switch (sortKey) {
        case 'budgetLabel':
          result = left.budgetLabel.localeCompare(right.budgetLabel, 'fr', { sensitivity: 'base' });
          break;
        case 'budgetGroupingLabel':
          result = (left.budgetGroupingLabel ?? '').localeCompare(right.budgetGroupingLabel ?? '', 'fr', { sensitivity: 'base' });
          break;
        case 'currentBalance':
          result = Number(left.currentBalance) - Number(right.currentBalance);
          break;
        case 'calculatedBalance':
          result = Number(left.calculatedBalance ?? 0) - Number(right.calculatedBalance ?? 0);
          break;
        case 'difference':
          result = leftDifference - rightDifference;
          break;
      }

      if (result === 0) {
        result = left.budgetLabel.localeCompare(right.budgetLabel, 'fr', { sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return items;
  }, [displayedItems, sortDirection, sortKey]);

  const totalCurrentBalance = useMemo(
    () => displayedItems.reduce((sum, item) => sum + Number(item.currentBalance || 0), 0),
    [displayedItems],
  );
  const totalCalculatedBalance = useMemo(
    () => displayedItems.reduce((sum, item) => sum + Number(item.calculatedBalance || 0), 0),
    [displayedItems],
  );
  const totalDifference = useMemo(
    () => displayedItems.reduce((sum, item) => sum + Number(item.currentBalance || 0) - Number(item.calculatedBalance || 0), 0),
    [displayedItems],
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      label: string;
      currentBalance: number;
      calculatedBalance: number;
      difference: number;
      items: typeof sortedItems;
    }>();

    sortedItems.forEach(item => {
      const label = item.budgetGroupingLabel ?? 'Sans regroupement';
      const key = item.budgetGroupingLabel ?? '__none__';
      const currentBalance = Number(item.currentBalance || 0);
      const calculatedBalance = Number(item.calculatedBalance || 0);
      const difference = currentBalance - calculatedBalance;

      const existing = groups.get(key);
      if (existing) {
        existing.currentBalance += currentBalance;
        existing.calculatedBalance += calculatedBalance;
        existing.difference += difference;
        existing.items.push(item);
        return;
      }

      groups.set(key, {
        key,
        label,
        currentBalance,
        calculatedBalance,
        difference,
        items: [item],
      });
    });

    return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label, 'fr', { sensitivity: 'base' }));
  }, [sortedItems]);

  const handleRun = () => {
    setSubmittedFilters({
      accountId: accountId ?? undefined,
      referenceDate: dateMode === 'date' ? toIsoDate(referenceDateInput) : undefined,
      useDueDate,
    });
  };

  const openDetailedStatistics = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    const params = new URLSearchParams();

    params.set('budgetId', budgetId);
    params.set('autoRun', 'true');
    params.set('returnTo', 'envelope-summary');

    if (submittedFilters?.accountId) {
      params.set('accountId', submittedFilters.accountId);
    }

    params.set('returnAccountId', accountId ?? '');
    params.set('returnDateMode', dateMode);
    params.set('returnReferenceDate', referenceDateInput);
    params.set('returnUseDueDate', useDueDate ? 'true' : 'false');
    params.set('returnShowOnlyNonZeroDifferences', showOnlyNonZeroDifferences ? 'true' : 'false');
    params.set('returnHideZeroCurrentBalances', hideZeroCurrentBalances ? 'true' : 'false');
    params.set('returnGroupByGrouping', groupByGrouping ? 'true' : 'false');
    params.set('returnSortKey', sortKey);
    params.set('returnSortDirection', sortDirection);
    params.set('returnAutoRun', submittedFilters !== null ? 'true' : 'false');

    window.open(`/statistiques?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(nextKey);
    setSortDirection('asc');
  };

  const sortIcon = (key: SortKey) => (sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '');

  const toggleGrouping = (groupingKey: string) => {
    setCollapsedGroupings(current =>
      current.includes(groupingKey)
        ? current.filter(key => key !== groupingKey)
        : [...current, groupingKey],
    );
  };

  const areAllGroupingsCollapsed = groupByGrouping && groupedItems.length > 0 && collapsedGroupings.length >= groupedItems.length;

  const toggleAllGroupings = () => {
    if (areAllGroupingsCollapsed) {
      setCollapsedGroupings([]);
      return;
    }

    setCollapsedGroupings(groupedItems.map(group => group.key));
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

            <Group align="end" wrap="nowrap">
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
                disabled={isMounted ? dateMode !== 'date' : undefined}
              />
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={handleRun}
                loading={currentQuery.isLoading || calculatedQuery.isLoading}
                style={{ marginLeft: 'auto' }}
              >
                Calculer
              </Button>
            </Group>

            <Group align="center" wrap="wrap" gap="xl">
              <Checkbox
                label="Calcul sur les dates d'échéance"
                checked={useDueDate}
                onChange={event => setUseDueDate(event.currentTarget.checked)}
              />
              <Checkbox
                label="Afficher seulement les différences non nulles"
                checked={showOnlyNonZeroDifferences}
                onChange={event => setShowOnlyNonZeroDifferences(event.currentTarget.checked)}
                disabled={!showCalculatedColumn}
              />
              <Checkbox
                label="Enlever valeurs nulles dans À ce jour"
                checked={hideZeroCurrentBalances}
                onChange={event => setHideZeroCurrentBalances(event.currentTarget.checked)}
              />
              <Checkbox
                label="Vue par regroupement"
                checked={groupByGrouping}
                onChange={event => setGroupByGrouping(event.currentTarget.checked)}
              />
              <Checkbox
                label="Tout replier"
                checked={areAllGroupingsCollapsed}
                onChange={toggleAllGroupings}
                disabled={!groupByGrouping}
              />
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
                  <Text fw={600}>
                    {groupByGrouping ? `${groupedItems.length} regroupement(s)` : `${sortedItems.length} enveloppe(s)`}
                  </Text>
                  <Text c={TEXT_MUTED} fz={13}>
                    À ce jour : {formatDate(currentQuery.data?.referenceDate)}
                  </Text>
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
                  {showCalculatedColumn ? (
                    <Text
                      fz={13}
                      c={totalDifference < 0 ? NEGATIVE_AMOUNT : totalDifference > 0 ? POSITIVE_AMOUNT : undefined}
                    >
                      Cumul différences: <strong>{formatAmount(String(totalDifference))}</strong>
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
                    textAlign: 'center',
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
                    <Table.Th style={{ width: '30%', cursor: 'pointer' }} onClick={() => handleSort('budgetLabel')}>
                      Enveloppe{sortIcon('budgetLabel')}
                    </Table.Th>
                    <Table.Th style={{ width: '27%', cursor: 'pointer' }} onClick={() => handleSort('budgetGroupingLabel')}>
                      Regroupement{sortIcon('budgetGroupingLabel')}
                    </Table.Th>
                    <Table.Th style={{ width: '14.5%', cursor: 'pointer' }} onClick={() => handleSort('currentBalance')}>
                      Montant à ce jour{sortIcon('currentBalance')}
                    </Table.Th>
                    <Table.Th
                      style={{ width: '14.5%', cursor: showCalculatedColumn ? 'pointer' : 'default' }}
                      onClick={() => showCalculatedColumn && handleSort('calculatedBalance')}
                    >
                      Montant date calcul{sortIcon('calculatedBalance')}
                    </Table.Th>
                    <Table.Th
                      style={{ width: '14%', cursor: showCalculatedColumn ? 'pointer' : 'default' }}
                      onClick={() => showCalculatedColumn && handleSort('difference')}
                    >
                      Différence{sortIcon('difference')}
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedItems.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '16px 12px' }}>
                        <Text c={TEXT_MUTED}>Aucune enveloppe trouvée pour les critères sélectionnés.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    groupByGrouping ? groupedItems.flatMap((group, groupIndex) => {
                      const rowBackground =
                        groupIndex % 2 === 1
                          ? CRUD.couleurs.fondLignePaire
                          : CRUD.couleurs.fondLigneImpaire;
                      const isCollapsed = collapsedGroupings.includes(group.key);

                      const groupRow = (
                        <Table.Tr key={`group-${group.key}`}>
                          <Table.Td style={{ background: rowBackground, fontWeight: 700 }}>
                            <button
                              type="button"
                              onClick={() => toggleGrouping(group.key)}
                              style={{ all: 'unset', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}
                            >
                              {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
                              {group.label}
                            </button>
                          </Table.Td>
                          <Table.Td style={{ background: rowBackground, fontWeight: 700 }}>Regroupement</Table.Td>
                          <Table.Td style={{ background: rowBackground, textAlign: 'right', fontWeight: 700, color: group.currentBalance < 0 ? NEGATIVE_AMOUNT : undefined }}>
                            {formatAmount(String(group.currentBalance))}
                          </Table.Td>
                          <Table.Td style={{ background: rowBackground, textAlign: 'right', fontWeight: 700, color: group.calculatedBalance < 0 ? NEGATIVE_AMOUNT : undefined }}>
                            {showCalculatedColumn ? formatAmount(String(group.calculatedBalance)) : '—'}
                          </Table.Td>
                          <Table.Td
                            style={{
                              background: rowBackground,
                              textAlign: 'right',
                              fontWeight: 700,
                              color: group.difference < 0 ? NEGATIVE_AMOUNT : group.difference > 0 ? POSITIVE_AMOUNT : undefined,
                            }}
                          >
                            {showCalculatedColumn ? formatAmount(String(group.difference)) : '—'}
                          </Table.Td>
                        </Table.Tr>
                      );

                      if (isCollapsed) {
                        return [groupRow];
                      }

                      const detailRows = group.items.map((item, itemIndex) => {
                        const difference =
                          item.calculatedBalance !== null
                            ? Number(item.currentBalance) - Number(item.calculatedBalance)
                            : null;
                        const childBackground = itemIndex % 2 === 1 ? '#f8fafc' : '#ffffff';
                        const rowBackground = selectedBudgetId === item.budgetId
                          ? ROW_ACTIVE_BG
                          : highlightedBudgetId === item.budgetId
                            ? ROW_HOVER_BG
                            : childBackground;

                        return (
                          <Table.Tr
                            key={item.budgetId}
                            onMouseEnter={() => setHighlightedBudgetId(item.budgetId)}
                            onMouseLeave={() => setHighlightedBudgetId(current => (current === item.budgetId ? null : current))}
                          >
                            <Table.Td style={{ background: rowBackground, paddingLeft: 28 }}>
                              <button
                                type="button"
                                onClick={() => openDetailedStatistics(item.budgetId)}
                                onFocus={() => setHighlightedBudgetId(item.budgetId)}
                                onBlur={() => setHighlightedBudgetId(current => (current === item.budgetId ? null : current))}
                                style={{
                                  all: 'unset',
                                  display: 'block',
                                  width: '100%',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  cursor: 'pointer',
                                  color: CRUD.couleurs.fondBandeau,
                                  textDecoration: 'underline',
                                  fontWeight: 600,
                                }}
                                title={`Ouvrir les statistiques détaillées pour ${item.budgetLabel}`}
                              >
                                {item.budgetLabel}
                              </button>
                            </Table.Td>
                            <Table.Td style={{ background: rowBackground }}>{item.budgetGroupingLabel ?? '—'}</Table.Td>
                            <Table.Td style={{ background: rowBackground, textAlign: 'right', color: Number(item.currentBalance) < 0 ? NEGATIVE_AMOUNT : undefined }}>
                              {formatAmount(item.currentBalance)}
                            </Table.Td>
                            <Table.Td style={{ background: rowBackground, textAlign: 'right', color: item.calculatedBalance !== null && Number(item.calculatedBalance) < 0 ? NEGATIVE_AMOUNT : undefined }}>
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
                      });

                      return [groupRow, ...detailRows];
                    }) : sortedItems.map((item, index) => {
                      const rowBackground =
                        index % 2 === 1
                          ? CRUD.couleurs.fondLignePaire
                          : CRUD.couleurs.fondLigneImpaire;
                      const highlightedRowBackground = selectedBudgetId === item.budgetId
                        ? ROW_ACTIVE_BG
                        : highlightedBudgetId === item.budgetId
                          ? ROW_HOVER_BG
                          : rowBackground;
                      const difference =
                        item.calculatedBalance !== null
                          ? Number(item.currentBalance) - Number(item.calculatedBalance)
                          : null;

                      return (
                      <Table.Tr
                        key={item.budgetId}
                        onMouseEnter={() => setHighlightedBudgetId(item.budgetId)}
                        onMouseLeave={() => setHighlightedBudgetId(current => (current === item.budgetId ? null : current))}
                      >
                        <Table.Td style={{ background: highlightedRowBackground }}>
                          <button
                            type="button"
                            onClick={() => openDetailedStatistics(item.budgetId)}
                            onFocus={() => setHighlightedBudgetId(item.budgetId)}
                            onBlur={() => setHighlightedBudgetId(current => (current === item.budgetId ? null : current))}
                            style={{
                              all: 'unset',
                              display: 'block',
                              width: '100%',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer',
                              color: CRUD.couleurs.fondBandeau,
                              textDecoration: 'underline',
                              fontWeight: 600,
                            }}
                            title={`Ouvrir les statistiques détaillées pour ${item.budgetLabel}`}
                          >
                            {item.budgetLabel}
                          </button>
                        </Table.Td>
                        <Table.Td style={{ background: highlightedRowBackground }}>{item.budgetGroupingLabel ?? '—'}</Table.Td>
                        <Table.Td style={{ background: highlightedRowBackground, textAlign: 'right', color: Number(item.currentBalance) < 0 ? NEGATIVE_AMOUNT : undefined }}>
                          {formatAmount(item.currentBalance)}
                        </Table.Td>
                        <Table.Td
                          style={{
                            background: highlightedRowBackground,
                            textAlign: 'right',
                            color: item.calculatedBalance !== null && Number(item.calculatedBalance) < 0 ? NEGATIVE_AMOUNT : undefined,
                          }}
                        >
                          {showCalculatedColumn && item.calculatedBalance !== null ? formatAmount(item.calculatedBalance) : '—'}
                        </Table.Td>
                        <Table.Td
                          style={{
                            background: highlightedRowBackground,
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
