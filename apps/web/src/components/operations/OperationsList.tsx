'use client';

import { CRUD } from '@/lib/crud-tokens';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Fragment, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import {
  Box,
  Badge,
  Group,
  Button,
  Checkbox,
  TextInput,
  Select,
  Table,
  Text,
  ActionIcon,
  Alert,
  Loader,
  Center,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconTrash, IconSearch, IconAlertCircle, IconCheck, IconGitBranch, IconDownload, IconWand } from '@tabler/icons-react';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useDeleteOperation, useOperation, useOperationStatementRefs, useOperations, useUpdateOperation, type Operation } from '@/hooks/useOperations';
import { exportPaginatedListToExcel } from '@/lib/export-excel';
import { isSecondaryTabRequest, openSecondaryTab } from '@/lib/secondary-tab';
import { OperationSplitModal } from './OperationSplitModal';
import { OperationsInlineEditor } from './OperationsInlineEditor';
import { CreateMatchingRuleModal } from './CreateMatchingRuleModal';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const UNVALIDATED_TEXT = '#b26a00';
const LIMIT_OPTIONS = ['10', '20', '25', '50', '100'];
const OPERATIONS_ROW_FONT_SIZE = 12;
const SPLIT_BALANCED_BG = '#fff4b8';
const SPLIT_UNBALANCED_BG = '#ffd0ea';
const OPERATIONS_LAST_ACCOUNT_STORAGE_KEY = 'operations:last-account-id';
const SPLIT_TOLERANCE = 0.011;
const VIEWPORT_TOP_OFFSET = 60;
const OPERATION_COLUMN_WIDTHS: Record<string, string> = {
  cursor: '22px',
  operationDate: '104px',
  label: '26%',
  tiers: '14%',
  categorie: '14%',
  enveloppe: '14%',
  expense: '96px',
  income: '96px',
  actions: '148px',
};

function formatDate(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());

  return `${day}/${month}/${year}`;
}

