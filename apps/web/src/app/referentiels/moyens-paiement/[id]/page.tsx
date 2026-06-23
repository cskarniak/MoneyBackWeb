import { Box, Title } from '@mantine/core';
import { PaymentMethodsFiche } from '@/components/payment-methods/PaymentMethodsFiche';

type Props = { params: Promise<{ id: string }> };

export default async function EditPaymentMethodPage({ params }: Props) {
  const { id } = await params;

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Title order={2} mb="md" style={{ fontSize: 22, fontWeight: 700 }}>
        Moyens de paiement
      </Title>
      <PaymentMethodsFiche id={id} />
    </Box>
  );
}
