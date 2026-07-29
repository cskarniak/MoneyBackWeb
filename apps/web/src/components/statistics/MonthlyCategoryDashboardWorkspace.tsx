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
  type MonthlyCategoryDashboardItem,
} from '@/hooks/useMonthlyCategoryDashboard';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { openSecondaryTab } from '@/lib/secondary-tab';
import { useCurrentMonth } from '@/hooks/useCurrentMonth';

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

function formatUnsignedAmount(value: number) {
  return formatAmount(String(Math.abs(value)));
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

const SENTINEL_BUCKETS: Record<string, { param: 'uncategorized' | 'hiddenGrouping'; direction: 'expense' | 'income' }> = {
  __uncategorized_expense__: { param: 'uncategorized', direction: 'expense' },
  __uncategorized_income__: { param: 'uncategorized', direction: 'income' },
  __hidden_grouping_expense__: { param: 'hiddenGrouping', direction: 'expense' },
  __hidden_grouping_income__: { param: 'hiddenGrouping', direction: 'income' },
};

export function MonthlyCategoryDashboardWorkspace() {
  const { data: accounts = [] } = useAccountsAll();
  const { data: currentMonthData } = useCurrentMonth();
  const currentMonth = currentMonthData?.currentMonth ?? null;
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

  const expenseItems = useMemo(
    () => (dashboardQuery.data?.items ?? []).filter(item => item.kind === 'expense'),
    [dashboardQuery.data],
  );
  const incomeItems = useMemo(
    () => (dashboardQuery.data?.items ?? []).filter(item => item.kind === 'income'),
    [dashboardQuery.data],
  );

  function buildTotalsByMonth(items: MonthlyCategoryDashboardItem[]) {
    const months = dashboardQuery.data?.months ?? [];
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
  }

  // La moyenne compte les mois à 0 (utile pour provisionner une dépense semestrielle/annuelle type
  // assurance), mais s'arrête au « mois en cours » : un mois futur pas encore atteint ne doit pas
  // tirer la moyenne vers le bas artificiellement.
  function buildTotalAverage(totals: Record<string, { balance: number }>) {
    const months = dashboardQuery.data?.months ?? [];
    const countedMonths = currentMonth ? months.filter(month => month <= currentMonth) : months;
    if (countedMonths.length === 0) return 0;

    const sum = countedMonths.reduce((acc, month) => acc + (totals[month]?.balance ?? 0), 0);
    return sum / countedMonths.length;
  }

  const expenseTotalsByMonth = useMemo(() => buildTotalsByMonth(expenseItems), [expenseItems, dashboardQuery.data]);
  const incomeTotalsByMonth = useMemo(() => buildTotalsByMonth(incomeItems), [incomeItems, dashboardQuery.data]);
  const expenseTotalAverage = useMemo(() => buildTotalAverage(expenseTotalsByMonth), [expenseTotalsByMonth, dashboardQuery.data]);
  const incomeTotalAverage = useMemo(() => buildTotalAverage(incomeTotalsByMonth), [incomeTotalsByMonth, dashboardQuery.data]);

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
    const sentinel = SENTINEL_BUCKETS[groupingId];
    if (sentinel) {
      params.set(sentinel.param, 'true');
      params.set('direction', sentinel.direction);
    } else {
      params.set('categoryGroupingId', groupingId);
    }
    params.set('dueDateFrom', firstDay);
    params.set('dueDateTo', lastDay);
    params.set('sortByDueDate', 'true');
    params.set('autoRun', 'true');
    if (submittedFilters?.accountId) {
      params.set('accountId', submittedFilters.accountId);
    }

    openSecondaryTab(`/statistiques?${params.toString()}`);
  };

  const months = dashboardQuery.data?.months ?? [];

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
              regroupement de catégorie, mois par mois — seuls les regroupements cochés « Tableau de bord »
              (fiche Regroupements) apparaissent ici en tant que tels. Deux paires de lignes de contrôle
              garantissent que toute dépense/recette a une ligne dans ce tableau : « Dépenses/Recettes non
              regroupées » (opérations sans catégorie, ou dont la catégorie n'est rattachée à aucun
              regroupement) et « Dépenses/Recettes regroupées masquées » (catégorie rattachée à un
              regroupement bien réel, mais dont la case « Tableau de bord » n'est pas cochée). Clique sur un
              montant pour voir le détail des opérations qui le composent. La moyenne mensuelle compte les mois
              à 0 (utile pour provisionner une dépense semestrielle ou annuelle) mais s'arrête au « Mois en
              cours » réglé en haut de l'écran : un mois futur pas encore atteint n'est jamais compté.
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
          ) : expenseItems.length === 0 && incomeItems.length === 0 ? (
            <Center style={{ minHeight: 160 }}>
              <Text c={TEXT_MUTED}>Aucune opération avec catégorie trouvée sur cette période.</Text>
            </Center>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <Table
                style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 410 + months.length * 110 }}
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
                    <Table.Th style={{ minWidth: 110 }}>
                      Moyenne mensuelle
                    </Table.Th>
                    {months.map(month => (
                      <Table.Th key={month} style={{ minWidth: 110 }}>
                        {formatMonthLabel(month)}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {[
                    { label: 'Dépenses', items: expenseItems, kind: 'expense' as const, totalsByMonth: expenseTotalsByMonth, totalAverage: expenseTotalAverage },
                    { label: 'Revenus', items: incomeItems, kind: 'income' as const, totalsByMonth: incomeTotalsByMonth, totalAverage: incomeTotalAverage },
                  ].flatMap(section => {
                    if (section.items.length === 0) return [];

                    const unsigned = section.kind === 'expense';

                    const rows = section.items.map((item, index) => {
                      const rowBackground = index % 2 === 1 ? CRUD.couleurs.fondLignePaire : CRUD.couleurs.fondLigneImpaire;
                      const countedMonths = currentMonth ? months.filter(month => month <= currentMonth) : months;
                      const rowTotal = countedMonths.reduce((sum, month) => {
                        const amount = item.monthly[month] ?? { totalExpense: '0', totalIncome: '0' };
                        return sum + (Number(amount.totalIncome || 0) - Number(amount.totalExpense || 0));
                      }, 0);
                      const rowAverage = countedMonths.length > 0 ? rowTotal / countedMonths.length : 0;
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
                          <Table.Td
                            style={{
                              background: rowBackground,
                              fontWeight: 600,
                              color: !unsigned && rowAverage < 0 ? NEGATIVE_AMOUNT : undefined,
                            }}
                          >
                            {unsigned ? formatUnsignedAmount(rowAverage) : formatAmount(String(rowAverage))}
                          </Table.Td>
                          {months.map(month => {
                            const amount = item.monthly[month] ?? { totalExpense: '0', totalIncome: '0' };
                            const balance = Number(amount.totalIncome || 0) - Number(amount.totalExpense || 0);
                            const clickable = item.groupingId !== null;
                            const cellStyle = {
                              background: rowBackground,
                              cursor: clickable ? 'pointer' : undefined,
                              textDecoration: clickable ? 'underline' : undefined,
                              color: !unsigned && balance < 0 ? NEGATIVE_AMOUNT : undefined,
                            } as const;
                            return (
                              <Table.Td
                                key={month}
                                style={cellStyle}
                                onClick={() => openDrillDown(item.groupingId, month)}
                                title={clickable ? 'Voir le détail des opérations' : undefined}
                              >
                                {unsigned ? formatUnsignedAmount(balance) : formatAmount(String(balance))}
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      );
                    });

                    const subtotalRow = (
                      <Table.Tr key={`${section.kind}-subtotal`} style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                        <Table.Th
                          style={{
                            textAlign: 'left',
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            background: CRUD.couleurs.fondEnteteTableau,
                          }}
                        >
                          Total {section.label.toLowerCase()}
                        </Table.Th>
                        <Table.Th style={{ textAlign: 'right', color: !unsigned && section.totalAverage < 0 ? NEGATIVE_AMOUNT : undefined }}>
                          {unsigned ? formatUnsignedAmount(section.totalAverage) : formatAmount(String(section.totalAverage))}
                        </Table.Th>
                        {months.map(month => {
                          const total = section.totalsByMonth[month] ?? { balance: 0 };
                          return (
                            <Table.Th key={month} style={{ textAlign: 'right', color: !unsigned && total.balance < 0 ? NEGATIVE_AMOUNT : undefined }}>
                              {unsigned ? formatUnsignedAmount(total.balance) : formatAmount(String(total.balance))}
                            </Table.Th>
                          );
                        })}
                      </Table.Tr>
                    );

                    return [
                      <Table.Tr key={`${section.kind}-header`} style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                        <Table.Th
                          colSpan={2 + months.length}
                          style={{
                            textAlign: 'left',
                            position: 'sticky',
                            left: 0,
                            fontSize: 13,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {section.label}
                        </Table.Th>
                      </Table.Tr>,
                      ...rows,
                      subtotalRow,
                    ];
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
