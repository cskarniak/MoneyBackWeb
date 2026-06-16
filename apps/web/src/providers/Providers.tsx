'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { buildCrudGlobalCss } from '@/lib/crud-tokens';

const theme = createTheme({
  primaryColor: 'blue',
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  const crudGlobalCss = buildCrudGlobalCss();

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <style key={crudGlobalCss}>{crudGlobalCss}</style>
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
