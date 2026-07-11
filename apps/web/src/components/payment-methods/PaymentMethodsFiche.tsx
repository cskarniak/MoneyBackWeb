'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethod,
  useUpdatePaymentMethod,
  type PaymentMethodPayload,
} from '@/hooks/usePaymentMethods';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  code: z.string().max(3, 'Le code doit contenir au maximum 3 caractères').optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
type Props = { id?: string };

function toPayload(values: FormValues): PaymentMethodPayload {
  return {
    label: values.label,
    code: values.code || null,
    active: values.active,
  };
}

export function PaymentMethodsFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: paymentMethod, isLoading: loadingPaymentMethod } = usePaymentMethod(id ?? '');
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: '',
      code: '',
      active: true,
    },
  });

  useEffect(() => {
    if (paymentMethod) {
      reset({
        label: paymentMethod.label,
        code: paymentMethod.code ?? '',
        active: paymentMethod.active,
      });
    }
  }, [paymentMethod, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/referentiels/moyens-paiement?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/referentiels/moyens-paiement?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;

  if (!isNew && loadingPaymentMethod) {
    return (
      <Center style={{ minHeight: 200 }}>
        <Loader size="sm" />
      </Center>
    );
  }

  const labelStyle = {
    width: 'var(--crud-label-width)',
    minHeight: 'var(--crud-label-height)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  } as const;

  const fieldInputStyle = {
    background: FIELD_BG,
    height: 'var(--crud-field-height)',
    minHeight: 'var(--crud-field-height)',
    fontSize: 'var(--crud-field-font-size)',
  } as const;

  return (
    <Box style={{ maxWidth: 'var(--crud-form-max-width)', margin: '0 auto' }}>
      <Box
        style={{
          background: PANEL_BG,
          border: `1px solid ${GRAY_BORDER}`,
          borderRadius: 'var(--crud-form-panel-radius)',
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Box
          style={{
            background: CRUD.couleurs.fondBandeau,
            color: CRUD.couleurs.texteBandeau,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: 'var(--crud-header-font-size)',
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Fiche moyen de paiement</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={() => router.push('/referentiels/moyens-paiement')}>
              Fermer
            </Button>
          </Group>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack
            gap="var(--crud-form-field-gap)"
            style={{
              padding:
                'var(--crud-form-body-padding-top) var(--crud-form-body-padding-x) var(--crud-form-body-padding-bottom)',
            }}
          >
            {mutationError && (
              <Alert
                color="red"
                icon={<IconAlertCircle size={16} />}
                style={{ background: '#fff5f5', border: '1px solid #ffc9c9' }}
              >
                <Text size="sm">{mutationError}</Text>
              </Alert>
            )}

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Libellé <span style={{ color: 'red' }}>*</span>
              </Text>
              <TextInput
                {...register('label')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                error={errors.label?.message}
                autoFocus
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Code
              </Text>
              <TextInput
                {...register('code')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                maxLength={3}
                error={errors.code?.message}
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Id source
              </Text>
              <TextInput
                value={paymentMethod?.idSource ?? ''}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                disabled
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Actif
              </Text>
              <Checkbox size="md" checked={watch('active')} onChange={e => setValue('active', e.currentTarget.checked)} />
            </Group>
          </Stack>

          <Group
            justify="space-between"
            gap="var(--crud-form-footer-gap)"
            style={{
              padding:
                'var(--crud-form-footer-padding-y) var(--crud-form-footer-padding-x)',
              background: FIELD_BG,
            }}
          >
            <Box>
              {!isNew && (
                <Button
                  size="xs"
                  radius="md"
                  variant="outline"
                  color="red"
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer le moyen de paiement "${paymentMethod?.label}" ?`)) return;
                    await deleteMutation.mutateAsync(id!);
                    router.push('/referentiels/moyens-paiement');
                  }}
                >
                  Supprimer
                </Button>
              )}
            </Box>
            <Group gap="var(--crud-form-footer-gap)">
              <Button size="sm" radius="md" variant="default" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button size="sm" radius="md" type="submit" loading={isSubmitting}>
                Enregistrer
              </Button>
            </Group>
          </Group>
        </form>
      </Box>
    </Box>
  );
}
