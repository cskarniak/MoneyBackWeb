'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Alert, Box, Button, Center, Checkbox, Group, Loader, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconPlayerPlay, IconSelector } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useGroupingsAll } from '@/hooks/useGroupings';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';
import { useDetailedStatistics, type DetailedStatisticsFilters } from '@/hooks/useDetailedStatistics';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const NEGATIVE_AMOUNT = '#c92a2a';
const TABLE_FONT_SIZE = 12;
const HEADER_FONT_SIZE = 10;
const FILTER_INPUT_SIZE = 'sm';
const LIMIT_OPTIONS = [
  { value: '100', label: '100' },
  { value: '200', label: '200' },
  { value: '500', label: '500' },
];

type DraftFilters = {
  accountId: string | null;
  budgetId: string | null;
  categoryId: string | null;
  thirdPartyId: string | null;
  categoryGroupingId: string | null;
  budgetGroupingId: string | null;
  pieceNumber: string;
  operationDateFrom: string;
  operationDateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  sortByDueDate: boolean;
};

type SortKey =
  | 'accountName'
  | 'operationDate'
  | 'effectiveDueDate'
  | 'pieceNumber'
  | 'label'
  | 'balance'
  | 'thirdPartyName'
  | 'budgetLabel'
  | 'categoryLabel';

type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

function toIsoDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('fr-FR');
}

