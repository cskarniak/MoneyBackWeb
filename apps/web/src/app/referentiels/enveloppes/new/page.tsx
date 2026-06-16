import { Box, Title } from '@mantine/core';
import { EnveloppesFiche } from '@/components/enveloppes/EnveloppesFiche';

export default function NewEnveloppePage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        💼 Enveloppes
      </Title>
      <EnveloppesFiche />
    </Box>
  );
}
