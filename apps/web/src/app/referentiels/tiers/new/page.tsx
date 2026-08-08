import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { TiersFiche } from '@/components/tiers/TiersFiche';

export default function NewTiersPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        👥 Tiers
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <TiersFiche />
      </Suspense>
    </Box>
  );
}
