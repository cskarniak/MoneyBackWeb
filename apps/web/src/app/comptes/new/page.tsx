import { Box, Title } from '@mantine/core';
import { AccountsFiche } from '@/components/accounts/AccountsFiche';

export default function NewComptePage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🏦 Comptes bancaires
      </Title>
      <AccountsFiche />
    </Box>
  );
}
