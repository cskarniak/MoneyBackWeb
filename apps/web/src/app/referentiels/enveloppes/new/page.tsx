import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { EnveloppesFiche } from '@/components/enveloppes/EnveloppesFiche';

export default function NewEnveloppePage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        💼 Enveloppes
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <EnveloppesFiche />
      </Suspense>
    </Box>
  );
}
