import { Box, Title } from '@mantine/core';
import { MovementTypesFiche } from '@/components/movement-types/MovementTypesFiche';

export default function NewMovementTypePage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Types de mouvement
      </Title>
      <MovementTypesFiche />
    </Box>
  );
}
