'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
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
import { useDeleteEnveloppe, useEnveloppes, type Enveloppe } from '@/hooks/useEnveloppes';
import { exportPaginatedListToExcel } from '@/lib/export-excel';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const LIMIT_OPTIONS = ['10', '20', '25', '50', '100'];

export function EnveloppesList() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/');
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const search = searchParams.get('search') ?? '';
  const sortBy = (searchParams.get('sortBy') as 'label' | 'regroupement') ?? 'label';
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

  const { data, isLoading, error } = useEnveloppes({ page, limit, search, sortBy, sortOrder });
  const deleteMutation = useDeleteEnveloppe();

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

  const handleSort = (col: 'label' | 'regroupement') => {
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
        endpoint: '/budgets',
        params: { search, sortBy, sortOrder },
        headers: ['Libellé', 'Regroupement', 'Synthèse', 'Regroupement TB', 'Actif'],
        mapItem: item => [
          item.label,
          ((item.regroupement as { label?: string } | null | undefined)?.label)
            ?? ((item.grouping as { label?: string } | null | undefined)?.label)
            ?? '',
          item.summary as boolean | undefined,
          ((item.regroupementTableauDeBord as { label?: string } | null | undefined)?.label)
            ?? ((item.dashboardGrouping as { label?: string } | null | undefined)?.label)
            ?? '',
          item.active as boolean | undefined,
        ],
        filenameBase: 'enveloppes',
      });
      notifications.show({ message: `${count} enveloppe(s) exportée(s)`, color: 'green' });
    } catch {
      notifications.show({ message: "Impossible d'exporter les enveloppes.", color: 'red' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (enveloppe: Enveloppe) => {
    setDeleteError(null);
    if (!window.confirm(`Supprimer l'enveloppe "${enveloppe.label}" ?`)) return;
    try {
      await deleteMutation.mutateAsync(enveloppe.id);
      notifications.show({ message: `"${enveloppe.label}" supprimée`, color: 'red' });
    } catch {
      setDeleteError(`Impossible de supprimer "${enveloppe.label}". Elle est peut-être utilisée par des opérations.`);
    }
  };

  const sortIcon = (col: string) => (sortBy === col ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '');

  const thStyle = (col?: 'label' | 'regroupement') => ({
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
      case 'regroupement':
        return '180px';
      case 'regroupementTableauDeBord':
        return '180px';
      case 'summary':
      case 'active':
        return '90px';
      case 'actions':
        return '144px';
      default:
        return undefined;
    }
  };

  const columns = useMemo<ColumnDef<Enveloppe>[]>(
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
        cell: ({ row, getValue }) => <Text fz={CRUD.typographie.tailleTexte} fw={recentId === row.original.id ? 700 : 600} truncate title={getValue() as string}>{getValue() as string}</Text>,
      },
      {
        id: 'regroupement',
        header: () => (
          <span style={thStyle('regroupement')} onClick={() => handleSort('regroupement')}>
            Regroupement{sortIcon('regroupement')}
          </span>
        ),
        cell: ({ row }) => (
          <Text fz={CRUD.typographie.tailleTexte} fw={recentId === row.original.id ? 700 : 400} c={row.original.regroupement ? undefined : 'dimmed'} truncate title={row.original.regroupement?.label}>
            {row.original.regroupement?.label ?? '—'}
          </Text>
        ),
      },
      {
        id: 'summary',
        header: () => <span style={{ ...thStyle(), textAlign: 'center', display: 'block' }}>Synthèse</span>,
        cell: ({ row }) => <Text fz={CRUD.typographie.tailleTexte} fw={700} ta="center">{row.original.summary ? '✓' : ''}</Text>,
      },
      {
        id: 'regroupementTableauDeBord',
        header: () => <span style={thStyle()}>Regroupement TB</span>,
        cell: ({ row }) => (
          <Text fz={CRUD.typographie.tailleTexte} fw={recentId === row.original.id ? 700 : 400} c={row.original.regroupementTableauDeBord ? undefined : 'dimmed'} truncate title={row.original.regroupementTableauDeBord?.label}>
            {row.original.regroupementTableauDeBord?.label ?? '—'}
          </Text>
        ),
      },
      {
        id: 'active',
        header: () => <span style={{ ...thStyle(), textAlign: 'center', display: 'block' }}>Actif</span>,
        cell: ({ row }) => <Text fz={CRUD.typographie.tailleTexte} fw={700} ta="center">{row.original.active ? '✓' : ''}</Text>,
      },
      {
        id: 'actions',
        header: () => <span style={thStyle()}>Actions</span>,
        cell: ({ row }) => (
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => router.push(`/referentiels/enveloppes/${row.original.id}`)}
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
            <Text inherit fw={700}>Liste des enveloppes</Text>
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
          <Group justify="space-between" wrap="nowrap">
            <Group gap={8} wrap="nowrap">
              <Button size="sm" radius="md" variant="default" leftSection={<IconMenu2 size={13} />} style={toolbarButtonStyle}>
                Menu
              </Button>
              <Button
                size="sm"
                radius="md"
                leftSection={<IconPlus size={13} />}
                onClick={() => router.push('/referentiels/enveloppes/new')}
                style={primaryButtonStyle}
              >
                Nouveau
              </Button>
            </Group>
            <Group gap={8} wrap="nowrap">
              <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED}>Afficher</Text>
              <Select size="sm" radius="md" value={String(limit)} onChange={handleLimitChange} data={LIMIT_OPTIONS} style={{ width: 78 }} />
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
            style={{ background: '#fff5f5', border: '1px solid #ffc9c9', borderTop: 'none', borderRadius: 0, padding: '10px 14px' }}
            onClose={() => setDeleteError(null)}
            withCloseButton
          >
            <Text size="sm">{deleteError}</Text>
          </Alert>
        )}

        {error && (
          <Alert color="red" style={{ background: '#fff5f5', border: '1px solid #ffc9c9', borderTop: 'none', borderRadius: 0, padding: '10px 14px' }}>
            <Text size="sm">Erreur lors du chargement des enveloppes.</Text>
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
                <Table.Tr style={{ borderTop: `1px solid ${GRAY_BORDER}`, borderBottom: `2px solid ${GRAY_BORDER}`, background: CRUD.couleurs.fondEnteteTableau }}>
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
                      <Text fz={CRUD.typographie.tailleTexte} c="dimmed">Aucune enveloppe.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  table.getRowModel().rows.map((row, i) => (
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
                        borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
                        transition: 'background-color 140ms ease',
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <Table.Td
                          key={cell.id}
                          style={{ ...tdStyle(cell.column.id !== 'actions'), width: getColumnWidth(cell.column.id) }}
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

        <Box
          style={{
            padding: 'var(--crud-list-footer-padding-top) var(--crud-list-footer-padding-x) 0',
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
            {data ? `${data.total} enveloppe${data.total !== 1 ? 's' : ''}` : '…'}
          </Text>
          <Group gap={6} justify="center">
            <Button size="sm" radius="md" variant="default" style={toolbarButtonStyle} disabled={page <= 1} onClick={() => pushParams({ page: String(page - 1) })}>
              Précédent
            </Button>
            <Text fz={CRUD.typographie.tailleTexte} c={TEXT_MUTED} style={{ lineHeight: '34px' }}>
              Page {page} sur {totalPages || 1}
            </Text>
            <Button size="sm" radius="md" variant="default" style={toolbarButtonStyle} disabled={page >= totalPages} onClick={() => pushParams({ page: String(page + 1) })}>
              Suivant
            </Button>
          </Group>
        </Box>
      </Stack>
    </Box>
  );
}
