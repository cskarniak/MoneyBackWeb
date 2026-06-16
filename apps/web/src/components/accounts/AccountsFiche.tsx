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
  Textarea,
  TextInput,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAccount, useCreateAccount, useDeleteAccount, useUpdateAccount, type AccountPayload } from '@/hooks/useAccounts';

const GRAY_BORDER = '#dee2e6';
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire'),
  agency: z.string().optional(),
  number: z.string().optional(),
  rib: z.string().optional(),
  bankUrl: z.string().optional(),
  bankLogin: z.string().optional(),
  comment: z.string().optional(),
  openingBalance: z.string().optional(),
  managedForOther: z.boolean(),
  closed: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): AccountPayload {
  return {
    name: values.name,
    agency: values.agency || null,
    number: values.number || null,
    rib: values.rib || null,
    bankUrl: values.bankUrl || null,
    bankLogin: values.bankLogin || null,
    comment: values.comment || null,
    openingBalance: values.openingBalance ? Number(values.openingBalance) : null,
    managedForOther: values.managedForOther,
    closed: values.closed,
  };
}

type Props = { id?: string };

export function AccountsFiche({ id }: Props) {
  const router = useRouter();
  const isNew = !id;

  const { data: account, isLoading: loadingAccount } = useAccount(id ?? '');
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

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
      agency: '',
      number: '',
      rib: '',
      bankUrl: '',
      bankLogin: '',
      comment: '',
      openingBalance: '',
      managedForOther: false,
      closed: false,
    },
  });

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        agency: account.agency ?? '',
        number: account.number ?? '',
        rib: account.rib ?? '',
        bankUrl: account.bankUrl ?? '',
        bankLogin: account.bankLogin ?? '',
        comment: account.comment ?? '',
        openingBalance: account.openingBalance ?? '',
        managedForOther: account.managedForOther,
        closed: account.closed,
      });
    }
  }, [account, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      if (isNew) {
        const created = await createMutation.mutateAsync(payload);
        router.push(`/comptes?highlight=${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        router.push(`/comptes?highlight=${id}`);
      }
    } catch (err: unknown) {
      void err;
    }
  };

  const mutationError = (isNew ? createMutation.error : updateMutation.error)?.message ?? null;

  if (!isNew && loadingAccount) {
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
          Fiche compte bancaire
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
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Agence</Text>
              <TextInput {...register('agency')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Numéro</Text>
              <TextInput {...register('number')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>RIB</Text>
              <TextInput {...register('rib')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>URL banque</Text>
              <TextInput {...register('bankUrl')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Identifiant</Text>
              <TextInput {...register('bankLogin')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Solde de départ</Text>
              <TextInput {...register('openingBalance')} size="sm" radius="md" style={{ flex: 1 }} styles={{ input: fieldInputStyle }} />
            </Group>

            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>Commentaire</Text>
              <Textarea {...register('comment')} size="sm" radius="md" style={{ flex: 1 }} rows={4} placeholder="Notes..." styles={{ input: { background: FIELD_BG, fontSize: 'var(--crud-field-font-size)' } }} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Géré pour autrui</Text>
              <Checkbox size="md" checked={watch('managedForOther')} onChange={e => setValue('managedForOther', e.currentTarget.checked)} />
            </Group>

            <Group gap={0} align="center">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={labelStyle}>Fermé</Text>
              <Checkbox size="md" checked={watch('closed')} onChange={e => setValue('closed', e.currentTarget.checked)} />
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
                    if (!window.confirm(`Supprimer le compte "${account?.name}" ?`)) return;
                    await deleteMutation.mutateAsync(id!);
                    router.push('/comptes');
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
