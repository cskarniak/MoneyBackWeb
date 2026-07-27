'use client';

import { useMemo, useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useAccountsAll } from '@/hooks/useAccounts';
import {
  useMonthlyCategoryDashboard,
  type MonthlyCategoryDashboardFilters,
} from '@/hooks/useMonthlyCategoryDashboard';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { openSecondaryTab } from '@/lib/secondary-tab';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';
const NEGATIVE_AMOUNT = '#c92a2a';

function formatAmount(value: string) {
  return Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toMonthDateBounds(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = `${monthKey}-01`;
  const lastDayDate = new Date(year, month, 0).getDate();
  const lastDay = `${monthKey}-${String(lastDayDate).padStart(2, '0')}`;
  return { firstDay, lastDay };
}

function getDefaultRange(): [Date, Date] {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 1);
  return [from, to];
}

export function MonthlyCategoryDashboardWorkspace() {
  const { data: accounts = [] } = useAccountsAll();
  const [defaultFrom, defaultTo] = useMemo(getDefaultRange, []);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [monthFrom, setMonthFrom] = useState<Date | null>(defaultFrom);
  const [monthTo, setMonthTo] = useState<Date | null>(defaultTo);
  const [submittedFilters, setSubmittedFilters] = useState<MonthlyCategoryDashboardFilters | null>(null);

  const dashboardQuery = useMonthlyCategoryDashboard(submittedFilters);

  const accountOptions = useMemo(
    () => accounts.map(account => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const totalsByMonth = useMemo(() => {
    const months = dashboardQuery.data?.months ?? [];
    const items = dashboardQuery.data?.items ?? [];
    const totals: Record<string, { balance: number }> = {};

    for (const month of months) {
      totals[month] = { balance: 0 };
    }

    for (const item of items) {
      for (const month of months) {
        const amount = item.monthly[month];
        if (!amount) continue;
        totals[month].balance += Number(amount.totalIncome || 0) - Number(amount.totalExpense || 0);
      }
    }

    return totals;
  }, [dashboardQuery.data]);

  const handleRun = () => {
    if (!monthFrom || !monthTo) return;
    setSubmittedFilters({
      accountId: accountId ?? undefined,
      monthFrom: toMonthKey(monthFrom),
      monthTo: toMonthKey(monthTo),
    });
  };

  const openDrillDown = (groupingId: string | null, month: string) => {
    if (!groupingId) return;

    const { firstDay, lastDay } = toMonthDateBounds(month);
    const params = new URLSearchParams();
    params.set('categoryGroupingId', groupingId);
    params.set('operationDateFrom', firstDay);
    params.set('operationDateTo', lastDay);
    params.set('autoRun', 'true');
    if (submittedFilters?.accountId) {
      params.set('accountId', submittedFilters.accountId);
    }

    openSecondaryTab(`/statistiques?${params.toString()}`);
  };

  const months = dashboardQuery.data?.months ?? [];
  const items = dashboardQuery.data?.items ?? [];

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ width: '100%' }}>
        <Text fw={700} fz={22}>Tableau de bord mensuel</Text>

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
            {dashboardQuery.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{dashboardQuery.error.message}</Text>
              </Alert>
            ) : null}

            <Group align="end" wrap="wrap">
              <PositioningSelect
                style={{ minWidth: 280 }}
                label="Compte"
                placeholder="Tous les comptes"
                data={accountOptions}
                value={accountId}
                onChange={setAccountId}
                clearable
              />
              <MonthPickerInput
                label="Du mois"
                value={monthFrom}
                onChange={setMonthFrom}
                style={{ minWidth: 160 }}
                valueFormat="MMMM YYYY"
              />
              <MonthPickerInput
                label="Au mois"
                value={monthTo}
                onChange={setMonthTo}
                style={{ minWidth: 160 }}
                valueFormat="MMMM YYYY"
              />
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={handleRun}
                loading={dashboardQuery.isFetching}
                disabled={!monthFrom || !monthTo}
                style={{ marginLeft: 'auto' }}
              >
                Calculer
              </Button>
            </Group>

            <Text fz={13} c={TEXT_MUTED}>
              Solde des opérations (et lignes de ventilation) rattachées à une catégorie, regroupées par code
              regroupement de catégorie, mois par mois. Clique sur un montant pour voir le détail des opérations
              qui le composent.
            </Text>
          </Stack>
        </Box>

        <Box
          style={{
            background: PANEL_BG,
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 10,
            overflow: 'auto',
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

          {dashboardQuery.isLoading ? (
            <Center style={{ minHeight: 160 }}>
              <Loader size="sm" />
            </Center>
          ) : !submittedFilters ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Lance le calcul pour afficher le tableau de bord.</Text>
            </Center>
          ) : items.length === 0 ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Aucune opération avec catégorie trouvée sur cette période.</Text>
            </Center>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <Table
                style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 300 + months.length * 110 }}
                styles={{
                  th: {
                    padding: '5px 10px',
                    fontSize: 12,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    borderRight: `1px solid ${GRAY_BORDER}`,
                    borderBottom: `1px solid ${GRAY_BORDER}`,
                  },
                  td: {
                    padding: '4px 10px',
                    fontSize: 12,
                    lineHeight: 1.2,
                    borderRight: `1px solid ${GRAY_BORDER}`,
                    textAlign: 'right',
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th
                      style={{
                        textAlign: 'left',
                        minWidth: 220,
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        background: CRUD.couleurs.fondEnteteTableau,
                      }}
                    >
                      Regroupement
                    </Table.Th>
                    {months.map(month => (
                      <Table.Th key={month} style={{ minWidth: 110 }}>
                        {formatMonthLabel(month)}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, index) => {
                    const rowBackground = index % 2 === 1 ? CRUD.couleurs.fondLignePaire : CRUD.couleurs.fondLigneImpaire;
                    return (
                      <Table.Tr key={item.groupingId ?? '__none__'}>
                        <Table.Td
                          style={{
                            background: rowBackground,
                            textAlign: 'left',
                            fontWeight: 600,
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                          }}
                        >
                          {item.groupingLabel}
                        </Table.Td>
                        {months.map(month => {
                          const amount = item.monthly[month] ?? { totalExpense: '0', totalIncome: '0' };
                          const balance = Number(amount.totalIncome || 0) - Number(amount.totalExpense || 0);
                          const clickable = item.groupingId !== null;
                          const cellStyle = {
                            background: rowBackground,
                            cursor: clickable ? 'pointer' : undefined,
                            textDecoration: clickable ? 'underline' : undefined,
                            color: balance < 0 ? NEGATIVE_AMOUNT : undefined,
                          } as const;
                          return (
                            <Table.Td
                              key={month}
                              style={cellStyle}
                              onClick={() => openDrillDown(item.groupingId, month)}
                              title={clickable ? 'Voir le détail des opérations' : undefined}
                            >
                              {formatAmount(String(balance))}
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
                <Table.Tfoot>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th
                      style={{
                        textAlign: 'left',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        background: CRUD.couleurs.fondEnteteTableau,
                      }}
                    >
                      Total
                    </Table.Th>
                    {months.map(month => {
                      const total = totalsByMonth[month] ?? { balance: 0 };
                      return (
                        <Table.Th key={month} style={{ color: total.balance < 0 ? NEGATIVE_AMOUNT : undefined }}>
                          {formatAmount(String(total.balance))}
                        </Table.Th>
                      );
                    })}
                  </Table.Tr>
                </Table.Tfoot>
              </Table>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
