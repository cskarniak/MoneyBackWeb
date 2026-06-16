import { Suspense } from 'react';
import { Box, Loader, Center, Title } from '@mantine/core';
import { TiersList } from '@/components/tiers/TiersList';

export default function TiersPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        👥 Tiers
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <TiersList />
      </Suspense>
    </Box>
  );
}
