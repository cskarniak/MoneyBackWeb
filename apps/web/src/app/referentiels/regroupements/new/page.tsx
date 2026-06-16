import { Box, Title } from '@mantine/core';
import { GroupingsFiche } from '@/components/groupings/GroupingsFiche';

export default function NewRegroupementPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        🗂️ Regroupements
      </Title>
      <GroupingsFiche />
    </Box>
  );
}
