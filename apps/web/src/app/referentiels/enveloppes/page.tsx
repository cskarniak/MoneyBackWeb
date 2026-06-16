import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { EnveloppesList } from '@/components/enveloppes/EnveloppesList';

export default function EnveloppesPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        💼 Enveloppes
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <EnveloppesList />
      </Suspense>
    </Box>
  );
}
