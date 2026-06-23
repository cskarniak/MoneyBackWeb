import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { SubscriptionsList } from '@/components/subscriptions/SubscriptionsList';

export default function SubscriptionsPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🔁 Abonnements
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <SubscriptionsList />
      </Suspense>
    </Box>
  );
}
