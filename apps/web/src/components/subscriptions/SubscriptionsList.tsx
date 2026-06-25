'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Box,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Text,
  ActionIcon,
  Alert,
  Loader,
  Center,
  Stack,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconAlertCircle,
  IconMenu2,
  IconDownload,
} from '@tabler/icons-react';
import { useDeleteSubscription, useSubscriptions, type Subscription } from '@/hooks/useSubscriptions';
import { exportPaginatedListToExcel } from '@/lib/export-excel';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const LIMIT_OPTIONS = ['10', '20', '25', '50', '100'];

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

function periodicityLabel(value: string) {
  switch (value) {
    case 'daily':
      return 'Quotidien';
    case 'weekly':
      return 'Hebdo';
    case 'monthly':
      return 'Mensuel';
    case 'bimonthly':
      return '2 mois';
    case 'quarterly':
      return 'Trimestriel';
    case 'semiannual':
      return 'Semestriel';
    case 'annual':
      return 'Annuel';
    default:
      return value;
  }
}

export function SubscriptionsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const search = searchParams.get('search') ?? '';
  const periodicity =
    (searchParams.get('periodicity') as 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | null)
    ?? undefined;
  const sortBy =
    (searchParams.get('sortBy') as 'label' | 'nextDueDate' | 'firstDueDate' | 'periodicity')
    ?? 'nextDueDate';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'asc';
  const highlight = searchParams.get('highlight');

  const [searchInput, setSearchInput] = useState(search);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const { data, isLoading, error } = useSubscriptions({
    page,
    limit,
    search,
    periodicity,
    sortBy,
    sortOrder,
  });
  const deleteMutation = useDeleteSubscription();

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

  const handleSort = (col: 'label' | 'nextDueDate' | 'firstDueDate' | 'periodicity') => {
    const newOrder = sortBy === col && sortOrder === 'asc' ? 'desc' : 'asc';
    pushParams({ sortBy: col, sortOrder: newOrder, page: '1' });
  };

  const handleSearch = () => pushParams({ search: searchInput, page: '1' });
  const handleClear = () => {
    setSearchInput('');
    pushParams({ search: null, periodicity: null, page: '1' });
  };
  const handleLimitChange = (val: string | null) => {
    if (val) pushParams({ limit: val, page: '1' });
  };
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const count = await exportPaginatedListToExcel({
        endpoint: '/subscriptions',
        params: { search, periodicity, sortBy, sortOrder },
        headers: ['Libellé', 'Ventilation', 'Périodicité', 'Prochaine échéance', 'Compte'],
        mapItem: item => [
          item.label,
          (item.hasSplits as boolean | undefined) ? 'Ventilé' : 'Simple',
          periodicityLabel(String(item.periodicity ?? '')),
          formatDate(item.nextDueDate as string | null | undefined),
          ((item.compte as { name?: string } | null | undefined)?.name)
            ?? ((item.account as { name?: string } | null | undefined)?.name)
            ?? '',
        ],
        filenameBase: 'abonnements',
      });
      notifications.show({ message: `${count} abonnement(s) exporté(s)`, color: 'green' });
    } catch {
      notifications.show({ message: "Impossible d'exporter les abonnements.", color: 'red' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (subscription: Subscription) => {
    setDeleteError(null);
    if (!window.confirm(`Supprimer l'abonnement "${subscription.label}" ?`)) return;
    try {
      await deleteMutation.mutateAsync(subscription.id);
      notifications.show({ message: `"${subscription.label}" supprimé`, color: 'red' });
    } catch {
      setDeleteError(`Impossible de supprimer "${subscription.label}".`);
    }
  };

  const sortIcon = (col: string) => (sortBy === col ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '');

  const thStyle = (col?: 'label' | 'nextDueDate' | 'firstDueDate' | 'periodicity') => ({
    padding: `${CRUD.liste.paddingVerticalEntete}px ${CRUD.liste.paddingHorizontalEntete}px`,
    fontSize: CRUD.typographie.petiteTailleTexte,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    cursor: col ? 'pointer' : 'default',
    userSelect: 'none' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  });

  const tdStyle = (hasRightBorder: boolean, withBottomBorder = true) => ({
    padding: `${CRUD.liste.paddingVerticalLigne}px ${CRUD.liste.paddingHorizontalLigne}px`,
    borderRight: hasRightBorder ? `1px solid ${CRUD.couleurs.grilleTableau}` : 'none',
    borderBottom: withBottomBorder ? `1px solid ${CRUD.couleurs.grilleTableau}` : 'none',
    verticalAlign: 'middle' as const,
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

  const getColumnWidth = (columnId: string) => {
    switch (columnId) {
      case 'cursor':
        return '22px';
      case 'splitStatus':
        return '120px';
      case 'periodicity':
        return '120px';
      case 'nextDueDate':
        return '160px';
      case 'compte':
        return '180px';
      case 'actions':
        return '144px';
      default:
        return undefined;
    }
  };

  const columns = useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        id: 'cursor',
        header: () => <span style={thStyle()} />,
        cell: ({ row }) => (
          <Text fz={11} fw={700} lh={1} ta="center" c={recentId === row.original.id ? '#4c73f0' : 'transparent'}>
            ▶
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
        cell: ({ row, getValue }) => (
          <Stack gap={2}>
            <Text fz={CRUD.typographie.tailleTexte} fw={recentId === row.original.id ? 700 : 600}>
              {getValue() as string}
            </Text>
          </Stack>
        ),
      },
      {
        id: 'splitStatus',
        header: () => <span style={thStyle()}>Ventilation</span>,
        cell: ({ row }) => (
          <Badge size="sm" variant={row.original.hasSplits ? 'light' : 'outline'}>
            {row.original.hasSplits ? 'Ventilé' : 'Non ventilé'}
          </Badge>
        ),
      },
      {
        accessorKey: 'periodicity',
        header: () => (
          <span style={thStyle('periodicity')} onClick={() => handleSort('periodicity')}>
            Périodicité{sortIcon('periodicity')}
          </span>
        ),
        cell: ({ getValue }) => (
          <Text fz={CRUD.typographie.tailleTexte}>{periodicityLabel(getValue() as string)}</Text>
        ),
      },
      {
        accessorKey: 'nextDueDate',
        header: () => (
          <span style={thStyle('nextDueDate')} onClick={() => handleSort('nextDueDate')}>
            Prochaine échéance{sortIcon('nextDueDate')}
          </span>
        ),
        cell: ({ getValue }) => (
          <Text fz={CRUD.typographie.tailleTexte}>{formatDate(getValue() as string | null)}</Text>
        ),
      },
      {
        id: 'compte',
        header: () => <span style={thStyle()}>Compte</span>,
        cell: ({ row }) => (
          <Text fz={CRUD.typographie.tailleTexte}>{row.original.compte?.name ?? '—'}</Text>
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
              onClick={() => router.push(`/abonnements/${row.original.id}`)}
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
          </Group>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, sortOrder, deleteMutation.isPending, recentId],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

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
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
        >
          Liste des abonnements
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
          <Group justify="space-between" wrap="nowrap">
            <Group gap={8} wrap="nowrap">
              <Button
                size="sm"
                radius="md"
                variant="default"
                leftSection={<IconMenu2 size={13} />}
                style={toolbarButtonStyle}
              >
                Menu
              </Button>
              <Button
                size="sm"
                radius="md"
                leftSection={<IconPlus size={13} />}
                onClick={() => router.push('/abonnements/new')}
                style={primaryButtonStyle}
              >
                Nouveau
              </Button>
            </Group>
            <Group gap={8} wrap="nowrap">
              <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>Afficher</Text>
              <Select
                size="sm"
                radius="md"
                value={String(limit)}
                onChange={handleLimitChange}
                data={LIMIT_OPTIONS}
                style={{ width: 78 }}
                aria-label="Afficher"
              />
              <Select
                size="sm"
                radius="md"
                value={periodicity ?? null}
                onChange={value => pushParams({ periodicity: value, page: '1' })}
                placeholder="Périodicité"
                clearable
                data={[
                  { value: 'daily', label: 'Quotidien' },
                  { value: 'weekly', label: 'Hebdo' },
                  { value: 'monthly', label: 'Mensuel' },
                  { value: 'bimonthly', label: '2 mois' },
                  { value: 'quarterly', label: 'Trimestriel' },
                  { value: 'semiannual', label: 'Semestriel' },
                  { value: 'annual', label: 'Annuel' },
                ]}
                style={{ width: 150 }}
              />
              <TextInput
                size="sm"
                radius="md"
                placeholder="Recherche..."
                value={searchInput}
                onChange={e => setSearchInput(e.currentTarget.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ width: 220 }}
              />
              <ActionIcon size="lg" radius="md" variant="default" onClick={handleSearch} title="Rechercher">
                <IconSearch size={13} />
              </ActionIcon>
              <Button size="sm" radius="md" variant="default" onClick={handleClear} style={toolbarButtonStyle}>
                Clear
              </Button>
              <Button size="sm" radius="md" variant="default" leftSection={<IconDownload size={13} />} onClick={handleExport} loading={isExporting} style={toolbarButtonStyle}>
                Excel
              </Button>
            </Group>
          </Group>
        </Box>

        {deleteError && (
          <Alert
            color="red"
            icon={<IconAlertCircle size={14} />}
            style={{
              background: '#fff5f5',
              border: '1px solid #ffc9c9',
              borderTop: 'none',
              borderRadius: 0,
              padding: '10px 14px',
            }}
            onClose={() => setDeleteError(null)}
            withCloseButton
          >
            <Text size="sm">{deleteError}</Text>
          </Alert>
        )}

        {error && (
          <Alert
            color="red"
            style={{
              background: '#fff5f5',
              border: '1px solid #ffc9c9',
              borderTop: 'none',
              borderRadius: 0,
              padding: '10px 14px',
            }}
          >
            <Text size="sm">Erreur lors du chargement des abonnements.</Text>
          </Alert>
        )}

        <Box
          style={{
            border: `1px solid ${GRAY_BORDER}`,
            borderTop: 'none',
            background: PANEL_BG,
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
            borderRadius: '0 0 var(--crud-list-panel-radius) var(--crud-list-panel-radius)',
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            <Center style={{ minHeight: 120 }}>
              <Loader size="sm" />
            </Center>
          ) : (
            <Table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
              <Table.Thead>
                <Table.Tr
                  style={{
                    borderTop: `1px solid ${GRAY_BORDER}`,
                    borderBottom: `2px solid ${GRAY_BORDER}`,
                    background: CRUD.couleurs.fondEnteteTableau,
                  }}
                >
                  {table.getHeaderGroups()[0]?.headers.map((header, index, headers) => (
                    <Table.Th
                      key={header.id}
                      style={{
                        padding: 0,
                        width: getColumnWidth(header.column.id),
                        borderRight: index < headers.length - 1 ? `1px solid ${CRUD.couleurs.grilleTableau}` : 'none',
                        borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
                        fontWeight: 700,
                        fontSize: 11,
                        background: CRUD.couleurs.fondEnteteTableau,
                        color: '#4a5568',
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={columns.length} style={{ padding: '16px', textAlign: 'center' }}>
                      <Text fz={CRUD.typographie.tailleTexte} c="dimmed">Aucun abonnement.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  table.getRowModel().rows.map((row, i) => {
                    const isLastRow = i === table.getRowModel().rows.length - 1;

                    return (
                    <Table.Tr
                      key={row.id}
                      onMouseEnter={() => setHoveredId(row.original.id)}
                      onMouseLeave={() => setHoveredId(current => (current === row.original.id ? null : current))}
                      style={{
                        background:
                          hoveredId === row.original.id
                            ? CRUD.couleurs.fondLigneSurvol
                            : i % 2 === 1
                              ? CRUD.couleurs.fondLignePaire
                              : CRUD.couleurs.fondLigneImpaire,
                        transition: 'background-color 140ms ease',
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <Table.Td
                          key={cell.id}
                          style={{
                            ...tdStyle(cell.column.id !== 'actions', !isLastRow),
                            width: getColumnWidth(cell.column.id),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          )}
        </Box>

        <Box
          style={{
            padding:
              'var(--crud-list-footer-padding-top) var(--crud-list-footer-padding-x) 0',
            background: 'transparent',
            position: 'relative',
            minHeight: 42,
          }}
        >
          <Text
            fz={CRUD.typographie.tailleTexte}
            c={TEXT_MUTED}
            style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }}
          >
            {data ? `${data.total} abonnement${data.total !== 1 ? 's' : ''}` : '…'}
          </Text>
          <Group gap={6} justify="center">
            <Button
              size="sm"
              radius="md"
              variant="default"
              style={toolbarButtonStyle}
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              Précédent
            </Button>
            <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px' }}>
              Page {page} sur {totalPages || 1}
            </Text>
            <Button
              size="sm"
              radius="md"
              variant="default"
              style={toolbarButtonStyle}
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
            >
              Suivant
            </Button>
          </Group>
        </Box>
      </Stack>
    </Box>
  );
}
