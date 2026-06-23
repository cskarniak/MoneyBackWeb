import { Box, Title } from '@mantine/core';
import { PaymentMethodsFiche } from '@/components/payment-methods/PaymentMethodsFiche';

export default function NewPaymentMethodPage() {
  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Moyens de paiement
      </Title>
      <PaymentMethodsFiche />
    </Box>
  );
}
