'use client';

import { Stack, Text } from '@mantine/core';
import { useAccountsAll } from '@/hooks/useAccounts';
import styles from '@/app/page.module.css';

function formatAmount(value: string) {
  return Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function HomeAccountsPanel() {
  const { data: accounts = [] } = useAccountsAll();
  const selectedAccounts = accounts.filter(account => account.showOnHome);

  return (
    <div className={styles.accountsPanel}>
      <Text className={styles.panelTitle}>Soldes affichés</Text>

      <Stack gap={8}>
        {selectedAccounts.length === 0 ? (
          <Text c="dimmed" fz="sm">Aucun compte n'est marqué pour l'accueil.</Text>
        ) : (
          selectedAccounts.map(account => (
            <div key={account.id} className={styles.accountRow}>
              <span>{account.name}</span>
              <strong className={Number(account.currentBalance) < 0 ? styles.negative : styles.positive}>
                {formatAmount(account.currentBalance)} €
              </strong>
            </div>
          ))
        )}
      </Stack>
    </div>
  );
}
