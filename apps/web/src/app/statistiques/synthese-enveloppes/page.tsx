import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { EnvelopeSummaryWorkspace } from '@/components/statistics/EnvelopeSummaryWorkspace';

export default function EnvelopeSummaryPage() {
  return (
    <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
      <EnvelopeSummaryWorkspace />
    </Suspense>
  );
}
