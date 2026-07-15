import { Center, Stack, Text, Title } from '@mantine/core';
import { IconTools } from '@tabler/icons-react';

export default function PortefeuillePage() {
  return (
    <Center style={{ minHeight: 'calc(100vh - 50px)' }}>
      <Stack align="center" gap={6}>
        <IconTools size={40} color="#94a3b8" />
        <Title order={3} style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
          Portefeuille
        </Title>
        <Text c="dimmed" ta="center" maw={420}>
          Cette fonctionnalité n&apos;est pas encore disponible. Elle est en cours de développement.
        </Text>
      </Stack>
    </Center>
  );
}
