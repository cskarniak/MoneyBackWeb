import { Suspense } from 'react';
import { Box, Center, Loader, Title } from '@mantine/core';
import { PaymentMethodsList } from '@/components/payment-methods/PaymentMethodsList';

export default function PaymentMethodsPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Moyens de paiement
      </Title>
      <Suspense fallback={<Center style={{ minHeight: 200 }}><Loader size="sm" /></Center>}>
        <PaymentMethodsList />
      </Suspense>
    </Box>
  );
}
