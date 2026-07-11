import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { DetailedStatisticsWorkspace } from '@/components/statistics/DetailedStatisticsWorkspace';

export default function StatistiquesPage() {
  return (
    <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
      <DetailedStatisticsWorkspace />
    </Suspense>
  );
}
