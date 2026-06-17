'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Fragment, useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import {
  Box,
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
import { IconPlus, IconPencil, IconTrash, IconSearch, IconAlertCircle, IconMenu2, IconCheck } from '@tabler/icons-react';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useDeleteOperation, useOperations, useUpdateOperation, type Operation } from '@/hooks/useOperations';
import { OperationSplitModal } from './OperationSplitModal';
import { OperationsInlineEditor } from './OperationsInlineEditor';

const GRAY_BORDER = '#dee2e6';
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const UNVALIDATED_TEXT = '#b26a00';
const LIMIT_OPTIONS = ['5', '10', '25', '50', '100'];
const OPERATIONS_ROW_FONT_SIZE = 12;
const SPLIT_BALANCED_BG = '#fff4b8';
const SPLIT_UNBALANCED_BG = '#ffd0ea';
const OPERATION_COLUMN_WIDTHS: Record<string, string> = {
  cursor: '22px',
  operationDate: '110px',
  label: '30%',
  tiers: '14%',
  categorie: '14%',
  enveloppe: '14%',
  expense: '96px',
  income: '96px',
  actions: '148px',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
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
  const limit = Number(searchParams.get('limit') ?? '10');
  const search = searchParams.get('search') ?? '';
  const accountId = searchParams.get('accountId') ?? '';
  const hideLocked = searchParams.get('hideLocked') === 'true';
  const hideReconciled = searchParams.get('hideReconciled') === 'true';
  const emptyEnvelopeOnly = searchParams.get('emptyEnvelopeOnly') === 'true';
  const unvalidatedOnly = searchParams.get('unvalidatedOnly') === 'true';
  const sortBy = (searchParams.get('sortBy') as 'operationDate' | 'label' | 'expense' | 'income') ?? 'operationDate';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  const highlight = searchParams.get('highlight');
  const editId = searchParams.get('edit');
  const mode = searchParams.get('mode');
  const isCreating = mode === 'new';
  const isEditing = !!editId;
  const [searchInput, setSearchInput] = useState(search);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draftOperation, setDraftOperation] = useState<{ id?: string; accountId: string; expense: number; income: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; operation: Operation } | null>(null);
  const [splitDetailsOperation, setSplitDetailsOperation] = useState<Operation | null>(null);

  useEffect(() => {
    if (highlight) {
      setRecentId(highlight);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('highlight');
      const qs = params.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

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
    search,
    accountId: accountId || undefined,
    hideLocked,
    hideReconciled,
    emptyEnvelopeOnly,
    unvalidatedOnly,
    sortBy,
    sortOrder,
  }, { enabled: !!accountId });
  const { data: accounts = [] } = useAccountsAll();
  const selectedAccount = accounts.find(account => account.id === accountId) ?? null;
  const hasSelectedAccount = !!accountId;
  const deleteMutation = useDeleteOperation();
  const updateMutation = useUpdateOperation();
  const openingBalance = Number(selectedAccount?.openingBalance ?? 0);
  const loadedOperationsBalance = useMemo(
    () => (data?.items ?? []).reduce((total, operation) => total + getOperationNet(operation), openingBalance),
    [data?.items, openingBalance],
  );
  const displayedBalance = useMemo(() => {
    if (!draftOperation || !accountId || draftOperation.accountId !== accountId) {
      return loadedOperationsBalance;
    }

    const originalOperation = draftOperation.id
      ? (data?.items ?? []).find(operation => operation.id === draftOperation.id)
      : null;
    const originalNet = originalOperation ? getOperationNet(originalOperation) : 0;
    const draftNet = draftOperation.income - draftOperation.expense;

    return loadedOperationsBalance - originalNet + draftNet;
  }, [accountId, data?.items, draftOperation, loadedOperationsBalance]);

  useEffect(() => {
    if (!draftOperation?.id || !data?.items) return;

    const persistedOperation = data.items.find(operation => operation.id === draftOperation.id);
    if (!persistedOperation) return;

    const persistedNet = getOperationNet(persistedOperation);
    const draftNet = draftOperation.income - draftOperation.expense;

    if (Math.abs(persistedNet - draftNet) < 0.005) {
      setDraftOperation(null);
    }
  }, [data?.items, draftOperation]);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== null && v !== '') params.set(k, v);
        else params.delete(k);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const handleSort = (col: 'operationDate' | 'label' | 'expense' | 'income') => {
    const newOrder = sortBy === col && sortOrder === 'asc' ? 'desc' : 'asc';
    pushParams({ sortBy: col, sortOrder: newOrder, page: '1' });
  };

  const handleSearch = () => pushParams({ search: searchInput, page: '1' });
  const handleClear = () => {
    setSearchInput('');
    pushParams({
      search: null,
      accountId: null,
      hideLocked: null,
      hideReconciled: null,
      emptyEnvelopeOnly: null,
      unvalidatedOnly: null,
      page: '1',
    });
  };

  const handleNew = () => {
    if (!accountId) {
      notifications.show({
        message: 'Sélectionnez un compte avant de créer une opération.',
        color: 'orange',
      });
      return;
    }

    pushParams({ mode: 'new', edit: null });
  };

  const handleDelete = async (operation: Operation) => {
    setContextMenu(null);
    setDeleteError(null);
    if (!window.confirm(`Supprimer l'opération "${operation.label}" ?`)) return;
    try {
      await deleteMutation.mutateAsync(operation.id);
      notifications.show({ message: `"${operation.label}" supprimée`, color: 'red' });
    } catch {
      setDeleteError(`Impossible de supprimer "${operation.label}".`);
    }
  };

  const handleToggleValidation = async (operation: Operation) => {
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
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 600} lh={1} style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
            {row.original.label}
          </Text>
        ),
      },
      {
        id: 'tiers',
        header: () => <span style={thStyle()}>Tiers</span>,
        cell: ({ row }) => (
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 400} lh={1} style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
            {row.original.tiers?.name ?? '—'}
          </Text>
        ),
      },
      {
        id: 'categorie',
        header: () => <span style={thStyle()}>Catégorie</span>,
        cell: ({ row }) => (
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 400} lh={1} style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
            {row.original.splits.length > 0 ? 'Ventilé' : (row.original.categorie?.label ?? '—')}
          </Text>
        ),
      },
      {
        id: 'enveloppe',
        header: () => <span style={thStyle()}>Enveloppe</span>,
        cell: ({ row }) => (
          <Text fz={OPERATIONS_ROW_FONT_SIZE} fw={cursorTargetId === row.original.id ? 700 : 400} lh={1} style={rowTextStyle(row.original, cursorTargetId === row.original.id)}>
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
            <ActionIcon variant="subtle" size="md" onClick={() => pushParams({ edit: row.original.id, mode: null })} title="Modifier" style={actionIconStyle}>
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
          </Group>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder, deleteMutation.isPending, cursorTargetId],
  );

  const table = useReactTable({
    data: hasSelectedAccount ? (data?.items ?? []) : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  const rows = table.getRowModel().rows;
  const showTopEditor = hasSelectedAccount && (isCreating || (isEditing && !rows.some(row => row.original.id === editId)));

  const closeEditor = () => {
    setDraftOperation(null);
    pushParams({ edit: null, mode: null });
  };
  const handleEditorSuccess = (savedId: string) => {
    notifications.show({
      message: isCreating ? "Opération créée" : 'Opération mise à jour',
      color: 'green',
    });
    pushParams({ edit: null, mode: null, highlight: savedId });
  };

  return (
    <Box style={{ maxWidth: 'var(--crud-list-max-width)', margin: '0 auto' }}>
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
          Liste des opérations
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
                <Button variant="default" leftSection={<IconMenu2 size={14} />} radius="md" style={toolbarButtonStyle}>
                  Menu
                </Button>
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
              </Group>
            </Group>

            <Group justify="flex-start" align="flex-end" wrap="nowrap">
              <Box style={{ minWidth: 320 }}>
                <Text fz={CRUD.typographie.petiteTailleTexte} fw={700} c={TEXT_MUTED} mb={4} tt="uppercase">
                  Compte
                </Text>
                <Group gap={8} wrap="nowrap">
                  <Select
                    placeholder="Sélectionner un compte"
                    data={accountOptions}
                    value={accountId || null}
                    onChange={val => pushParams({ accountId: val, page: '1' })}
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
                label="Écritures rapprochées masquées"
                checked={hideReconciled}
                onChange={event => pushParams({ hideReconciled: event.currentTarget.checked ? 'true' : null, page: '1' })}
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
          {hasSelectedAccount && error && (
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
          ) : isLoading ? (
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
                          selectedAccountId={accountId || undefined}
                          selectedAccountLabel={selectedAccount?.name}
                          onDraftChange={setDraftOperation}
                          onCancel={closeEditor}
                          onSuccess={handleEditorSuccess}
                        />
                      )}
                      {editId !== row.original.id && (
                        <Table.Tr
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
                          onDoubleClick={() => pushParams({ edit: row.original.id, mode: null })}
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
                },
                inner: {
                  justifyContent: 'flex-start',
                },
              }}
              onClick={() => handleToggleValidation(contextMenu.operation)}
            >
              {isOperationValidated(contextMenu.operation) ? 'Passer en non validée' : 'Valider'}
            </Button>
          </Box>
        )}

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
            ? (Number(splitDetailsOperation.income || 0) - Number(splitDetailsOperation.expense || 0))
              - (
                (splitDetailsOperation.splits ?? []).reduce(
                  (sum, split) => sum + (Number(split.income || 0) - Number(split.expense || 0)),
                  0,
                )
              )
            : null}
          splitExpense={(splitDetailsOperation?.splits ?? []).reduce((sum, split) => sum + Number(split.expense || 0), 0)}
          splitIncome={(splitDetailsOperation?.splits ?? []).reduce((sum, split) => sum + Number(split.income || 0), 0)}
        />

        <Group justify="space-between" align="center" style={{ padding: 'var(--crud-list-footer-padding-top) var(--crud-list-footer-padding-x)' }}>
          <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>
            {hasSelectedAccount ? `${data?.total ?? 0} opérations` : 'Aucun compte sélectionné'}
          </Text>
          <Group gap={6} justify="center">
            <Button variant="default" radius="md" disabled={!hasSelectedAccount || page <= 1} onClick={() => pushParams({ page: String(page - 1) })}>
              Précédent
            </Button>
            <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px' }}>
              Page {hasSelectedAccount ? page : 0} sur {hasSelectedAccount ? Math.max(totalPages, 1) : 0}
            </Text>
            <Button variant="default" radius="md" disabled={!hasSelectedAccount || page >= totalPages} onClick={() => pushParams({ page: String(page + 1) })}>
              Suivant
            </Button>
          </Group>
          <Box w={82} />
        </Group>
      </Stack>
    </Box>
  );
}
