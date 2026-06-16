'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Checkbox,
  Group,
  Stack,
  Text,
  TextInput,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  useRegroupement,
  useCreateRegroupement,
  useUpdateRegroupement,
  useDeleteRegroupement,
  type RegroupementPayload,
} from '@/hooks/useGroupings';

const GRAY_BORDER = '#dee2e6';
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  expense: z.boolean(),
  income: z.boolean(),
  dashboard: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): RegroupementPayload {
  return {
    label: values.label,
    expense: values.expense,
    income: values.income,
    dashboard: values.dashboard,
  };
}

type Props = { id?: string };

export function GroupingsFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: regroupement, isLoading } = useRegroupement(id ?? '');
  const createMutation = useCreateRegroupement();
  const updateMutation = useUpdateRegroupement();
  const deleteMutation = useDeleteRegroupement();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', expense: false, income: false, dashboard: false },
  });

  useEffect(() => {
    if (regroupement) {
      reset({
        label: regroupement.label,
        expense: regroupement.expense,
        income: regroupement.income,
        dashboard: regroupement.dashboard,
      });
    }
  }, [regroupement, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/referentiels/regroupements?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/referentiels/regroupements?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError =
    (isNew ? createMutation.error : updateMutation.error)?.message ?? null;

  if (!isNew && isLoading) {
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
        {/* Bandeau bleu */}
        <Box
          style={{
            background: CRUD.couleurs.fondBandeau,
            color: CRUD.couleurs.texteBandeau,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: 'var(--crud-header-font-size)',
          }}
        >
          Fiche regroupement
        </Box>

        {/* Formulaire */}
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

            {/* Libellé */}
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

            {/* Catégorie */}
            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Catégorie
              </Text>
              <Checkbox
                size="md"
                checked={watch('income')}
                onChange={e => setValue('income', e.currentTarget.checked)}
              />
            </Group>

            {/* Poste */}
            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Poste
              </Text>
              <Checkbox
                size="md"
                checked={watch('expense')}
                onChange={e => setValue('expense', e.currentTarget.checked)}
              />
            </Group>

            {/* Tableau de bord */}
            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Tableau de bord
              </Text>
              <Checkbox
                size="md"
                checked={watch('dashboard')}
                onChange={e => setValue('dashboard', e.currentTarget.checked)}
              />
            </Group>
          </Stack>

          {/* Boutons */}
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
                    if (!window.confirm(`Supprimer le regroupement "${regroupement?.label}" ?`)) return;
                    await deleteMutation.mutateAsync(id!);
                    router.push('/referentiels/regroupements');
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
