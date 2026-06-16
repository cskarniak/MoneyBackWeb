import { Box } from '@mantine/core';
import { AppNavbar } from '@/components/layout/AppNavbar';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <AppNavbar />
      {children}
    </Box>
  );
}
