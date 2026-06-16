import { Box, Title } from '@mantine/core';
import { AccountsFiche } from '@/components/accounts/AccountsFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditComptePage({ params }: Props) {
  const { id } = await params;
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🏦 Comptes bancaires
      </Title>
      <AccountsFiche id={id} />
    </Box>
  );
}
