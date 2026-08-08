import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { NotesFiche } from '@/components/notes/NotesFiche';

export default function NewNotePage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        📝 Notes
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <NotesFiche />
      </Suspense>
    </Box>
  );
}
