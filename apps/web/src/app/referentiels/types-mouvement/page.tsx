import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { MovementTypesList } from '@/components/movement-types/MovementTypesList';

export default function MovementTypesPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Types de mouvement
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <MovementTypesList />
      </Suspense>
    </Box>
  );
}
