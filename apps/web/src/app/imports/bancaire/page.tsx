import { Box, Title } from '@mantine/core';
import { BankImportWorkspace } from '@/components/imports/BankImportWorkspace';

export default function BankImportPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Imports
      </Title>
      <BankImportWorkspace />
    </Box>
  );
}
