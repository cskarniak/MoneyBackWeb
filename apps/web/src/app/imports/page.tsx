import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { ImportsList } from '@/components/imports/ImportsList';

export default function ImportsPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Imports
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <ImportsList />
      </Suspense>
    </Box>
  );
}