function formatAmount(value: string) {
  const amount = Number(value || 0);
  return amount === 0 ? '—' : amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBalanceAmount(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOperationNet(operation: Pick<Operation, 'expense' | 'income'>) {
  return Number(operation.income || 0) - Number(operation.expense || 0);
}

function normalizeRemainingBalance(value: number) {
  return Math.abs(value) < SPLIT_TOLERANCE ? 0 : Number(value.toFixed(2));
}

function getRowBackground(operation: Operation, index: number, hoveredId: string | null, recentId: string | null) {
  if (hoveredId === operation.id) return CRUD.couleurs.fondLigneSurvol;

  if (operation.operationType === 'V') {
    return SPLIT_BALANCED_BG;
  }

  if (operation.operationType === 'P') {
    return SPLIT_UNBALANCED_BG;
  }

  return index % 2 === 1 ? CRUD.couleurs.fondLignePaire : CRUD.couleurs.fondLigneImpaire;
}

function getCursorTargetId(editId: string | null, recentId: string | null) {
  return editId ?? recentId;
}

function isOperationValidated(operation: Pick<Operation, 'operationValidated'>) {
  return operation.operationValidated === 'V';
}

function isSplitOperation(operation: Pick<Operation, 'operationType' | 'splits'>) {
  return operation.operationType === 'V' || operation.operationType === 'P' || operation.splits.length > 0;
}

export function OperationsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const operationId = searchParams.get('operationId') ?? '';
  const search = searchParams.get('search') ?? '';
  const accountId = searchParams.get('accountId') ?? '';
  const statementRef = searchParams.get('statementRef') ?? '';
  const hideLocked = searchParams.get('hideLocked') === 'true';
  const emptyEnvelopeOnly = searchParams.get('emptyEnvelopeOnly') === 'true';
  const unvalidatedOnly = searchParams.get('unvalidatedOnly') === 'true';
  const sortBy = (searchParams.get('sortBy') as 'operationDate' | 'label' | 'expense' | 'income') ?? 'operationDate';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  const highlight = searchParams.get('highlight');
  const returnTo = searchParams.get('returnTo');
  const isSecondaryTab = isSecondaryTabRequest(searchParams);
  const editParam = searchParams.get('edit');
  const modeParam = searchParams.get('mode');
  const [searchInput, setSearchInput] = useState(search);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draftOperation, setDraftOperation] = useState<{ id?: string; accountId: string; expense: number; income: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; operation: Operation } | null>(null);
  const [splitDetailsOperation, setSplitDetailsOperation] = useState<Operation | null>(null);
  const [ruleModalOperation, setRuleModalOperation] = useState<Operation | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const viewportAnchorRef = useRef<{ operationId: string; top: number } | null>(null);
  const scrollTopRef = useRef<number | null>(null);
  const listStateRef = useRef<{
    page: string;
    limit: string;
    operationId: string | null;
    search: string | null;
    accountId: string | null;
    statementRef: string | null;
    hideLocked: string | null;
    emptyEnvelopeOnly: string | null;
    unvalidatedOnly: string | null;
    sortBy: string;
    sortOrder: string;
  } | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!editParam && !modeParam) return;

    if (modeParam === 'new') {
      setDraftOperation(null);
      setEditId(null);
      setMode('new');
    } else if (editParam) {
      setDraftOperation(null);
      setMode(null);
      setEditId(editParam);
      setRecentId(editParam);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit');
    params.delete('mode');
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [editParam, modeParam, pathname, router, searchParams]);

  const isCreating = mode === 'new';
  const isEditing = !!editId;

  const goBackToDetailedStatistics = () => {
    const params = new URLSearchParams();
    const mappings: Array<[string, string]> = [
      ['returnAccountId', 'accountId'],
      ['returnBudgetId', 'budgetId'],
      ['returnCategoryId', 'categoryId'],
      ['returnThirdPartyId', 'thirdPartyId'],
      ['returnCategoryGroupingId', 'categoryGroupingId'],
      ['returnBudgetGroupingId', 'budgetGroupingId'],
      ['returnPieceNumber', 'pieceNumber'],
      ['returnOperationDateFrom', 'operationDateFrom'],
      ['returnOperationDateTo', 'operationDateTo'],
      ['returnDueDateFrom', 'dueDateFrom'],
      ['returnDueDateTo', 'dueDateTo'],
      ['returnSortByDueDate', 'sortByDueDate'],
      ['returnPage', 'page'],
      ['returnLimit', 'limit'],
      ['returnSortKey', 'sortKey'],
      ['returnSortDirection', 'sortDirection'],
      ['returnAutoRun', 'autoRun'],
      ['returnHighlightOperationId', 'highlightOperationId'],
    ];

    mappings.forEach(([source, target]) => {
      const value = searchParams.get(source);
      if (value) {
        params.set(target, value);
      }
    });

    router.push(`/statistiques?${params.toString()}`);
  };

  const handleClose = () => {
    if (isSecondaryTab) {
      window.close();
      return;
    }

    if (returnTo === 'detailed-statistics') {
      goBackToDetailedStatistics();
      return;
    }

    router.push('/');
  };

  useEffect(() => {
    if (highlight) {
      setRecentId(highlight);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('highlight');
      const qs = params.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  useEffect(() => {
    if (!accountId || typeof window === 'undefined') return;
    window.localStorage.setItem(OPERATIONS_LAST_ACCOUNT_STORAGE_KEY, accountId);
  }, [accountId]);

  useEffect(() => {
    if (accountId || typeof window === 'undefined') return;

    const storedAccountId = window.localStorage.getItem(OPERATIONS_LAST_ACCOUNT_STORAGE_KEY);
    if (!storedAccountId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('accountId', storedAccountId);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [accountId, pathname, router, searchParams]);

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [contextMenu]);

  const { data, isLoading, error } = useOperations({
    page,
    limit,
    operationId: operationId || undefined,
    search,
    accountId: accountId || undefined,
    statementRef: statementRef || undefined,
    hideLocked,
    emptyEnvelopeOnly,
    unvalidatedOnly,
    sortBy,
    sortOrder,
  }, { enabled: !!accountId });
  const operationQuery = useOperation(operationId);
  const { data: accounts = [] } = useAccountsAll();
  const { data: usedStatementRefs = [] } = useOperationStatementRefs(accountId || undefined);
  const selectedAccount = accounts.find(account => account.id === accountId) ?? null;
  const hasSelectedAccount = !!accountId;
  const effectiveItems = useMemo(() => (
    operationId
      ? (operationQuery.data ? [operationQuery.data] : [])
      : (data?.items ?? [])
  ), [data?.items, operationId, operationQuery.data]);
  const effectiveTotal = operationId ? effectiveItems.length : (data?.total ?? 0);
  const listLoading = operationId ? operationQuery.isLoading : isLoading;
  const listError = operationId ? operationQuery.error : error;
  const deleteMutation = useDeleteOperation();
  const updateMutation = useUpdateOperation();
  const persistedBalance = Number(selectedAccount?.currentBalance ?? 0);
  const displayedBalance = useMemo(() => {
    if (!draftOperation || !accountId || draftOperation.accountId !== accountId) {
      return persistedBalance;
    }

    const originalOperation = draftOperation.id
      ? effectiveItems.find(operation => operation.id === draftOperation.id)
      : null;
    const originalNet = originalOperation ? getOperationNet(originalOperation) : 0;
    const draftNet = draftOperation.income - draftOperation.expense;

    return persistedBalance - originalNet + draftNet;
  }, [accountId, draftOperation, effectiveItems, persistedBalance]);

  useEffect(() => {
    if (!draftOperation?.id || effectiveItems.length === 0) return;

    const persistedOperation = effectiveItems.find(operation => operation.id === draftOperation.id);
    if (!persistedOperation) return;

    const persistedNet = getOperationNet(persistedOperation);
    const draftNet = draftOperation.income - draftOperation.expense;

    if (Math.abs(persistedNet - draftNet) < 0.005) {
      setDraftOperation(null);
    }
  }, [draftOperation, effectiveItems]);

  const rememberViewportAnchor = useCallback((excludedOperationId?: string) => {
    if (typeof window === 'undefined') return;

    scrollTopRef.current = window.scrollY;

    const visibleRows = effectiveItems
      .map(operation => {
        const element = rowRefs.current[operation.id];
        if (!element) return null;

        return {
          operationId: operation.id,
          rect: element.getBoundingClientRect(),
        };
      })
      .filter((row): row is { operationId: string; rect: DOMRect } => row !== null);

    const candidateRows = excludedOperationId
      ? visibleRows.filter(row => row.operationId !== excludedOperationId)
      : visibleRows;

    const anchor =
      candidateRows.find(row => row.rect.bottom > VIEWPORT_TOP_OFFSET)
      ?? candidateRows[0]
      ?? visibleRows.find(row => row.rect.bottom > VIEWPORT_TOP_OFFSET)
      ?? visibleRows[0];

    if (!anchor) return;

    viewportAnchorRef.current = {
      operationId: anchor.operationId,
      top: anchor.rect.top,
    };
  }, [effectiveItems]);

  const captureListState = useCallback(() => {
    listStateRef.current = {
      page: String(page),
      limit: String(limit),
      operationId: operationId || null,
      search: search || null,
      accountId: accountId || null,
      statementRef: statementRef || null,
      hideLocked: hideLocked ? 'true' : null,
      emptyEnvelopeOnly: emptyEnvelopeOnly ? 'true' : null,
      unvalidatedOnly: unvalidatedOnly ? 'true' : null,
      sortBy,
      sortOrder,
    };
  }, [
    accountId,
    emptyEnvelopeOnly,
    hideLocked,
    limit,
    operationId,
    page,
    statementRef,
    search,
    sortBy,
    sortOrder,
    unvalidatedOnly,
  ]);

  useEffect(() => {
    if (isLoading) return;

    if (scrollTopRef.current !== null) {
      const targetScrollTop = scrollTopRef.current;
      const frame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: targetScrollTop });
        scrollTopRef.current = null;
        viewportAnchorRef.current = null;
      });

      return () => window.cancelAnimationFrame(frame);
    }

    if (!viewportAnchorRef.current) return;

    const anchor = viewportAnchorRef.current;
    const element = rowRefs.current[anchor.operationId];
    if (!element) return;

    const frame = window.requestAnimationFrame(() => {
      const delta = element.getBoundingClientRect().top - anchor.top;
      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta });
      }
      viewportAnchorRef.current = null;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [listLoading, effectiveItems, editId, mode, highlight]);

  const pushParams = useCallback(
    (
      updates: Record<string, string | null>,
      options?: {
        scroll?: boolean;
        preserveViewportAnchor?: boolean;
        excludedOperationId?: string;
        useCapturedListState?: boolean;
      },
    ) => {
      if (options?.preserveViewportAnchor) {
        rememberViewportAnchor(options.excludedOperationId);
      }

      const params = new URLSearchParams();

      if (options?.useCapturedListState && listStateRef.current !== null) {
        const capturedState = listStateRef.current;

        Object.entries(capturedState).forEach(([key, value]) => {
          if (value !== null && value !== '') {
            params.set(key, value);
          }
        });
      } else {
        const currentParams = new URLSearchParams(searchParams.toString());
        currentParams.forEach((value, key) => {
          params.set(key, value);
        });
      }

      Object.entries(updates).forEach(([k, v]) => {
        if (v !== null && v !== '') params.set(k, v);
        else params.delete(k);
      });

      // Keep the selected account sticky across edit/create/filter transitions
      // unless the caller explicitly clears or replaces it.
      if (!Object.prototype.hasOwnProperty.call(updates, 'accountId') && accountId) {
        params.set('accountId', accountId);
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: options?.scroll ?? true });
    },
    [accountId, rememberViewportAnchor, searchParams, pathname, router],
  );

  const handleSort = (col: 'operationDate' | 'label' | 'expense' | 'income') => {
    const newOrder = sortBy === col && sortOrder === 'asc' ? 'desc' : 'asc';
    pushParams({ sortBy: col, sortOrder: newOrder, page: '1' });
  };

  const handleSearch = () => pushParams({ search: searchInput, page: '1' });
  const handleClear = () => {
    setSearchInput('');
    pushParams({
      operationId: null,
      search: null,
      accountId: null,
      statementRef: null,
      hideLocked: null,
      emptyEnvelopeOnly: null,
      unvalidatedOnly: null,
      page: '1',
    });
  };
  const handleExport = async () => {
    if (!accountId) {
      notifications.show({ message: 'Sélectionnez un compte avant export.', color: 'orange' });
      return;
    }

    setIsExporting(true);
    try {
      const count = await exportPaginatedListToExcel({
        endpoint: '/operations',
        params: {
          operationId: operationId || undefined,
          search,
          accountId,
          statementRef: statementRef || undefined,
          hideLocked,
          emptyEnvelopeOnly,
          unvalidatedOnly,
          sortBy,
          sortOrder,
        },
        headers: ['Date', 'Libellé', 'Tiers', 'Catégorie', 'Enveloppe', 'Dépense', 'Recette'],
        mapItem: item => [
          formatDate(String(item.operationDate ?? '')),
          item.label,
          ((item.tiers as { name?: string } | null | undefined)?.name)
            ?? ((item.thirdParty as { name?: string } | null | undefined)?.name)
            ?? '',
          ((item.splits as unknown[] | undefined)?.length ?? 0) > 0
            ? 'Ventilé'
            : (((item.categorie as { label?: string } | null | undefined)?.label)
              ?? ((item.category as { label?: string } | null | undefined)?.label)
              ?? ''),
          ((item.splits as unknown[] | undefined)?.length ?? 0) > 0
            ? 'Ventilé'
            : (((item.enveloppe as { label?: string } | null | undefined)?.label)
              ?? ((item.budget as { label?: string } | null | undefined)?.label)
              ?? ''),
          Number(item.expense ?? 0),
          Number(item.income ?? 0),
        ],
        filenameBase: 'operations',
      });
      notifications.show({ message: `${count} opération(s) exportée(s)`, color: 'green' });
    } catch {
      notifications.show({ message: "Impossible d'exporter les opérations.", color: 'red' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleNew = () => {
    if (!accountId) {
      notifications.show({
        message: 'Sélectionnez un compte avant de créer une opération.',
        color: 'orange',
      });
      return;
    }

    captureListState();
    rememberViewportAnchor();
    setEditId(null);
    setMode('new');
  };

  const handleDelete = async (operation: Operation) => {
    rememberViewportAnchor(operation.id);
    setContextMenu(null);
    setDeleteError(null);
    const hasSplits = isSplitOperation(operation);
    const message = hasSplits
      ? `Supprimer l'opération "${operation.label}" ?\n\nAttention : cette opération est ventilée, ses lignes de ventilation seront également supprimées.`
      : `Supprimer l'opération "${operation.label}" ?`;
    if (!window.confirm(message)) return;
    try {
      await deleteMutation.mutateAsync(operation.id);
      if (operationId) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('operationId');
        params.delete('highlight');
        const qs = params.toString();
        router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
      }
      notifications.show({ message: `"${operation.label}" supprimée`, color: 'red' });
    } catch {
      setDeleteError(`Impossible de supprimer "${operation.label}".`);
    }
  };

  const handleToggleValidation = async (operation: Operation) => {
    rememberViewportAnchor(operation.id);
    setContextMenu(null);
    try {
      const currentlyValidated = isOperationValidated(operation);
      await updateMutation.mutateAsync({
        id: operation.id,
        operationValidated: currentlyValidated ? null : 'V',
      });
      notifications.show({
        message: currentlyValidated
          ? `"${operation.label}" marquée non validée`
          : `"${operation.label}" validée`,
        color: currentlyValidated ? 'orange' : 'green',
      });
    } catch {
      notifications.show({
        message: `Impossible de mettre à jour "${operation.label}".`,
        color: 'red',
      });
    }
  };

  const handleOpenSplitDetails = (operation: Operation) => {
    setContextMenu(null);
    setSplitDetailsOperation(operation);
  };

  const handleOpenCreateRule = (operation: Operation) => {
    setContextMenu(null);
    setRuleModalOperation(operation);
  };

  const handleOpenThirdParty = (operation: Operation) => {
    if (!operation.thirdPartyId) return;
    setContextMenu(null);
    router.push(`/referentiels/tiers/${operation.thirdPartyId}`);
  };

  const handleOpenCategory = (operation: Operation) => {
    if (!operation.categoryId) return;
    setContextMenu(null);
    router.push(`/referentiels/categories/${operation.categoryId}`);
  };

  const handleOpenEnvelope = (operation: Operation) => {
    if (!operation.budgetId) return;
    setContextMenu(null);
    router.push(`/referentiels/enveloppes/${operation.budgetId}`);
  };

  const handleOpenEnvelopeStatistics = (operation: Operation) => {
    if (!operation.budgetId) return;
    setContextMenu(null);
    openSecondaryTab(`/statistiques?budgetId=${operation.budgetId}&autoRun=true`);
  };

  const sortIcon = (col: string) => (sortBy === col ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '');

  const thStyle = (col?: 'operationDate' | 'label' | 'expense' | 'income') => ({
    padding: `${CRUD.liste.paddingVerticalEntete}px ${CRUD.liste.paddingHorizontalEntete}px`,
    fontSize: CRUD.typographie.petiteTailleTexte,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    cursor: col ? 'pointer' : 'default',
    userSelect: 'none' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  });

  const tdStyle = (hasRightBorder: boolean) => ({
    padding: `${CRUD.liste.paddingVerticalLigne}px ${CRUD.liste.paddingHorizontalLigne}px`,
    borderRight: hasRightBorder ? `1px solid ${CRUD.couleurs.grilleTableau}` : 'none',
    borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
    verticalAlign: 'middle' as const,
    lineHeight: 1,
  });

  const rowTextStyle = (operation: Operation, highlighted: boolean) => ({
    color: isOperationValidated(operation) ? undefined : UNVALIDATED_TEXT,
    fontStyle: isOperationValidated(operation) ? 'normal' : 'italic',
    fontWeight: highlighted ? 700 : undefined,
  });

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

  const actionIconStyle = {
    border: '1px solid #d9e3f0',
    background: '#f7faff',
  };

  const accountOptions = accounts.map(account => ({ value: account.id, label: account.name }));
  const statementRefOptions = useMemo(() => {
    if (!statementRef) {
      return usedStatementRefs.map(value => ({ value, label: value }));
    }

    const options = usedStatementRefs.map(value => ({ value, label: value }));
    return options.some(option => option.value === statementRef)
      ? options
      : [{ value: statementRef, label: statementRef }, ...options];
  }, [statementRef, usedStatementRefs]);
  const cursorTargetId = getCursorTargetId(editId, recentId);

  const columns = useMemo<ColumnDef<Operation>[]>(
    () => [
      {
        id: 'cursor',
        header: () => <span style={thStyle()} />,
        cell: ({ row }) => (
          <Text
            fz={11}
            fw={700}
            lh={1}
            ta="center"
            c={cursorTargetId === row.original.id ? '#4c73f0' : 'transparent'}
          >
            ▶
          </Text>
        ),
      },
      {
        accessorKey: 'operationDate',
        header: () => (
          <span style={thStyle('operationDate')} onClick={() => handleSort('operationDate')}>
            Date{sortIcon('operationDate')}
          </span>
        ),
        cell: ({ row, getValue }) => (
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 400} lh={1} style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
            {formatDate(getValue() as string)}
          </Text>
        ),
      },
      {
        accessorKey: 'label',
        header: () => (
          <span style={thStyle('label')} onClick={() => handleSort('label')}>
            Libellé{sortIcon('label')}
          </span>
        ),
        cell: ({ row }) => (
          <Stack gap={4}>
            <Text
              fz={OPERATIONS_ROW_FONT_SIZE}
              fw={cursorTargetId === row.original.id ? 700 : 600}
              lh={1}
              truncate
              title={row.original.label}
              style={rowTextStyle(row.original, cursorTargetId === row.original.id)}
            >
              {row.original.label}
            </Text>
            {row.original.simulation ? (
              <Badge size="xs" color="orange" variant="light" style={{ alignSelf: 'flex-start' }}>
                Simulation
              </Badge>
            ) : null}
          </Stack>
        ),
      },
      {
        id: 'tiers',
        header: () => <span style={thStyle()}>Tiers</span>,
        cell: ({ row }) => (
          <Text
            fz={OPERATIONS_ROW_FONT_SIZE}
            fw={cursorTargetId === row.original.id ? 700 : 400}
            lh={1}
            truncate
            title={row.original.tiers?.name ?? undefined}
            style={rowTextStyle(row.original, cursorTargetId === row.original.id)}
          >
            {row.original.tiers?.name ?? '—'}
          </Text>
        ),
      },
      {
        id: 'categorie',
        header: () => <span style={thStyle()}>Catégorie</span>,
        cell: ({ row }) => (
          <Text
            fz={OPERATIONS_ROW_FONT_SIZE}
            fw={cursorTargetId === row.original.id ? 700 : 400}
            lh={1}
            truncate
            title={row.original.splits.length > 0 ? 'Ventilé' : (row.original.categorie?.label ?? undefined)}
            style={rowTextStyle(row.original, cursorTargetId === row.original.id)}
          >
            {row.original.splits.length > 0 ? 'Ventilé' : (row.original.categorie?.label ?? '—')}
          </Text>
        ),
      },
      {
        id: 'enveloppe',
        header: () => <span style={thStyle()}>Enveloppe</span>,
        cell: ({ row }) => (
          <Text
            fz={OPERATIONS_ROW_FONT_SIZE}
            fw={cursorTargetId === row.original.id ? 700 : 400}
            lh={1}
            truncate
            title={row.original.splits.length > 0 ? 'Ventilé' : (row.original.enveloppe?.label ?? undefined)}
            style={rowTextStyle(row.original, cursorTargetId === row.original.id)}
          >
            {row.original.splits.length > 0 ? 'Ventilé' : (row.original.enveloppe?.label ?? '—')}
          </Text>
        ),
      },
      {
        accessorKey: 'expense',
        header: () => (
          <span style={{ ...thStyle('expense'), display: 'block', textAlign: 'right' }} onClick={() => handleSort('expense')}>
            Dépense{sortIcon('expense')}
          </span>
        ),
        cell: ({ row, getValue }) => (
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 400} lh={1} ta="right" style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
            {formatAmount(getValue() as string)}
          </Text>
        ),
      },
      {
        accessorKey: 'income',
        header: () => (
          <span style={{ ...thStyle('income'), display: 'block', textAlign: 'right' }} onClick={() => handleSort('income')}>
            Recette{sortIcon('income')}
          </span>
        ),
        cell: ({ row, getValue }) => (
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 400} lh={1} ta="right" style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
            {formatAmount(getValue() as string)}
          </Text>
        ),
      },
      {
        id: 'actions',
        header: () => <span style={thStyle()}>Actions</span>,
        cell: ({ row }) => (
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => {
                captureListState();
                rememberViewportAnchor(row.original.id);
                setMode(null);
                setEditId(row.original.id);
              }}
              title="Modifier"
              style={actionIconStyle}
            >
              <IconPencil size={14} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              onClick={() => handleDelete(row.original)}
              title="Supprimer"
              loading={deleteMutation.isPending}
              style={{ ...actionIconStyle, border: '1px solid #f1c7c7', background: '#fff8f8' }}
            >
              <IconTrash size={14} />
            </ActionIcon>
            {isSplitOperation(row.original) && (
              <ActionIcon
                variant="subtle"
                size="md"
                onClick={() => handleOpenSplitDetails(row.original)}
                title="Voir ventilation"
                style={actionIconStyle}
              >
                <IconGitBranch size={14} />
              </ActionIcon>
            )}
          </Group>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder, deleteMutation.isPending, cursorTargetId],
  );

  const table = useReactTable({
    data: hasSelectedAccount ? effectiveItems : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const totalPages = operationId ? 1 : (data ? Math.ceil(data.total / limit) : 1);
  const paginationHasSelectedAccount = isHydrated && hasSelectedAccount;
  const rows = table.getRowModel().rows;
  const showTopEditor = hasSelectedAccount && (isCreating || (isEditing && !rows.some(row => row.original.id === editId)));

  const closeEditor = () => {
    setDraftOperation(null);
    rememberViewportAnchor();
    setEditId(null);
    setMode(null);
  };
  const handleEditorSuccess = (savedId: string) => {
    notifications.show({
      message: isCreating ? "Opération créée" : 'Opération mise à jour',
      color: 'green',
    });
    rememberViewportAnchor();
    setEditId(null);
    setMode(null);
    setRecentId(savedId);
  };

  const paginationControls = isHydrated ? (
    <Group gap={6} wrap="nowrap">
      <Button
        variant="default"
        radius="md"
        disabled={!paginationHasSelectedAccount || page <= 1}
        onClick={() => pushParams({ page: String(page - 1) })}
      >
        Précédent
      </Button>
      <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px', whiteSpace: 'nowrap' }}>
        Page {paginationHasSelectedAccount ? page : 0} / {paginationHasSelectedAccount ? Math.max(totalPages, 1) : 0}
      </Text>
      <Button
        variant="default"
        radius="md"
        disabled={!paginationHasSelectedAccount || page >= totalPages}
        onClick={() => pushParams({ page: String(page + 1) })}
      >
        Suivant
      </Button>
    </Group>
  ) : (
    <Box w={220} h={34} />
  );

  return (
    <Box style={{ maxWidth: 'calc(var(--crud-list-max-width) * 1.2)', margin: '0 auto' }}>
      <Stack gap={0}>
        <Box
          style={{
            background: CRUD.couleurs.fondBandeau,
            color: CRUD.couleurs.texteBandeau,
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: 15,
            borderRadius: 'var(--crud-list-title-radius-top) var(--crud-list-title-radius-top) 0 0',
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Liste des opérations</Text>
            <Button
              variant="subtle"
              size="xs"
              color="rgba(255,255,255,0.92)"
              onClick={handleClose}
              style={{ paddingInline: 8 }}
              title={isSecondaryTab ? "Ferme cet onglet et revient à l'écran d'origine." : undefined}
            >
              Fermer
            </Button>
          </Group>
        </Box>

        <Box
          style={{
            background: '#ffffff',
            borderBottom: `1px solid ${GRAY_BORDER}`,
            borderLeft: `1px solid ${GRAY_BORDER}`,
            borderRight: `1px solid ${GRAY_BORDER}`,
            padding:
              'var(--crud-list-toolbar-padding-top) var(--crud-list-toolbar-padding-x) var(--crud-list-toolbar-padding-bottom)',
          }}
        >
          <Stack gap={12}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap={8}>
                <Button
                  leftSection={<IconPlus size={14} />}
                  radius="md"
                  style={primaryButtonStyle}
                  onClick={handleNew}
                >
                  Nouveau
                </Button>
              </Group>

              <Group gap={8} wrap="nowrap" justify="flex-end">
                {paginationControls}
                <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>Afficher</Text>
                <Select value={String(limit)} onChange={val => val && pushParams({ limit: val, page: '1' })} data={LIMIT_OPTIONS} w={78} radius="md" />
                <TextInput
                  value={searchInput}
                  onChange={e => setSearchInput(e.currentTarget.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Recherche..."
                  radius="md"
                  w={220}
                />
                <ActionIcon variant="default" size={36} radius="md" onClick={handleSearch}>
                  <IconSearch size={16} />
                </ActionIcon>
                <Button variant="default" radius="md" onClick={handleClear}>
                  Clear
                </Button>
                <Button variant="default" radius="md" leftSection={<IconDownload size={14} />} onClick={handleExport} loading={isExporting} disabled={!accountId} style={toolbarButtonStyle}>
                  Excel
                </Button>
              </Group>
            </Group>

            <Group justify="flex-start" align="flex-end" wrap="nowrap">
              <Box style={{ minWidth: 320 }}>
                <Group gap={8} wrap="nowrap" align="center">
                  <Text fz={CRUD.typographie.petiteTailleTexte} fw={700} c={TEXT_MUTED} tt="uppercase">
                    Compte
                  </Text>
                  <PositioningSelect
                    placeholder="Sélectionner un compte"
                    data={accountOptions}
                    value={accountId || null}
                    onChange={val => pushParams({ accountId: val, statementRef: null, page: '1' })}
                    clearable
                    radius="md"
                    w={280}
                  />
                  <Text fz={CRUD.typographie.petiteTailleTexte} c={accountId ? TEXT_MUTED : 'red'}>
                    {selectedAccount?.name ?? 'Compte requis pour saisir une ligne'}
                  </Text>
                </Group>
              </Box>
              <Group gap={8} wrap="nowrap" justify="flex-end" style={{ marginLeft: 'auto', minWidth: 260 }}>
                <Text fz={CRUD.typographie.petiteTailleTexte} fw={700} c={TEXT_MUTED} tt="uppercase">
                  Solde global
                </Text>
                <Text
                  fz={18}
                  fw={800}
                  c={!accountId ? TEXT_MUTED : displayedBalance < 0 ? '#c92a2a' : '#2b8a3e'}
                >
                  {!accountId ? '—' : `${displayedBalance >= 0 ? '+' : ''}${formatBalanceAmount(displayedBalance)}`}
                </Text>
              </Group>
            </Group>

            <Group gap={18} align="center" wrap="wrap">
              <Checkbox
                label="Écritures verrouillées masquées"
                checked={hideLocked}
                onChange={event => pushParams({ hideLocked: event.currentTarget.checked ? 'true' : null, page: '1' })}
              />
              <Checkbox
                label="Enveloppe vide"
                checked={emptyEnvelopeOnly}
                onChange={event => pushParams({ emptyEnvelopeOnly: event.currentTarget.checked ? 'true' : null, page: '1' })}
              />
              <Checkbox
                label="Opérations non validées"
                checked={unvalidatedOnly}
                onChange={event => pushParams({ unvalidatedOnly: event.currentTarget.checked ? 'true' : null, page: '1' })}
              />
              <Group gap={8} wrap="nowrap" align="center">
                <Text fz={CRUD.typographie.petiteTailleTexte} fw={700} c={TEXT_MUTED} tt="uppercase">
                  LOT
                </Text>
                <PositioningSelect
                  placeholder={accountId ? 'Tous les lots' : 'Choisir un compte'}
                  data={statementRefOptions}
                  value={statementRef || null}
                  onChange={value => pushParams({ statementRef: value, page: '1' })}
                  clearable
                  disabled={!accountId}
                  radius="md"
                  w={220}
                />
              </Group>
            </Group>
          </Stack>
        </Box>

        <Box
          style={{
            background: PANEL_BG,
            borderLeft: `1px solid ${GRAY_BORDER}`,
            borderRight: `1px solid ${GRAY_BORDER}`,
            borderBottom: `1px solid ${GRAY_BORDER}`,
            borderRadius: '0 0 var(--crud-list-panel-radius) var(--crud-list-panel-radius)',
            overflow: 'hidden',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
          }}
        >
          {deleteError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} m="md">
              {deleteError}
            </Alert>
          )}
          {hasSelectedAccount && listError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} m="md">
              Erreur lors du chargement des opérations.
            </Alert>
          )}

          {!hasSelectedAccount ? (
            <Center style={{ minHeight: 180, padding: 24 }}>
              <Text fz={CRUD.typographie.tailleTexte} c="dimmed">
                Sélectionnez un compte pour afficher les opérations.
              </Text>
            </Center>
          ) : listLoading ? (
            <Center style={{ minHeight: 180 }}>
              <Loader size="sm" />
            </Center>
          ) : (
            <Table withTableBorder={false} withColumnBorders={false} highlightOnHover={false} style={{ tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr style={{ borderTop: `1px solid ${GRAY_BORDER}`, borderBottom: `2px solid ${GRAY_BORDER}`, background: CRUD.couleurs.fondEnteteTableau }}>
                  {table.getHeaderGroups()[0]?.headers.map((header, index, headers) => (
                    <Table.Th
                      key={header.id}
                      style={{
                        ...thStyle(),
                        width: OPERATION_COLUMN_WIDTHS[header.column.id],
                        borderRight: index < headers.length - 1 ? `1px solid ${CRUD.couleurs.grilleTableau}` : 'none',
                        borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
                        background: CRUD.couleurs.fondEnteteTableau,
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {showTopEditor && (
                  <OperationsInlineEditor
                    columnsCount={columns.length}
                    id={isCreating ? undefined : editId ?? undefined}
                    initialOperation={
                      isCreating
                        ? undefined
                        : rows.find(row => row.original.id === editId)?.original
                    }
                    selectedAccountId={accountId || undefined}
                    selectedAccountLabel={selectedAccount?.name}
                    onDraftChange={setDraftOperation}
                    onCancel={closeEditor}
                    onSuccess={handleEditorSuccess}
                  />
                )}
                {rows.length === 0 && !showTopEditor ? (
                  <Table.Tr>
                    <Table.Td colSpan={columns.length} style={{ padding: 24 }}>
                      <Text fz={CRUD.typographie.tailleTexte} c="dimmed">Aucune opération.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  rows.map((row, index) => (
                    <Fragment key={row.id}>
                      {editId === row.original.id && (
                        <OperationsInlineEditor
                          columnsCount={columns.length}
                          id={editId}
                          initialOperation={row.original}
                          selectedAccountId={accountId || undefined}
                          selectedAccountLabel={selectedAccount?.name}
                          onDraftChange={setDraftOperation}
                          onCancel={closeEditor}
                          onSuccess={handleEditorSuccess}
                        />
                      )}
                      {editId !== row.original.id && (
                        <Table.Tr
                          ref={node => {
                            rowRefs.current[row.original.id] = node;
                          }}
                          onMouseEnter={() => setHoveredId(row.original.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onContextMenu={event => {
                            event.preventDefault();
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              operation: row.original,
                            });
                          }}
                          onDoubleClick={() => {
                            captureListState();
                            rememberViewportAnchor(row.original.id);
                            setMode(null);
                            setEditId(row.original.id);
                          }}
                          style={{
                            cursor: 'pointer',
                            background: getRowBackground(row.original, index, hoveredId, recentId),
                            borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
                          }}
                        >
                          {row.getVisibleCells().map((cell, cellIndex) => (
                            <Table.Td
                              key={cell.id}
                              style={{
                                ...tdStyle(cellIndex < row.getVisibleCells().length - 1),
                                width: OPERATION_COLUMN_WIDTHS[cell.column.id],
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      )}
                    </Fragment>
                  ))
                )}
              </Table.Tbody>
            </Table>
          )}
        </Box>

        {contextMenu && (
          <Box
            onClick={event => event.stopPropagation()}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              minWidth: 190,
              background: '#ffffff',
              border: `1px solid ${GRAY_BORDER}`,
              borderRadius: 10,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
              zIndex: 400,
              overflow: 'hidden',
            }}
          >
            {contextMenu.operation.thirdPartyId && (
              <Button
                variant="subtle"
                fullWidth
                justify="flex-start"
                radius={0}
                styles={{
                  root: {
                    height: 40,
                    color: '#334155',
                    borderBottom: `1px solid ${GRAY_BORDER}`,
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
                onClick={() => handleOpenThirdParty(contextMenu.operation)}
              >
                Tiers
              </Button>
            )}
            {contextMenu.operation.categoryId && (
              <Button
                variant="subtle"
                fullWidth
                justify="flex-start"
                radius={0}
                styles={{
                  root: {
                    height: 40,
                    color: '#334155',
                    borderBottom: `1px solid ${GRAY_BORDER}`,
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
                onClick={() => handleOpenCategory(contextMenu.operation)}
              >
                Catégorie
              </Button>
            )}
            {contextMenu.operation.budgetId && (
              <Button
                variant="subtle"
                fullWidth
                justify="flex-start"
                radius={0}
                styles={{
                  root: {
                    height: 40,
                    color: '#334155',
                    borderBottom: `1px solid ${GRAY_BORDER}`,
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
                onClick={() => handleOpenEnvelope(contextMenu.operation)}
              >
                Enveloppe
              </Button>
            )}
            {contextMenu.operation.budgetId && (
              <Button
                variant="subtle"
                fullWidth
                justify="flex-start"
                radius={0}
                styles={{
                  root: {
                    height: 40,
                    color: '#334155',
                    borderBottom: `1px solid ${GRAY_BORDER}`,
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
                onClick={() => handleOpenEnvelopeStatistics(contextMenu.operation)}
              >
                Statistiques de l&apos;enveloppe
              </Button>
            )}
            {isSplitOperation(contextMenu.operation) && (
              <Button
                variant="subtle"
                fullWidth
                justify="flex-start"
                radius={0}
                styles={{
                  root: {
                    height: 40,
                    color: '#334155',
                    borderBottom: `1px solid ${GRAY_BORDER}`,
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
                onClick={() => handleOpenSplitDetails(contextMenu.operation)}
              >
                Détail ventilation
              </Button>
            )}
            <Button
              variant="subtle"
              fullWidth
              justify="flex-start"
              leftSection={<IconCheck size={14} />}
              radius={0}
              styles={{
                root: {
                  height: 40,
                  color: '#334155',
                  borderBottom: `1px solid ${GRAY_BORDER}`,
                },
                inner: {
                  justifyContent: 'flex-start',
                },
              }}
              onClick={() => handleToggleValidation(contextMenu.operation)}
            >
              {isOperationValidated(contextMenu.operation) ? 'Passer en non validée' : 'Valider'}
            </Button>
            <Button
              variant="subtle"
              fullWidth
              justify="flex-start"
              leftSection={<IconWand size={14} />}
              radius={0}
              styles={{
                root: {
                  height: 40,
                  color: '#334155',
                },
                inner: {
                  justifyContent: 'flex-start',
                },
              }}
              onClick={() => handleOpenCreateRule(contextMenu.operation)}
            >
              Créer une règle de tiers…
            </Button>
          </Box>
        )}

        <CreateMatchingRuleModal
          opened={!!ruleModalOperation}
          onClose={() => setRuleModalOperation(null)}
          operation={ruleModalOperation}
        />

        <OperationSplitModal
          opened={!!splitDetailsOperation}
          onClose={() => setSplitDetailsOperation(null)}
          title={splitDetailsOperation ? `Ventilation de l'écriture - ${splitDetailsOperation.label}` : "Ventilation de l'écriture"}
          editable={false}
          rows={(splitDetailsOperation?.splits ?? []).map(split => ({
            id: split.id ?? `${split.label}-${split.expense}-${split.income}`,
            label: split.label ?? '',
            expense: split.expense,
            income: split.income,
            budgetId: split.budgetId,
            categoryId: split.categoryId,
            enveloppeLabel: split.enveloppe?.label ?? null,
            categorieLabel: split.categorie?.label ?? null,
          }))}
          remainingBalance={splitDetailsOperation
            ? normalizeRemainingBalance(
              (Number(splitDetailsOperation.income || 0) - Number(splitDetailsOperation.expense || 0))
              - (
                (splitDetailsOperation.splits ?? []).reduce(
                  (sum, split) => sum + (Number(split.income || 0) - Number(split.expense || 0)),
                  0,
                )
              ),
            )
            : null}
          splitExpense={(splitDetailsOperation?.splits ?? []).reduce((sum, split) => sum + Number(split.expense || 0), 0)}
          splitIncome={(splitDetailsOperation?.splits ?? []).reduce((sum, split) => sum + Number(split.income || 0), 0)}
        />

        <Group justify="space-between" align="center" style={{ padding: 'var(--crud-list-footer-padding-top) var(--crud-list-footer-padding-x)' }}>
          <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>
            {paginationHasSelectedAccount ? `${data?.total ?? 0} opérations` : 'Aucun compte sélectionné'}
          </Text>
          {paginationControls}
          <Box w={82} />
        </Group>
      </Stack>
    </Box>
  );
}
