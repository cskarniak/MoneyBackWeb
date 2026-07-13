'use client';

import { CRUD } from '@/lib/crud-tokens';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Checkbox, Group, Stack, Text, Textarea, TextInput, Alert, Loader, Center } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useRegroupementsAll } from '@/hooks/useGroupings';
import { useMovementTypesAll } from '@/hooks/useMovementTypes';
import { useCreateEnveloppe, useDeleteEnveloppe, useEnveloppe, useUpdateEnveloppe, type EnveloppePayload } from '@/hooks/useEnveloppes';
import { PositioningSelect } from '@/components/common/PositioningSelect';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  label: z.string().min(1, 'Le libellé est obligatoire'),
  regroupementId: z.string().nullable().optional(),
  regroupementTableauDeBordId: z.string().nullable().optional(),
  movementTypeId: z.string().nullable().optional(),
  comment: z.string().optional(),
  summary: z.boolean(),
  dashboard: z.boolean(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): EnveloppePayload {
  return {
    label: values.label,
    regroupementId: values.regroupementId || null,
    regroupementTableauDeBordId: values.regroupementTableauDeBordId || null,
    movementTypeId: values.movementTypeId || null,
    comment: values.comment || null,
    summary: values.summary,
    dashboard: !!values.regroupementTableauDeBordId || values.dashboard,
    active: values.active,
  };
}

type Props = { id?: string };

export function EnveloppesFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: enveloppe, isLoading: loadingEnveloppe } = useEnveloppe(id ?? '');
  const { data: regroupements = [], isLoading: loadingRegroupements } = useRegroupementsAll();
  const { data: movementTypes = [], isLoading: loadingMovementTypes } = useMovementTypesAll();
  const createMutation = useCreateEnveloppe();
  const updateMutation = useUpdateEnveloppe();
  const deleteMutation = useDeleteEnveloppe();

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
      regroupementId: null,
      regroupementTableauDeBordId: null,
      movementTypeId: null,
      comment: '',
      summary: false,
      dashboard: false,
      active: true,
    },
  });

  useEffect(() => {
    if (enveloppe) {
      reset({
        label: enveloppe.label,
        regroupementId: enveloppe.regroupementId,
        regroupementTableauDeBordId: enveloppe.regroupementTableauDeBordId,
        movementTypeId: enveloppe.movementTypeId,
        comment: enveloppe.comment ?? '',
        summary: enveloppe.summary,
        dashboard: enveloppe.dashboard,
        active: enveloppe.active,
      });
    }
  }, [enveloppe, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/referentiels/enveloppes?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/referentiels/enveloppes?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;
  const regroupementOptions = regroupements
    .filter(r => r.expense)
    .map(r => ({ value: r.id, label: r.label }));
  const regroupementTableauDeBordOptions = regroupements
    .filter(r => r.dashboard)
    .map(r => ({ value: r.id, label: r.label }));
  const movementTypeOptions = movementTypes.map(movementType => ({
    value: movementType.id,
    label: movementType.code?.trim() ? `${movementType.code} - ${movementType.label}` : movementType.label,
  }));
  const isLoading = (!isNew && loadingEnveloppe) || loadingRegroupements || loadingMovementTypes;

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
            <Text inherit fw={700}>Fiche enveloppe</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={() => router.push('/referentiels/enveloppes')}>
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
              <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ background: '#fff5f5', border: '1px solid #ffc9c9' }}>
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
                Id source
              </Text>
              <TextInput
                value={enveloppe?.idSource ?? ''}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                disabled
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Regroupement
              </Text>
              <PositioningSelect
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={regroupementOptions}
                value={watch('regroupementId') ?? null}
                onChange={val => setValue('regroupementId', val)}
                clearable
                placeholder="Aucun"
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Regroupement TB
              </Text>
              <PositioningSelect
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={regroupementTableauDeBordOptions}
                value={watch('regroupementTableauDeBordId') ?? null}
                onChange={val => {
                  setValue('regroupementTableauDeBordId', val);
                  setValue('dashboard', !!val);
                }}
                clearable
                placeholder="Aucun"
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>
                Type de mouvement
              </Text>
              <PositioningSelect
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={movementTypeOptions}
                value={watch('movementTypeId') ?? null}
                onChange={val => setValue('movementTypeId', val)}
                clearable
                placeholder="Aucun"
                styles={{ input: fieldInputStyle }}
              />
            </Group>

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
                    if (!window.confirm(`Supprimer l'enveloppe "${enveloppe?.label}" ?`)) return;
                    await deleteMutation.mutateAsync(id!);
                    router.push('/referentiels/enveloppes');
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
