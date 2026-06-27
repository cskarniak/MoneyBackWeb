import { Box, Title } from '@mantine/core';
import { ImportsFiche } from '@/components/imports/ImportsFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditImportProfilePage({ params }: Props) {
  const { id } = await params;

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Imports
      </Title>
      <ImportsFiche id={id} />
    </Box>
  );
}
