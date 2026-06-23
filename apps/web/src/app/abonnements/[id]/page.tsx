import { Box, Title } from '@mantine/core';
import { SubscriptionsFiche } from '@/components/subscriptions/SubscriptionsFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditSubscriptionPage({ params }: Props) {
  const { id } = await params;

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🔁 Abonnements
      </Title>
      <SubscriptionsFiche id={id} />
    </Box>
  );
}
