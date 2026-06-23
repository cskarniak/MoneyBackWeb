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
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Alert,
  Loader,
  Center,
  Radio,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type CategoryPayload,
} from '@/hooks/useCategories';
import { useRegroupementsAll } from '@/hooks/useGroupings';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  regroupementId: z.string().nullable().optional(),
  sens: z.enum(['expense', 'income', 'none']),
  comment: z.string().optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): CategoryPayload {
  return {
    label: values.label,
    expense: values.sens === 'expense',
    income: values.sens === 'income',
    comment: values.comment || null,
    active: values.active,
    regroupementId: values.regroupementId || null,
  };
}

type Props = { id?: string };

export function CategoriesFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: category, isLoading: loadingCat } = useCategory(id ?? '');
  const { data: regroupements = [], isLoading: loadingRegroupements } = useRegroupementsAll();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', regroupementId: null, sens: 'expense', comment: '', active: true },
  });

  useEffect(() => {
    if (category) {
      reset({
        label: category.label,
        regroupementId: category.regroupementId,
        sens: category.expense ? 'expense' : category.income ? 'income' : 'none',
        comment: category.comment ?? '',
        active: category.active,
      });
    }
  }, [category, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/referentiels/categories?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/referentiels/categories?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError =
    (isNew ? createMutation.error : updateMutation.error)?.message ?? null;

  const regroupementOptions = regroupements.map(r => ({ value: r.id, label: r.label }));
  const isLoading = (!isNew && loadingCat) || loadingRegroupements;

  if (isLoading) {
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

  const topLabelStyle = {
    width: 'var(--crud-label-width)',
    flexShrink: 0,
    paddingTop: 6,
  } as const;

  const fieldInputStyle = {
    background: FIELD_BG,
    height: 'var(--crud-field-height)',
    minHeight: 'var(--crud-field-height)',
    fontSize: 'var(--crud-field-font-size)',
  } as const;

  return (
    <Box style={{ maxWidth: 'var(--crud-form-max-width)', margin: '0 auto' }}>
      {/* Carte */}
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
          Fiche catégorie
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

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Id source
              </Text>
              <TextInput
                value={category?.idSource ?? ''}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                disabled
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            {/* Regroupement */}
            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Regroupement
              </Text>
              <Select
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={regroupementOptions}
                value={watch('regroupementId') ?? null}
                onChange={val => setValue('regroupementId', val)}
                clearable
                placeholder="Aucun"
                searchable
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            {/* Sens */}
            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>
                Sens
              </Text>
              <Radio.Group
                value={watch('sens')}
                onChange={val => setValue('sens', val as FormValues['sens'])}
              >
                <Stack gap={8}>
                  <Radio value="expense" label="Dépense" size="sm" />
                  <Radio value="income" label="Recette" size="sm" />
                  <Radio value="none" label="Non défini" size="sm" />
                </Stack>
              </Radio.Group>
            </Group>

            {/* Commentaire */}
            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>
                Commentaire
              </Text>
              <Textarea
                {...register('comment')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                rows={4}
                placeholder="Notes..."
                styles={{ input: { background: FIELD_BG, fontSize: 'var(--crud-field-font-size)' } }}
              />
            </Group>

            {/* Actif */}
            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Actif
              </Text>
              <Checkbox
                size="md"
                checked={watch('active')}
                onChange={e => setValue('active', e.currentTarget.checked)}
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
                    if (!window.confirm(`Supprimer la catégorie "${category?.label}" ?`)) return;
                    await deleteMutation.mutateAsync(id!);
                    router.push('/referentiels/categories');
                  }}
                >
                  Supprimer
                </Button>
              )}
            </Box>
            <Group gap="var(--crud-form-footer-gap)">
              <Button
                size="sm"
                radius="md"
                variant="default"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                radius="md"
                type="submit"
                loading={isSubmitting}
              >
                Enregistrer
              </Button>
            </Group>
          </Group>
        </form>
      </Box>
    </Box>
  );
}
