import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { AccountsList } from '@/components/accounts/AccountsList';

export default function ComptesPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🏦 Comptes bancaires
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <AccountsList />
      </Suspense>
    </Box>
  );
}
