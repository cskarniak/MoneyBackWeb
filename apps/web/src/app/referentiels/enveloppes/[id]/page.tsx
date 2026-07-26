import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { EnveloppesFiche } from '@/components/enveloppes/EnveloppesFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditEnveloppePage({ params }: Props) {
  const { id } = await params;
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        💼 Enveloppes
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <EnveloppesFiche id={id} />
      </Suspense>
    </Box>
  );
}
