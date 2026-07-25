import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { MonthlyCategoryDashboardWorkspace } from '@/components/statistics/MonthlyCategoryDashboardWorkspace';

export default function MonthlyCategoryDashboardPage() {
  return (
    <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
      <MonthlyCategoryDashboardWorkspace />
    </Suspense>
  );
}
