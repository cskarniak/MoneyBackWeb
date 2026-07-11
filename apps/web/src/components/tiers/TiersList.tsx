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
import { useDeleteThirdParty, useThirdParties, type ThirdParty } from '@/hooks/useThirdParties';
import { exportPaginatedListToExcel } from '@/lib/export-excel';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

const LIMIT_OPTIONS = ['10', '20', '25', '50', '100'];

export function TiersList() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/');
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const search = searchParams.get('search') ?? '';
  const sortBy = (searchParams.get('sortBy') as 'name' | 'comment') ?? 'name';
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

  const { data, isLoading, error } = useThirdParties({ page, limit, search, sortBy, sortOrder });
  const deleteMutation = useDeleteThirdParty();

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

  const handleSort = (col: 'name' | 'comment') => {
    const newOrder = sortBy === col && sortOrder === 'asc' ? 'desc' : 'asc';
    pushParams({ sortBy: col, sortOrder: newOrder, page: '1' });
  };

  const handleSearch = () => pushParams({ search: searchInput, page: '1' });
  const handleClear = () => {
    setSearchInput('');
    pushParams({ search: null, page: '1' });
  };
  const handleLimitChange = (val: string | null) => {
    if (val) pushParams({ limit: val, page: '1' });
  };
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const count = await exportPaginatedListToExcel({
        endpoint: '/third-parties',
        params: { search, sortBy, sortOrder },
        headers: ['Nom', 'Commentaire', 'Actif'],
        mapItem: item => [item.name, item.comment as string | null | undefined, item.active as boolean | undefined],
        filenameBase: 'tiers',
      });
      notifications.show({ message: `${count} tiers exporté(s)`, color: 'green' });
    } catch {
      notifications.show({ message: "Impossible d'exporter les tiers.", color: 'red' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (tiers: ThirdParty) => {
    setDeleteError(null);
    if (!window.confirm(`Supprimer le tiers "${tiers.name}" ?`)) return;
    try {
      await deleteMutation.mutateAsync(tiers.id);
      notifications.show({ message: `"${tiers.name}" supprimé`, color: 'red' });
    } catch {
      setDeleteError(`Impossible de supprimer "${tiers.name}". Il est peut-être utilisé par des opérations ou des abonnements.`);
    }
  };

  const sortIcon = (col: string) =>
    sortBy === col ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '';

  const thStyle = (col?: 'name' | 'comment') => ({
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
      case 'active':
        return '88px';
      case 'actions':
        return '144px';
      default:
        return undefined;
    }
  };

  const columns = useMemo<ColumnDef<ThirdParty>[]>(
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
        accessorKey: 'name',
        header: () => (
          <span style={thStyle('name')} onClick={() => handleSort('name')}>
            Nom{sortIcon('name')}
          </span>
        ),
        cell: ({ row, getValue }) => <Text fz={CRUD.typographie.tailleTexte} fw={recentId === row.original.id ? 700 : 600}>{getValue() as string}</Text>,
      },
      {
        accessorKey: 'comment',
        header: () => (
          <span style={thStyle('comment')} onClick={() => handleSort('comment')}>
            Bloc note{sortIcon('comment')}
          </span>
        ),
        cell: ({ row, getValue }) => <Text fz={CRUD.typographie.tailleTexte} fw={recentId === row.original.id ? 700 : 400}>{(getValue() as string | null) ?? '—'}</Text>,
      },
      {
        id: 'active',
        header: () => <span style={{ ...thStyle(), textAlign: 'center', display: 'block' }}>Actif</span>,
        cell: ({ row }) => <Text fz={CRUD.typographie.tailleTexte} fw={700} ta="center">{row.original.active ? '✓' : ''}</Text>,
      },
      {
        id: 'actions',
        header: () => <span style={{ ...thStyle() }}>Actions</span>,
        cell: ({ row }) => (
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => router.push(`/referentiels/tiers/${row.original.id}`)}
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
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Liste des tiers</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={handleClose}>
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
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap={8}>
              <Button variant="default" leftSection={<IconMenu2 size={14} />} radius="md" style={toolbarButtonStyle}>
                Menu
              </Button>
              <Button leftSection={<IconPlus size={14} />} radius="md" style={primaryButtonStyle} onClick={() => router.push('/referentiels/tiers/new')}>
                Nouveau
              </Button>
            </Group>

            <Group gap={8} wrap="nowrap">
              <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>Afficher</Text>
              <Select value={String(limit)} onChange={handleLimitChange} data={LIMIT_OPTIONS} w={78} radius="md" />
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
              <Button variant="default" radius="md" leftSection={<IconDownload size={14} />} onClick={handleExport} loading={isExporting} style={toolbarButtonStyle}>
                Excel
              </Button>
            </Group>
          </Group>
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

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} m="md">
              Erreur lors du chargement des tiers.
            </Alert>
          )}

          {isLoading ? (
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
                        width: getColumnWidth(header.column.id),
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
                {table.getRowModel().rows.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={columns.length} style={{ padding: 24 }}>
                      <Text fz={CRUD.typographie.tailleTexte} c="dimmed">Aucun tiers.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => (
                    <Table.Tr
                      key={row.id}
                      onMouseEnter={() => setHoveredId(row.original.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        cursor: 'pointer',
                        background:
                          hoveredId === row.original.id
                            ? CRUD.couleurs.fondLigneSurvol
                            : index % 2 === 1
                              ? CRUD.couleurs.fondLignePaire
                              : CRUD.couleurs.fondLigneImpaire,
                        borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
                      }}
                    >
                      {row.getVisibleCells().map((cell, cellIndex) => (
                        <Table.Td
                          key={cell.id}
                          style={tdStyle(cellIndex < row.getVisibleCells().length - 1)}
                          onClick={cell.column.id === 'actions' ? undefined : () => router.push(`/referentiels/tiers/${row.original.id}`)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          )}
        </Box>

        <Group justify="space-between" align="center" style={{ padding: 'var(--crud-list-footer-padding-top) var(--crud-list-footer-padding-x)' }}>
          <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>
            {data?.total ?? 0} tiers
          </Text>

          <Group gap={6} justify="center">
            <Button
              variant="default"
              radius="md"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              Précédent
            </Button>
            <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px' }}>
              Page {page} sur {Math.max(totalPages, 1)}
            </Text>
            <Button
              variant="default"
              radius="md"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
            >
              Suivant
            </Button>
          </Group>

          <Box w={82} />
        </Group>
      </Stack>
    </Box>
  );
}
