import { Suspense } from 'react';
import { Box, Loader, Center, Title } from '@mantine/core';
import { NotesList } from '@/components/notes/NotesList';

export default function NotesPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        📝 Notes
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <NotesList />
      </Suspense>
    </Box>
  );
}