function formatAmount(value: string) {
  const amount = Number(value || 0);
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAmountColor(value: string) {
  return Number(value || 0) < 0 ? NEGATIVE_AMOUNT : undefined;
}

function renderTruncatedCell(value: string, style: CSSProperties) {
  return (
    <Tooltip label={value} withArrow position="top-start" multiline maw={420} openDelay={150}>
      <span style={{ display: 'block', ...style }}>
        {value}
      </span>
    </Tooltip>
  );
}

function getBaseSortState(sortByDueDate: boolean): SortState {
  return sortByDueDate
    ? { key: 'effectiveDueDate', direction: 'desc' }
    : { key: 'operationDate', direction: 'desc' };
}

export function DetailedStatisticsWorkspace() {
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({
    accountId: null,
    budgetId: null,
    categoryId: null,
    thirdPartyId: null,
    categoryGroupingId: null,
    budgetGroupingId: null,
    pieceNumber: '',
    operationDateFrom: '',
    operationDateTo: '',
    dueDateFrom: '',
    dueDateTo: '',
    sortByDueDate: true,
  });
  const [submittedFilters, setSubmittedFilters] = useState<DetailedStatisticsFilters | null>(null);
  const [sortState, setSortState] = useState<SortState>(getBaseSortState(true));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(200);

  const { data: accounts = [] } = useAccountsAll();
  const { data: enveloppes = [] } = useEnveloppesAll();
  const { data: categories = [] } = useCategoriesAll();
  const { data: thirdParties = [] } = useThirdPartiesAll();
  const { data: groupings = [] } = useGroupingsAll();
  const queryFilters = useMemo(() => (
    submittedFilters === null
      ? null
      : {
        ...submittedFilters,
        page,
        limit,
        sortKey: sortState.key,
        sortDirection: sortState.direction,
      }
  ), [limit, page, sortState.direction, sortState.key, submittedFilters]);
  const statisticsQuery = useDetailedStatistics(queryFilters);

  useEffect(() => {
    if (submittedFilters === null) {
      return;
    }

    setSortState(getBaseSortState(submittedFilters.sortByDueDate ?? true));
  }, [submittedFilters]);

  const accountOptions = accounts.map(account => ({ value: account.id, label: account.name }));
  const enveloppeOptions = enveloppes.map(enveloppe => ({ value: enveloppe.id, label: enveloppe.label }));
  const categoryOptions = categories.map(category => ({ value: category.id, label: category.label }));
  const thirdPartyOptions = thirdParties.map(thirdParty => ({ value: thirdParty.id, label: thirdParty.name }));
  const groupingOptions = groupings.map(grouping => ({ value: grouping.id, label: grouping.label }));

  const changeEnvelope = (direction: 'previous' | 'next') => {
    if (enveloppeOptions.length === 0) {
      return;
    }

    const currentIndex = enveloppeOptions.findIndex(option => option.value === draftFilters.budgetId);

    if (currentIndex === -1) {
      const fallbackIndex = direction === 'previous' ? enveloppeOptions.length - 1 : 0;
      setDraftFilters(current => ({ ...current, budgetId: enveloppeOptions[fallbackIndex]?.value ?? null }));
      return;
    }

    const delta = direction === 'previous' ? -1 : 1;
    const nextIndex = (currentIndex + delta + enveloppeOptions.length) % enveloppeOptions.length;
    setDraftFilters(current => ({ ...current, budgetId: enveloppeOptions[nextIndex]?.value ?? null }));
  };
  const currentRows = statisticsQuery.data?.items ?? [];
  const totalPages = statisticsQuery.data ? Math.max(1, Math.ceil(statisticsQuery.data.total / statisticsQuery.data.limit)) : 1;

  const applyFilters = () => {
    const nextBaseSort = getBaseSortState(draftFilters.sortByDueDate);
    setSortState(nextBaseSort);
    setPage(1);
    setSubmittedFilters({
      accountId: draftFilters.accountId ?? undefined,
      budgetId: draftFilters.budgetId ?? undefined,
      categoryId: draftFilters.categoryId ?? undefined,
      thirdPartyId: draftFilters.thirdPartyId ?? undefined,
      categoryGroupingId: draftFilters.categoryGroupingId ?? undefined,
      budgetGroupingId: draftFilters.budgetGroupingId ?? undefined,
      pieceNumber: draftFilters.pieceNumber || undefined,
      operationDateFrom: toIsoDate(draftFilters.operationDateFrom),
      operationDateTo: draftFilters.operationDateTo ? new Date(`${draftFilters.operationDateTo}T23:59:59.999Z`).toISOString() : undefined,
      dueDateFrom: toIsoDate(draftFilters.dueDateFrom),
      dueDateTo: draftFilters.dueDateTo ? new Date(`${draftFilters.dueDateTo}T23:59:59.999Z`).toISOString() : undefined,
      sortByDueDate: draftFilters.sortByDueDate,
    });
  };

  const thStyle = {
    padding: `${CRUD.liste.paddingVerticalEntete}px ${CRUD.liste.paddingHorizontalEntete}px`,
    fontSize: HEADER_FONT_SIZE,
    fontWeight: 700,
    borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
    borderRight: `1px solid ${CRUD.couleurs.grilleTableau}`,
    whiteSpace: 'nowrap' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  };

  const tdStyle = {
    padding: `${CRUD.liste.paddingVerticalLigne}px ${CRUD.liste.paddingHorizontalLigne}px`,
    borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
    borderRight: `1px solid ${CRUD.couleurs.grilleTableau}`,
    verticalAlign: 'middle' as const,
    fontSize: TABLE_FONT_SIZE,
  };

  const toolbarButtonStyle = {
    borderColor: '#d7deea',
    color: '#3c4658',
    background: '#ffffff',
    boxShadow: '0 1px 0 rgba(15, 23, 42, 0.02)',
  };

  const primaryButtonStyle = {
    background: CRUD.couleurs.fondBandeau,
    color: CRUD.couleurs.texteBandeau,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  };

  const headerButtonStyle = {
    all: 'unset',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    cursor: 'pointer',
  } as const;

  const getSortIcon = (key: SortKey) => {
    if (sortState.key !== key) {
      return <IconSelector size={12} stroke={1.8} />;
    }

    return sortState.direction === 'asc'
      ? <IconChevronUp size={12} stroke={2} />
      : <IconChevronDown size={12} stroke={2} />;
  };

  const toggleSort = (key: SortKey) => {
    setPage(1);
    setSortState(current => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key,
        direction: key === 'balance' ? 'desc' : 'asc',
      };
    });
  };

  const renderSortableHeader = (label: string, key: SortKey, style?: CSSProperties) => (
    <Table.Th style={{ ...thStyle, textAlign: 'center', ...style }}>
      <button type="button" onClick={() => toggleSort(key)} style={headerButtonStyle}>
        <span>{label}</span>
        {getSortIcon(key)}
      </button>
    </Table.Th>
  );

  return (
    <Box style={{ maxWidth: 1440, margin: '0 auto' }}>
      <Stack gap={0}>
        <Box
          style={{
            background: CRUD.couleurs.fondBandeau,
            color: CRUD.couleurs.texteBandeau,
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 'var(--crud-list-title-radius-top) var(--crud-list-title-radius-top) 0 0',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
        >
          Statistiques détaillées
        </Box>

        <Box
          style={{
            background: PANEL_BG,
            border: `1px solid ${GRAY_BORDER}`,
            borderTop: 'none',
            borderRadius: '0 0 var(--crud-list-panel-radius) var(--crud-list-panel-radius)',
            overflow: 'hidden',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
          }}
        >
          <Stack gap={6} style={{ padding: '10px 18px 12px' }}>
            <Group grow align="end" gap={8}>
              <Group align="end" gap={6} wrap="nowrap">
                <Button
                  size={FILTER_INPUT_SIZE}
                  variant="default"
                  style={toolbarButtonStyle}
                  px={8}
                  onClick={() => changeEnvelope('previous')}
                  aria-label="Enveloppe précédente"
                >
                  <IconChevronLeft size={16} />
                </Button>
                <Select
                  size={FILTER_INPUT_SIZE}
                  label="Enveloppe"
                  data={enveloppeOptions}
                  value={draftFilters.budgetId}
                  onChange={value => setDraftFilters(current => ({ ...current, budgetId: value }))}
                  searchable
                  clearable
                  placeholder="Toutes"
                  styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
                  style={{ flex: 1 }}
                />
                <Button
                  size={FILTER_INPUT_SIZE}
                  variant="default"
                  style={toolbarButtonStyle}
                  px={8}
                  onClick={() => changeEnvelope('next')}
                  aria-label="Enveloppe suivante"
                >
                  <IconChevronRight size={16} />
                </Button>
              </Group>
              <Select
                size={FILTER_INPUT_SIZE}
                label="Compte"
                data={accountOptions}
                value={draftFilters.accountId}
                onChange={value => setDraftFilters(current => ({ ...current, accountId: value }))}
                searchable
                clearable
                placeholder="Tous"
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <Select
                size={FILTER_INPUT_SIZE}
                label="Catégorie"
                data={categoryOptions}
                value={draftFilters.categoryId}
                onChange={value => setDraftFilters(current => ({ ...current, categoryId: value }))}
                searchable
                clearable
                placeholder="Toutes"
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <Select
                size={FILTER_INPUT_SIZE}
                label="Tiers"
                data={thirdPartyOptions}
                value={draftFilters.thirdPartyId}
                onChange={value => setDraftFilters(current => ({ ...current, thirdPartyId: value }))}
                searchable
                clearable
                placeholder="Tous"
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
            </Group>

            <Group grow align="end" gap={8}>
              <Select
                size={FILTER_INPUT_SIZE}
                label="Regroupement catégorie"
                data={groupingOptions}
                value={draftFilters.categoryGroupingId}
                onChange={value => setDraftFilters(current => ({ ...current, categoryGroupingId: value }))}
                searchable
                clearable
                placeholder="Tous"
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <Select
                size={FILTER_INPUT_SIZE}
                label="Regroupement poste"
                data={groupingOptions}
                value={draftFilters.budgetGroupingId}
                onChange={value => setDraftFilters(current => ({ ...current, budgetGroupingId: value }))}
                searchable
                clearable
                placeholder="Tous"
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="No pièce"
                value={draftFilters.pieceNumber}
                onChange={event => setDraftFilters(current => ({ ...current, pieceNumber: event.currentTarget.value }))}
                placeholder="Recherche pièce"
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
            </Group>

            <Group grow align="end" gap={8}>
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="Date opération du"
                type="date"
                value={draftFilters.operationDateFrom}
                onChange={event => setDraftFilters(current => ({ ...current, operationDateFrom: event.currentTarget.value }))}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="au"
                type="date"
                value={draftFilters.operationDateTo}
                onChange={event => setDraftFilters(current => ({ ...current, operationDateTo: event.currentTarget.value }))}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="Date échéance du"
                type="date"
                value={draftFilters.dueDateFrom}
                onChange={event => setDraftFilters(current => ({ ...current, dueDateFrom: event.currentTarget.value }))}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="au"
                type="date"
                value={draftFilters.dueDateTo}
                onChange={event => setDraftFilters(current => ({ ...current, dueDateTo: event.currentTarget.value }))}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
            </Group>

            <Group justify="space-between" align="center" style={{ paddingTop: 0 }}>
              <Checkbox
                size="sm"
                label="Tri par date d'échéance"
                checked={draftFilters.sortByDueDate}
                onChange={event => {
                  const checked = event.currentTarget.checked;
                  setDraftFilters(current => ({ ...current, sortByDueDate: checked }));
                }}
              />
              <Group gap={10}>
                <Button variant="default" onClick={() => {
                  setDraftFilters({
                    accountId: null,
                    budgetId: null,
                    categoryId: null,
                    thirdPartyId: null,
                    categoryGroupingId: null,
                    budgetGroupingId: null,
                    pieceNumber: '',
                    operationDateFrom: '',
                    operationDateTo: '',
                    dueDateFrom: '',
                    dueDateTo: '',
                    sortByDueDate: true,
                  });
                  setPage(1);
                  setSortState(getBaseSortState(true));
                  setSubmittedFilters(null);
                }} style={toolbarButtonStyle}>
                  RAZ
                </Button>
                <Button leftSection={<IconPlayerPlay size={14} />} onClick={applyFilters} style={primaryButtonStyle}>
                  Lancer
                </Button>
              </Group>
            </Group>
          </Stack>

          {statisticsQuery.isLoading ? (
            <Center style={{ minHeight: 160 }}>
              <Loader size="sm" />
            </Center>
          ) : statisticsQuery.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />} m="md">
              <Text size="sm">{statisticsQuery.error.message}</Text>
            </Alert>
          ) : submittedFilters === null ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Choisis tes critères puis lance la requête.</Text>
            </Center>
          ) : (
            <Stack gap={0}>
              <Group justify="space-between" style={{ padding: '14px 16px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>{statisticsQuery.data?.total ?? 0} ligne(s)</Text>
                <Group gap={18}>
                  <Text size="sm">
                    Solde: <strong style={{ color: getAmountColor(statisticsQuery.data?.totalBalance ?? '0') }}>{formatAmount(statisticsQuery.data?.totalBalance ?? '0')}</strong>
                  </Text>
                </Group>
              </Group>

              <Box style={{ overflowX: 'auto' }}>
                <Table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 1100 }}>
                  <Table.Thead>
                    <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                      {renderSortableHeader('Cpte', 'accountName', { width: 170 })}
                      {renderSortableHeader('Date', 'operationDate')}
                      {renderSortableHeader('Date échéance', 'effectiveDueDate')}
                      {renderSortableHeader('No pièce', 'pieceNumber', { width: 66 })}
                      {renderSortableHeader('Libellé', 'label', { width: 260 })}
                      {renderSortableHeader('Solde ligne', 'balance', { width: 92, whiteSpace: 'normal', lineHeight: 1.1 })}
                      <Table.Th style={{ ...thStyle, textAlign: 'center', width: 96, whiteSpace: 'normal', lineHeight: 1.1 }}>
                        Solde progressif
                      </Table.Th>
                      {renderSortableHeader('Tiers', 'thirdPartyName', { width: 150 })}
                      {renderSortableHeader('Enveloppe', 'budgetLabel', { width: 150 })}
                      {renderSortableHeader('Catégorie', 'categoryLabel', { width: 170 })}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {currentRows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={10} style={{ textAlign: 'center', padding: '18px 16px' }}>
                          <Text c={TEXT_MUTED}>Aucun mouvement pour ces critères.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      currentRows.map((item, index) => (
                        <Table.Tr
                          key={item.splitId ?? item.operationId}
                          style={{
                            background: index % 2 === 1 ? CRUD.couleurs.fondLignePaire : CRUD.couleurs.fondLigneImpaire,
                          }}
                        >
                          <Table.Td
                            style={{ ...tdStyle, maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={item.accountName}
                        >
                          {renderTruncatedCell(item.accountName, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
                        </Table.Td>
                          <Table.Td style={tdStyle}>{formatDate(item.operationDate)}</Table.Td>
                          <Table.Td style={tdStyle}>{formatDate(item.effectiveDueDate)}</Table.Td>
                          <Table.Td style={{ ...tdStyle, width: 66, whiteSpace: 'nowrap' }}>{item.pieceNumber ?? '—'}</Table.Td>
                          <Table.Td
                            style={{ ...tdStyle, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {renderTruncatedCell(item.label, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
                          </Table.Td>
                          <Table.Td style={{ ...tdStyle, textAlign: 'right', color: getAmountColor(item.balance) }}>{formatAmount(item.balance)}</Table.Td>
                          <Table.Td style={{ ...tdStyle, textAlign: 'right', color: getAmountColor(item.runningBalance) }}>{formatAmount(item.runningBalance)}</Table.Td>
                          <Table.Td
                            style={{ ...tdStyle, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {renderTruncatedCell(item.thirdPartyName ?? '—', { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
                          </Table.Td>
                          <Table.Td
                            style={{ ...tdStyle, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {renderTruncatedCell(item.budgetLabel ?? '—', { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
                          </Table.Td>
                          <Table.Td
                            style={{ ...tdStyle, maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {renderTruncatedCell(item.categoryLabel ?? '—', { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Box>

              <Box
                style={{
                  padding: 'var(--crud-list-footer-padding-top) var(--crud-list-footer-padding-x) 0',
                  background: 'transparent',
                  position: 'relative',
                  minHeight: 42,
                  borderTop: `1px solid ${GRAY_BORDER}`,
                }}
              >
                <Group
                  gap={8}
                  align="center"
                  style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>
                    {statisticsQuery.data ? `${statisticsQuery.data.total} ligne(s)` : '…'}
                  </Text>
                  <Select
                    size="sm"
                    radius="md"
                    value={String(limit)}
                    onChange={value => {
                      if (!value) return;
                      setLimit(Number(value));
                      setPage(1);
                    }}
                    data={LIMIT_OPTIONS}
                    style={{ width: 78 }}
                  />
                </Group>

                <Group gap={6} justify="center">
                  <Button
                    size="sm"
                    radius="md"
                    variant="default"
                    style={toolbarButtonStyle}
                    disabled={page <= 1}
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                  >
                    Précédent
                  </Button>
                  <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px', whiteSpace: 'nowrap' }}>
                    Page {page} sur {totalPages}
                  </Text>
                  <Button
                    size="sm"
                    radius="md"
                    variant="default"
                    style={toolbarButtonStyle}
                    disabled={page >= totalPages}
                    onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                  >
                    Suivant
                  </Button>
                </Group>
              </Box>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
