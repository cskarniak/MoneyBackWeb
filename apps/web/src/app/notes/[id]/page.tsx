import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { NotesFiche } from '@/components/notes/NotesFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditNotePage({ params }: Props) {
  const { id } = await params;
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        📝 Notes
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <NotesFiche id={id} />
      </Suspense>
    </Box>
  );
}
