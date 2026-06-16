import { Box, Title } from '@mantine/core';
import { CategoriesFiche } from '@/components/categories/CategoriesFiche';

export default function NewCategoriePage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        📂 Catégories
      </Title>
      <CategoriesFiche />
    </Box>
  );
}
