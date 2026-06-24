import type { ReactNode } from 'react';
import { Box } from '@mantine/core';
import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';

type StatistiquesLayoutProps = {
  children: ReactNode;
};

export default function StatistiquesLayout({ children }: StatistiquesLayoutProps) {
  return (
    <CrudLayoutShell>
      <Box pt={8}>
        {children}
      </Box>
    </CrudLayoutShell>
  );
}
