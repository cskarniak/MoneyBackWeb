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
import { confirmSimpleDelete } from '@/lib/confirmDelete';
import {
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  type NotePayload,
} from '@/hooks/useNotes';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const FIELD_BG = '#fbfdff';
const LABEL_COLOR = '#1f2937';

const schema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire'),
  content: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toPayload(values: FormValues): NotePayload {
  return {
    title: values.title,
    content: values.content || '',
  };
}

type Props = { id?: string };

export function NotesFiche({ id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = !id;

  const { data: note, isLoading } = useNote(id ?? '');
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const buildListUrl = (highlightId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('highlight');
    if (highlightId) params.set('highlight', highlightId);
    const qs = params.toString();
    return `/notes${qs ? `?${qs}` : ''}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '' },
  });

  useEffect(() => {
    if (note) {
      reset({ title: note.title, content: note.content });
    }
  }, [note, reset]);

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
            <Text inherit fw={700}>Fiche note</Text>
            <Button variant="subtle" size="xs" color="rgba(255,255,255,0.92)" onClick={() => router.push(buildListUrl())}>
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
                Titre <span style={{ color: 'red' }}>*</span>
              </Text>
              <TextInput
                {...register('title')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                error={errors.title?.message}
                autoFocus
                styles={{ input: fieldInputStyle }}
              />
            </Group>

            <Group gap={0} align="flex-start">
              <Text fz="var(--crud-font-size)" fw={600} c={LABEL_COLOR} style={topLabelStyle}>Contenu</Text>
              <Textarea
                {...register('content')}
                size="sm"
                radius="md"
                style={{ flex: 1 }}
                rows={18}
                autosize
                minRows={18}
                placeholder="Notes, idées, préparations chiffrées..."
                styles={{ input: { background: FIELD_BG, fontSize: 'var(--crud-field-font-size)', fontFamily: 'monospace' } }}
              />
            </Group>
          </Stack>

          <Group
            justify="space-between"
            gap="var(--crud-form-footer-gap)"
            style={{
              padding: 'var(--crud-form-footer-padding-y) var(--crud-form-footer-padding-x)',
              background: FIELD_BG,
            }}
          >
            <Group gap={8}>
              {!isNew && (
                <Button
                  type="button"
                  size="xs"
                  radius="md"
                  color="red"
                  variant="light"
                  loading={deleteMutation.isPending}
                  onClick={async () => {
                    if (!(await confirmSimpleDelete(`Supprimer la note "${note?.title}" ?`))) return;
                    try {
                      await deleteMutation.mutateAsync(id!);
                      router.push(buildListUrl());
                    } catch {
                      void 0;
                    }
                  }}
                >
                  Supprimer
                </Button>
              )}
            </Group>

            <Group gap="var(--crud-form-footer-gap)">
              <Button type="button" variant="default" radius="md" onClick={() => router.push(buildListUrl())}>
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
