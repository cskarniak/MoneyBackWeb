'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ActionIcon, Alert, Box, Button, Center, Checkbox, Group, Loader, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconDownload, IconPencil, IconPlayerPlay, IconSelector } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import api from '@/lib/api';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import { useGroupingsAll } from '@/hooks/useGroupings';
import { useThirdPartiesAll } from '@/hooks/useThirdParties';
import { useDetailedStatistics, type DetailedStatisticsFilters, type DetailedStatisticsItem } from '@/hooks/useDetailedStatistics';
import { startsWithOptionsFilter } from '@/lib/select-filter';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const NEGATIVE_AMOUNT = '#c92a2a';
const TABLE_FONT_SIZE = 12;
const HEADER_FONT_SIZE = 10;
const FILTER_INPUT_SIZE = 'xs';
const LIMIT_OPTIONS = ['10', '20', '25', '50', '100', '200', '500', '1000'];

type DraftFilters = {
  accountId: string | null;
  budgetId: string | null;
  categoryId: string | null;
  thirdPartyId: string | null;
  categoryGroupingId: string | null;
  budgetGroupingId: string | null;
  search: string;
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

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildExcelXml(rows: DetailedStatisticsItem[]) {
  const headers = [
    'Compte',
    'Date opération',
    'Date échéance',
    'No pièce',
    'Libellé',
    'Solde ligne',
    'Solde progressif',
    'Tiers',
    'Enveloppe',
    'Catégorie',
  ];

  const headerRow = `<Row>${headers.map(header => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`).join('')}</Row>`;
  const bodyRows = rows.map(item => `
    <Row>
      <Cell><Data ss:Type="String">${escapeXml(item.accountName)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(formatDate(item.operationDate))}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(formatDate(item.effectiveDueDate))}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.pieceNumber ?? '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.label)}</Data></Cell>
      <Cell ss:StyleID="amount"><Data ss:Type="Number">${Number(item.balance || 0)}</Data></Cell>
      <Cell ss:StyleID="amount"><Data ss:Type="Number">${Number(item.runningBalance || 0)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.thirdPartyName ?? '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.budgetLabel ?? '')}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.categoryLabel ?? '')}</Data></Cell>
    </Row>
  `).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="amount">
      <NumberFormat ss:Format="0.00"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Statistiques">
    <Table>
      ${headerRow}
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function downloadExcel(content: string, filename: string) {
  const blob = new Blob([content], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

function matchesPageSearch(search: string, values: Array<string | null | undefined>) {
  const normalizedSearch = search.trim().toLocaleLowerCase('fr');

  if (!normalizedSearch) {
    return false;
  }

  return values.some(value => (value ?? '').toLocaleLowerCase('fr').includes(normalizedSearch));
}

function buildSubmittedFilters(filters: DraftFilters): DetailedStatisticsFilters {
  return {
    accountId: filters.accountId ?? undefined,
    budgetId: filters.budgetId ?? undefined,
    categoryId: filters.categoryId ?? undefined,
    thirdPartyId: filters.thirdPartyId ?? undefined,
    categoryGroupingId: filters.categoryGroupingId ?? undefined,
    budgetGroupingId: filters.budgetGroupingId ?? undefined,
    pieceNumber: filters.pieceNumber || undefined,
    operationDateFrom: toIsoDate(filters.operationDateFrom),
    operationDateTo: filters.operationDateTo ? new Date(`${filters.operationDateTo}T23:59:59.999Z`).toISOString() : undefined,
    dueDateFrom: toIsoDate(filters.dueDateFrom),
    dueDateTo: filters.dueDateTo ? new Date(`${filters.dueDateTo}T23:59:59.999Z`).toISOString() : undefined,
    sortByDueDate: filters.sortByDueDate,
  };
}

export function DetailedStatisticsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isZoomTarget = searchParams.get('returnTo') === 'envelope-summary';
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasAppliedInitialParams, setHasAppliedInitialParams] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({
    accountId: null,
    budgetId: null,
    categoryId: null,
    thirdPartyId: null,
    categoryGroupingId: null,
    budgetGroupingId: null,
    search: '',
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
  const [limit, setLimit] = useState(20);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

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
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (hasAppliedInitialParams) {
      return;
    }

    const budgetId = searchParams.get('budgetId');
    const accountId = searchParams.get('accountId');
    const operationDateFrom = searchParams.get('operationDateFrom') ?? '';
    const operationDateTo = searchParams.get('operationDateTo') ?? '';
    const dueDateFrom = searchParams.get('dueDateFrom') ?? '';
    const dueDateTo = searchParams.get('dueDateTo') ?? '';
    const sortByDueDate = searchParams.get('sortByDueDate');
    const autoRun = searchParams.get('autoRun') === 'true';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const sortKeyParam = searchParams.get('sortKey');
    const sortDirectionParam = searchParams.get('sortDirection');
    const highlightOperationIdParam = searchParams.get('highlightOperationId');

    if (
      !budgetId
      && !accountId
      && !operationDateFrom
      && !operationDateTo
      && !dueDateFrom
      && !dueDateTo
      && sortByDueDate === null
      && !pageParam
      && !limitParam
      && !sortKeyParam
      && !sortDirectionParam
      && !highlightOperationIdParam
    ) {
      setHasAppliedInitialParams(true);
      return;
    }

    const nextFilters: DraftFilters = {
      accountId,
      budgetId,
      categoryId: null,
      thirdPartyId: null,
      categoryGroupingId: null,
      budgetGroupingId: null,
      search: '',
      pieceNumber: '',
      operationDateFrom,
      operationDateTo,
      dueDateFrom,
      dueDateTo,
      sortByDueDate: sortByDueDate === null ? true : sortByDueDate === 'true',
    };

    setDraftFilters(nextFilters);
    const baseSortState = getBaseSortState(nextFilters.sortByDueDate);
    setSortState({
      key:
        sortKeyParam === 'accountName'
        || sortKeyParam === 'operationDate'
        || sortKeyParam === 'effectiveDueDate'
        || sortKeyParam === 'pieceNumber'
        || sortKeyParam === 'label'
        || sortKeyParam === 'balance'
        || sortKeyParam === 'thirdPartyName'
        || sortKeyParam === 'budgetLabel'
        || sortKeyParam === 'categoryLabel'
          ? sortKeyParam
          : baseSortState.key,
      direction:
        sortDirectionParam === 'asc' || sortDirectionParam === 'desc'
          ? sortDirectionParam
          : baseSortState.direction,
    });
    setPage(pageParam ? Number(pageParam) || 1 : 1);
    setLimit(limitParam ? Number(limitParam) || 20 : 20);
    setHighlightedRowId(highlightOperationIdParam);

    if (autoRun) {
      setSubmittedFilters(buildSubmittedFilters(nextFilters));
    }

    setHasAppliedInitialParams(true);
  }, [hasAppliedInitialParams, searchParams]);

  useEffect(() => {
    const highlightOperationIdParam = searchParams.get('highlightOperationId');
    if (!highlightOperationIdParam) {
      return;
    }

    setHighlightedRowId(highlightOperationIdParam);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('highlightOperationId');
    const qs = params.toString();
    router.replace(`/statistiques${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, searchParams]);

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
      const nextFilters = {
        ...draftFilters,
        budgetId: enveloppeOptions[fallbackIndex]?.value ?? null,
      };
      setDraftFilters(nextFilters);
      if (submittedFilters !== null) {
        setPage(1);
        setSubmittedFilters(buildSubmittedFilters(nextFilters));
      }
      return;
    }

    const delta = direction === 'previous' ? -1 : 1;
    const nextIndex = (currentIndex + delta + enveloppeOptions.length) % enveloppeOptions.length;
    const nextFilters = {
      ...draftFilters,
      budgetId: enveloppeOptions[nextIndex]?.value ?? null,
    };
    setDraftFilters(nextFilters);
    if (submittedFilters !== null) {
      setPage(1);
      setSubmittedFilters(buildSubmittedFilters(nextFilters));
    }
  };
  const currentRows = statisticsQuery.data?.items ?? [];
  const totalPages = statisticsQuery.data ? Math.max(1, Math.ceil(statisticsQuery.data.total / statisticsQuery.data.limit)) : 1;
  const pageSearchMatches = useMemo(() => {
    const search = draftFilters.search.trim();

    if (!search) {
      return [];
    }

    return currentRows.filter(item => matchesPageSearch(search, [
      item.accountName,
      formatDate(item.operationDate),
      formatDate(item.effectiveDueDate),
      item.pieceNumber,
      item.label,
      item.balance,
      item.runningBalance,
      item.thirdPartyName,
      item.budgetLabel,
      item.categoryLabel,
    ]));
  }, [currentRows, draftFilters.search]);
  const highlightedRowKeys = useMemo(() => {
    return new Set(pageSearchMatches.map(item => item.splitId ?? item.operationId));
  }, [pageSearchMatches]);

  const applyFilters = () => {
    const nextBaseSort = getBaseSortState(draftFilters.sortByDueDate);
    setSortState(nextBaseSort);
    setPage(1);
    setSubmittedFilters(buildSubmittedFilters(draftFilters));
  };

  const openOperationEditor = (operationId: string, accountId: string, rowId: string) => {
    setHighlightedRowId(rowId);
    const params = new URLSearchParams();
    params.set('accountId', accountId);
    params.set('operationId', operationId);
    params.set('highlight', operationId);
    params.set('returnTo', 'detailed-statistics');
    params.set('returnAccountId', draftFilters.accountId ?? '');
    params.set('returnBudgetId', draftFilters.budgetId ?? '');
    params.set('returnCategoryId', draftFilters.categoryId ?? '');
    params.set('returnThirdPartyId', draftFilters.thirdPartyId ?? '');
    params.set('returnCategoryGroupingId', draftFilters.categoryGroupingId ?? '');
    params.set('returnBudgetGroupingId', draftFilters.budgetGroupingId ?? '');
    params.set('returnPieceNumber', draftFilters.pieceNumber);
    params.set('returnOperationDateFrom', draftFilters.operationDateFrom);
    params.set('returnOperationDateTo', draftFilters.operationDateTo);
    params.set('returnDueDateFrom', draftFilters.dueDateFrom);
    params.set('returnDueDateTo', draftFilters.dueDateTo);
    params.set('returnSortByDueDate', draftFilters.sortByDueDate ? 'true' : 'false');
    params.set('returnPage', String(page));
    params.set('returnLimit', String(limit));
    params.set('returnSortKey', sortState.key);
    params.set('returnSortDirection', sortState.direction);
    params.set('returnAutoRun', submittedFilters !== null ? 'true' : 'false');
    params.set('returnHighlightOperationId', rowId);
    window.open(`/operations?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleExport = async () => {
    if (submittedFilters === null) {
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const firstPageLimit = 1000;
      const baseParams = {
        ...submittedFilters,
        sortKey: sortState.key,
        sortDirection: sortState.direction,
        page: 1,
        limit: firstPageLimit,
      };
      const firstResponse = await api.get('/statistics/detailed', { params: baseParams });
      const firstData = firstResponse.data as {
        total?: number;
        items?: Record<string, unknown>[];
      };
      const total = Number(firstData.total ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / firstPageLimit));
      const allItems: DetailedStatisticsItem[] = ((firstData.items ?? []) as Record<string, unknown>[])
        .map(item => ({
          operationId: String(item.operationId),
          splitId: item.splitId ? String(item.splitId) : null,
          accountId: String(item.accountId),
          accountName: String(item.accountName),
          operationDate: String(item.operationDate),
          dueDate: item.dueDate ? String(item.dueDate) : null,
          effectiveDueDate: String(item.effectiveDueDate),
          pieceNumber: item.pieceNumber ? String(item.pieceNumber) : null,
          label: String(item.label),
          expense: String(item.expense ?? '0'),
          income: String(item.income ?? '0'),
          balance: String(item.balance ?? '0'),
          runningBalance: String(item.runningBalance ?? '0'),
          thirdPartyId: item.thirdPartyId ? String(item.thirdPartyId) : null,
          thirdPartyName: item.thirdPartyName ? String(item.thirdPartyName) : null,
          budgetId: item.budgetId ? String(item.budgetId) : null,
          budgetLabel: item.budgetLabel ? String(item.budgetLabel) : null,
          categoryId: item.categoryId ? String(item.categoryId) : null,
          categoryLabel: item.categoryLabel ? String(item.categoryLabel) : null,
          categoryGroupingId: item.categoryGroupingId ? String(item.categoryGroupingId) : null,
          categoryGroupingLabel: item.categoryGroupingLabel ? String(item.categoryGroupingLabel) : null,
          budgetGroupingId: item.budgetGroupingId ? String(item.budgetGroupingId) : null,
          budgetGroupingLabel: item.budgetGroupingLabel ? String(item.budgetGroupingLabel) : null,
          operationType: item.operationType ? String(item.operationType) : null,
          lettering: item.lettering ? String(item.lettering) : null,
        }));

      for (let pageIndex = 2; pageIndex <= totalPages; pageIndex += 1) {
        const response = await api.get('/statistics/detailed', {
          params: {
            ...submittedFilters,
            sortKey: sortState.key,
            sortDirection: sortState.direction,
            page: pageIndex,
            limit: firstPageLimit,
          },
        });
        const nextItems = ((response.data.items ?? []) as Record<string, unknown>[])
          .map(item => ({
            operationId: String(item.operationId),
            splitId: item.splitId ? String(item.splitId) : null,
            accountId: String(item.accountId),
            accountName: String(item.accountName),
            operationDate: String(item.operationDate),
            dueDate: item.dueDate ? String(item.dueDate) : null,
            effectiveDueDate: String(item.effectiveDueDate),
            pieceNumber: item.pieceNumber ? String(item.pieceNumber) : null,
            label: String(item.label),
            expense: String(item.expense ?? '0'),
            income: String(item.income ?? '0'),
            balance: String(item.balance ?? '0'),
            runningBalance: String(item.runningBalance ?? '0'),
            thirdPartyId: item.thirdPartyId ? String(item.thirdPartyId) : null,
            thirdPartyName: item.thirdPartyName ? String(item.thirdPartyName) : null,
            budgetId: item.budgetId ? String(item.budgetId) : null,
            budgetLabel: item.budgetLabel ? String(item.budgetLabel) : null,
            categoryId: item.categoryId ? String(item.categoryId) : null,
            categoryLabel: item.categoryLabel ? String(item.categoryLabel) : null,
            categoryGroupingId: item.categoryGroupingId ? String(item.categoryGroupingId) : null,
            categoryGroupingLabel: item.categoryGroupingLabel ? String(item.categoryGroupingLabel) : null,
            budgetGroupingId: item.budgetGroupingId ? String(item.budgetGroupingId) : null,
            budgetGroupingLabel: item.budgetGroupingLabel ? String(item.budgetGroupingLabel) : null,
            operationType: item.operationType ? String(item.operationType) : null,
            lettering: item.lettering ? String(item.lettering) : null,
          }));
        allItems.push(...nextItems);
      }

      const workbook = buildExcelXml(allItems);
      const dateStamp = new Date().toISOString().slice(0, 10);
      downloadExcel(workbook, `statistiques-detaillees-${dateStamp}.xls`);
    } catch {
      setExportError("Impossible d'exporter les statistiques.");
    } finally {
      setIsExporting(false);
    }
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

  const pageSizeControl = (
    <Group gap={8} wrap="nowrap">
      <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ whiteSpace: 'nowrap' }}>
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
  );

  const goBackToEnvelopeSummary = () => {
    const params = new URLSearchParams();
    const returnAccountId = searchParams.get('returnAccountId');
    const returnDateMode = searchParams.get('returnDateMode');
    const returnReferenceDate = searchParams.get('returnReferenceDate');
    const returnUseDueDate = searchParams.get('returnUseDueDate');
    const returnShowOnlyNonZeroDifferences = searchParams.get('returnShowOnlyNonZeroDifferences');
    const returnHideZeroCurrentBalances = searchParams.get('returnHideZeroCurrentBalances');
    const returnGroupByGrouping = searchParams.get('returnGroupByGrouping');
    const returnSortKey = searchParams.get('returnSortKey');
    const returnSortDirection = searchParams.get('returnSortDirection');
    const returnAutoRun = searchParams.get('returnAutoRun');

    if (returnAccountId) params.set('accountId', returnAccountId);
    if (returnDateMode === 'today' || returnDateMode === 'date') params.set('dateMode', returnDateMode);
    if (returnReferenceDate) params.set('referenceDate', returnReferenceDate);
    if (returnUseDueDate === 'true' || returnUseDueDate === 'false') params.set('useDueDate', returnUseDueDate);
    if (returnShowOnlyNonZeroDifferences === 'true' || returnShowOnlyNonZeroDifferences === 'false') {
      params.set('showOnlyNonZeroDifferences', returnShowOnlyNonZeroDifferences);
    }
    if (returnHideZeroCurrentBalances === 'true' || returnHideZeroCurrentBalances === 'false') {
      params.set('hideZeroCurrentBalances', returnHideZeroCurrentBalances);
    }
    if (returnGroupByGrouping === 'true' || returnGroupByGrouping === 'false') {
      params.set('groupByGrouping', returnGroupByGrouping);
    }
    if (returnSortKey) params.set('sortKey', returnSortKey);
    if (returnSortDirection === 'asc' || returnSortDirection === 'desc') params.set('sortDirection', returnSortDirection);
    if (returnAutoRun === 'true') params.set('autoRun', 'true');

    router.push(`/statistiques/synthese-enveloppes${params.size > 0 ? `?${params.toString()}` : ''}`);
  };

  const handleClose = () => {
    if (searchParams.get('returnTo') === 'envelope-summary') {
      goBackToEnvelopeSummary();
      return;
    }

    router.push('/');
  };

  const paginationControls = isHydrated ? (
    <Group gap={6} wrap="nowrap">
      <Button
        size="sm"
        radius="md"
        variant="default"
        style={toolbarButtonStyle}
        disabled={submittedFilters === null || page <= 1}
        onClick={() => setPage(current => Math.max(1, current - 1))}
      >
        Précédent
      </Button>
      <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px', whiteSpace: 'nowrap' }}>
        Page {submittedFilters === null ? 0 : page} sur {submittedFilters === null ? 0 : totalPages}
      </Text>
      <Button
        size="sm"
        radius="md"
        variant="default"
        style={toolbarButtonStyle}
        disabled={submittedFilters === null || page >= totalPages}
        onClick={() => setPage(current => Math.min(totalPages, current + 1))}
      >
        Suivant
      </Button>
    </Group>
  ) : (
    <Box w={220} h={34} />
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
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Statistiques détaillées</Text>
            <Button
              variant="subtle"
              size="xs"
              color="rgba(255,255,255,0.92)"
              onClick={handleClose}
              disabled={isZoomTarget}
              style={{ paddingInline: 8 }}
              title={isZoomTarget ? "Ferme l'onglet ouvert par le zoom pour revenir à l'écran précédent." : undefined}
            >
              Fermer
            </Button>
          </Group>
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
          <Box
            style={{
              background: '#ffffff',
              borderBottom: `1px solid ${GRAY_BORDER}`,
              padding:
                'var(--crud-list-toolbar-padding-top) var(--crud-list-toolbar-padding-x) var(--crud-list-toolbar-padding-bottom)',
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap={8} wrap="nowrap">
                {pageSizeControl}
                {paginationControls}
              </Group>

            <Group gap={8} wrap="nowrap" justify="flex-end">
              <TextInput
                size="sm"
                value={draftFilters.search}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setDraftFilters(current => ({ ...current, search: value }));
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Recherche globale..."
                  radius="md"
                  w={240}
                />
                <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ whiteSpace: 'nowrap' }}>
                  {draftFilters.search.trim()
                    ? `${pageSearchMatches.length} occurrence(s) sur cette page`
                    : 'Recherche dans la page'}
                </Text>
                <Button variant="default" onClick={() => {
                  setDraftFilters({
                    accountId: null,
                    budgetId: null,
                    categoryId: null,
                    thirdPartyId: null,
                    categoryGroupingId: null,
                    budgetGroupingId: null,
                    search: '',
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
                <Button
                  variant="default"
                  leftSection={<IconDownload size={14} />}
                  onClick={handleExport}
                  loading={isExporting}
                  disabled={isHydrated ? submittedFilters === null : undefined}
                  style={toolbarButtonStyle}
                >
                  Excel
                </Button>
                <Button leftSection={<IconPlayerPlay size={14} />} onClick={applyFilters} style={primaryButtonStyle}>
                  Lancer
                </Button>
              </Group>
            </Group>
          </Box>

          <Stack gap={5} style={{ padding: '8px 16px 10px' }}>
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
                  filter={startsWithOptionsFilter}
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
                filter={startsWithOptionsFilter}
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
                filter={startsWithOptionsFilter}
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
                filter={startsWithOptionsFilter}
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
                filter={startsWithOptionsFilter}
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
                filter={startsWithOptionsFilter}
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
                onChange={event => {
                  const value = event.currentTarget.value;
                  setDraftFilters(current => ({ ...current, operationDateFrom: value }));
                }}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="au"
                type="date"
                value={draftFilters.operationDateTo}
                onChange={event => {
                  const value = event.currentTarget.value;
                  setDraftFilters(current => ({ ...current, operationDateTo: value }));
                }}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="Date échéance du"
                type="date"
                value={draftFilters.dueDateFrom}
                onChange={event => {
                  const value = event.currentTarget.value;
                  setDraftFilters(current => ({ ...current, dueDateFrom: value }));
                }}
                styles={{ input: { fontSize: TABLE_FONT_SIZE } }}
              />
              <TextInput
                size={FILTER_INPUT_SIZE}
                label="au"
                type="date"
                value={draftFilters.dueDateTo}
                onChange={event => {
                  const value = event.currentTarget.value;
                  setDraftFilters(current => ({ ...current, dueDateTo: value }));
                }}
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
              <Text fz={CRUD.typographie.petiteTailleTexte} c={TEXT_MUTED}>
                Filtres complémentaires
              </Text>
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
              {exportError && (
                <Alert color="red" icon={<IconAlertCircle size={16} />} m="md" mb={0}>
                  <Text size="sm">{exportError}</Text>
                </Alert>
              )}
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
                      <Table.Th style={{ ...thStyle, textAlign: 'center', width: 70 }}>
                        Action
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {currentRows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={11} style={{ textAlign: 'center', padding: '18px 16px' }}>
                          <Text c={TEXT_MUTED}>Aucun mouvement pour ces critères.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      currentRows.map((item, index) => {
                        const rowId = item.splitId ?? item.operationId;

                        return (
                        <Table.Tr
                          key={rowId}
                          style={{
                            background:
                              highlightedRowId === rowId
                                ? CRUD.couleurs.fondMiseEnEvidenceZoom
                                : highlightedRowKeys.has(rowId)
                                ? '#fff3bf'
                                : index % 2 === 1
                                  ? CRUD.couleurs.fondLignePaire
                                  : CRUD.couleurs.fondLigneImpaire,
                            cursor: 'pointer',
                          }}
                          onDoubleClick={() => openOperationEditor(item.operationId, item.accountId, rowId)}
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
                          <Table.Td style={{ ...tdStyle, textAlign: 'center', width: 70 }}>
                            <Tooltip label="Modifier l'opération" withArrow position="left">
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={event => {
                                  event.stopPropagation();
                                  openOperationEditor(item.operationId, item.accountId, rowId);
                                }}
                              >
                                <IconPencil size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      );
                      })
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
                  {pageSizeControl}
                </Group>

                <Group gap={6} justify="center">
                  {paginationControls}
                </Group>
              </Box>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
