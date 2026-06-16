import { Box, Title } from '@mantine/core';
import { TiersFiche } from '@/components/tiers/TiersFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditTiersPage({ params }: Props) {
  const { id } = await params;
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        👥 Tiers
      </Title>
      <TiersFiche id={id} />
    </Box>
  );
}
