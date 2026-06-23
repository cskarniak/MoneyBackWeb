import { Box, Title } from '@mantine/core';
import { SubscriptionsFiche } from '@/components/subscriptions/SubscriptionsFiche';

export default function NewSubscriptionPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🔁 Abonnements
      </Title>
      <SubscriptionsFiche />
    </Box>
  );
}
