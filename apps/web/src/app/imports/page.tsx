import { Box, Title } from '@mantine/core';
import { ImportsList } from '@/components/imports/ImportsList';

export default function ImportsPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Imports
      </Title>
      <ImportsList />
    </Box>
  );
}
