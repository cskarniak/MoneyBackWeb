import { Suspense } from 'react';
import { Box, Loader, Center, Title } from '@mantine/core';
import { GroupingsList } from '@/components/groupings/GroupingsList';

export default function RegroupementsPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🗂️ Regroupements
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <GroupingsList />
      </Suspense>
    </Box>
  );
}
