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
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  useCreateThirdParty,
  useDeleteThirdParty,
  useThirdParty,
  useUpdateThirdParty,
  type ThirdPartyPayload,
} from '@/hooks/useThirdParties';

const GRAY_BORDER = '#dee2e6';
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  keyword1: z.string().optional(),
  keyword2: z.string().optional(),
  keyword3: z.string().optional(),
  keywordMode: z.enum(['OR', 'AND']),
  affectationFormula: z.string().optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): ThirdPartyPayload {
  return {
    name: values.name,
    keyword1: values.keyword1 || null,
    keyword2: values.keyword2 || null,
    keyword3: values.keyword3 || null,
    keywordMode: values.keywordMode,
    affectationFormula: values.affectationFormula || null,
    active: values.active,
  };
}

type Props = { id?: string };

export function TiersFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: tiers, isLoading } = useThirdParty(id ?? '');
  const createMutation = useCreateThirdParty();
  const updateMutation = useUpdateThirdParty();
  const deleteMutation = useDeleteThirdParty();

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
      name: '',
      keyword1: '',
      keyword2: '',
      keyword3: '',
      keywordMode: 'OR',
      affectationFormula: '',
      active: true,
    },
  });

  useEffect(() => {
    if (tiers) {
      reset({
        name: tiers.name,
        keyword1: tiers.keyword1 ?? '',
        keyword2: tiers.keyword2 ?? '',
        keyword3: tiers.keyword3 ?? '',
        keywordMode: tiers.keywordMode,
        affectationFormula: tiers.affectationFormula ?? '',
        active: tiers.active,
      });
    }
  }, [tiers, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/referentiels/tiers?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/referentiels/tiers?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;

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
          Fiche tiers
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
                Nom <span style={{ color: 'red' }}>*</span>
              </Text>
              <TextInput {...register('name')} size="sm" radius="md" style={{ flex: 1 }} error={errors.name?.message} autoFocus styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Mot-clé 1</Text>
              <TextInput {...register('keyword1')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Mot-clé 2</Text>
              <TextInput {...register('keyword2')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Mot-clé 3</Text>
              <TextInput {...register('keyword3')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Mode mots-clés</Text>
              <Select
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                data={[
                  { value: 'OR', label: 'OU' },
                  { value: 'AND', label: 'ET' },
                ]}
                value={watch('keywordMode')}
                onChange={val => setValue('keywordMode', (val as 'OR' | 'AND') ?? 'OR')}
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>Formule d&apos;affectation</Text>
              <Textarea
                {...register('affectationFormula')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                rows={4}
                placeholder="Formule ou règle d'affectation..."
                styles={{ input: { background: FIELD_BG, fontSize: 'var(--crud-field-font-size)' } }}
              />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Actif</Text>
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
                  color="red"
                  variant="light"
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer le tiers "${tiers?.name}" ?`)) return;
                    try {
                      await deleteMutation.mutateAsync(id!);
                      router.push('/referentiels/tiers');
                    } catch {
                      void 0;
                    }
                  }}
                >
                  Supprimer
                </Button>
              )}
            </Box>

            <Group gap="var(--crud-form-footer-gap)">
              <Button variant="default" radius="md" onClick={() => router.push('/referentiels/tiers')}>
                Retour
              </Button>
              <Button type="submit" radius="md" loading={isSubmitting}>
                Enregistrer
              </Button>
            </Group>
          </Group>
        </form>
      </Box>
    </Box>
  );
}
