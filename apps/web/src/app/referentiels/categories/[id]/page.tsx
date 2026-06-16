import { Box, Title } from '@mantine/core';
import { CategoriesFiche } from '@/components/categories/CategoriesFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditCategoriePage({ params }: Props) {
  const { id } = await params;
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        📂 Catégories
      </Title>
      <CategoriesFiche id={id} />
    </Box>
  );
}
