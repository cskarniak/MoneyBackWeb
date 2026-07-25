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

function getDefaultRange(): [Date, Date] {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
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
    const totals: Record<string, { totalExpense: number; totalIncome: number }> = {};

    for (const month of months) {
      totals[month] = { totalExpense: 0, totalIncome: 0 };
    }

    for (const item of items) {
      for (const month of months) {
        const amount = item.monthly[month];
        if (!amount) continue;
        totals[month].totalExpense += Number(amount.totalExpense || 0);
        totals[month].totalIncome += Number(amount.totalIncome || 0);
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

  const months = dashboardQuery.data?.months ?? [];
  const items = dashboardQuery.data?.items ?? [];

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1180, margin: '0 auto' }}>
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
              Somme des opérations (et lignes de ventilation) rattachées à une catégorie, regroupées par code
              regroupement de catégorie, mois par mois.
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
                style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 600 + months.length * 220 }}
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
                    <Table.Th rowSpan={2} style={{ textAlign: 'left', minWidth: 220 }}>
                      Regroupement
                    </Table.Th>
                    {months.map(month => (
                      <Table.Th key={month} colSpan={2} style={{ minWidth: 220 }}>
                        {formatMonthLabel(month)}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    {months.flatMap(month => [
                      <Table.Th key={`${month}-expense`}>Dépense</Table.Th>,
                      <Table.Th key={`${month}-income`}>Recette</Table.Th>,
                    ])}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, index) => {
                    const rowBackground = index % 2 === 1 ? CRUD.couleurs.fondLignePaire : CRUD.couleurs.fondLigneImpaire;
                    return (
                      <Table.Tr key={item.groupingId ?? '__none__'}>
                        <Table.Td style={{ background: rowBackground, textAlign: 'left', fontWeight: 600 }}>
                          {item.groupingLabel}
                        </Table.Td>
                        {months.flatMap(month => {
                          const amount = item.monthly[month] ?? { totalExpense: '0', totalIncome: '0' };
                          return [
                            <Table.Td
                              key={`${month}-expense`}
                              style={{ background: rowBackground, color: Number(amount.totalExpense) !== 0 ? NEGATIVE_AMOUNT : undefined }}
                            >
                              {formatAmount(amount.totalExpense)}
                            </Table.Td>,
                            <Table.Td key={`${month}-income`} style={{ background: rowBackground }}>
                              {formatAmount(amount.totalIncome)}
                            </Table.Td>,
                          ];
                        })}
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
                <Table.Tfoot>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th style={{ textAlign: 'left' }}>Total</Table.Th>
                    {months.flatMap(month => {
                      const total = totalsByMonth[month] ?? { totalExpense: 0, totalIncome: 0 };
                      return [
                        <Table.Th key={`${month}-total-expense`} style={{ color: total.totalExpense !== 0 ? NEGATIVE_AMOUNT : undefined }}>
                          {formatAmount(String(total.totalExpense))}
                        </Table.Th>,
                        <Table.Th key={`${month}-total-income`}>
                          {formatAmount(String(total.totalIncome))}
                        </Table.Th>,
                      ];
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
