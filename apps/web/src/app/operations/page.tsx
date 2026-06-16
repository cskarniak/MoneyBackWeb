import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { OperationsWorkspace } from '@/components/operations/OperationsWorkspace';

export default function OperationsPage() {
  return (
    <>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <OperationsWorkspace />
      </Suspense>
    </>
  );
}
