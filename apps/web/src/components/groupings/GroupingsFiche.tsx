'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter, useSearchParams } from 'next/navigation';
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
  TextInput,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { IconAlertCircle, IconCategory, IconWallet } from '@tabler/icons-react';
import {
  useRegroupement,
  useCreateRegroupement,
  useUpdateRegroupement,
  useDeleteRegroupement,
  type RegroupementPayload,
} from '@/hooks/useGroupings';
import { openSecondaryTab } from '@/lib/secondary-tab';
import { confirmSimpleDelete } from '@/lib/confirmDelete';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  idSource: z.string().optional(),
  expense: z.boolean(),
  income: z.boolean(),
  dashboard: z.boolean(),
  dashboardKind: z.enum(['expense', 'income']).nullable(),
});

type FormValues = z.infer<typeof schema>;

const DASHBOARD_KIND_OPTIONS = [
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Revenu' },
];

function toPayload(values: FormValues): RegroupementPayload {
  return {
    label: values.label,
    idSource: values.idSource || null,
    expense: values.expense,
    income: values.income,
    dashboard: values.dashboard,
    dashboardKind: values.dashboard ? values.dashboardKind : null,
  };
}

type Props = { id?: string };

export function GroupingsFiche({ id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = !id;

  const { data: regroupement, isLoading } = useRegroupement(id ?? '');
  const createMutation = useCreateRegroupement();
  const updateMutation = useUpdateRegroupement();
  const deleteMutation = useDeleteRegroupement();

  const buildListUrl = (highlightId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('highlight');
    if (highlightId) params.set('highlight', highlightId);
    const qs = params.toString();
    return `/referentiels/regroupements${qs ? `?${qs}` : ''}`;
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', idSource: '', expense: false, income: false, dashboard: false, dashboardKind: null },
  });

  useEffect(() => {
    if (regroupement) {
      reset({
        label: regroupement.label,
        idSource: regroupement.idSource ?? '',
        expense: regroupement.expense,
        income: regroupement.income,
        dashboard: regroupement.dashboard,
        dashboardKind: regroupement.dashboardKind,
      });
    }
  }, [regroupement, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(buildListUrl(created.id));
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(buildListUrl(id));
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError =
    (isNew ? createMutation.error : updateMutation.error)?.message
    ?? deleteMutation.error?.message
    ?? null;

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
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text inherit fw={700}>Fiche regroupement</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={() => router.push(buildListUrl())}>
              Fermer
            </Button>
          </Group>
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
                value={watch('idSource') ?? ''}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                disabled
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

            {/* Enveloppe */}
            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Enveloppe
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
                onChange={e => {
                  const checked = e.currentTarget.checked;
                  setValue('dashboard', checked);
                  if (!checked) setValue('dashboardKind', null);
                }}
              />
            </Group>

            {watch('dashboard') && (
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Type dans le tableau de bord
                </Text>
                <Select
                  size="sm"
                  radius="md"
                  style={{ flex: 1 }}
                  data={DASHBOARD_KIND_OPTIONS}
                  value={watch('dashboardKind')}
                  onChange={value => setValue('dashboardKind', value as 'expense' | 'income' | null)}
                  placeholder="Choisir..."
                  styles={{ input: fieldInputStyle }}
                />
              </Group>
            )}

            {!isNew && (
              <Group gap={0} align="center">
                <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                  Voir
                </Text>
                <Group gap={8}>
                  <Button
                    type="button"
                    size="xs"
                    radius="md"
                    variant="outline"
                    leftSection={<IconCategory size={14} />}
                    onClick={() => openSecondaryTab(`/referentiels/categories?regroupementId=${id}`)}
                  >
                    Catégories de ce regroupement
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    radius="md"
                    variant="outline"
                    leftSection={<IconWallet size={14} />}
                    onClick={() => openSecondaryTab(`/referentiels/enveloppes?regroupementId=${id}`)}
                  >
                    Enveloppes de ce regroupement
                  </Button>
                </Group>
              </Group>
            )}
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
                  type="button"
                  size="xs"
                  radius="md"
                  variant="outline"
                  color="red"
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    if (!(await confirmSimpleDelete(`Supprimer le regroupement "${regroupement?.label}" ?`))) return;
                    try {
                      await deleteMutation.mutateAsync(id!);
                      router.push(buildListUrl());
                    } catch {
                      // erreur affichée via mutationError
                    }
                  }}
                >
                  Supprimer
                </Button>
              )}
            </Box>
            <Group gap="var(--crud-form-footer-gap)">
              <Button type="button" size="sm" radius="md" variant="default" onClick={() => router.back()}>
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
