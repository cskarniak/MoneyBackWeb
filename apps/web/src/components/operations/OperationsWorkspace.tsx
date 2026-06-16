'use client';

import { Box, Text } from '@mantine/core';
import { OperationsList } from './OperationsList';

export function OperationsWorkspace() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Text fw={700} style={{ fontSize: 22, marginBottom: 12 }}>
        Operations
      </Text>

      <OperationsList />
    </Box>
  );
}
