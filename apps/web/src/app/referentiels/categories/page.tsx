import { Suspense } from 'react';
import { Box, Loader, Center, Title } from '@mantine/core';
import { CategoriesList } from '@/components/categories/CategoriesList';

export default function CategoriesPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        📂 Catégories
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <CategoriesList />
      </Suspense>
    </Box>
  );
}
