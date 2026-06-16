import { Box, Title } from '@mantine/core';
import { GroupingsFiche } from '@/components/groupings/GroupingsFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditRegroupementPage({ params }: Props) {
  const { id } = await params;
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🗂️ Regroupements
      </Title>
      <GroupingsFiche id={id} />
    </Box>
  );
}
