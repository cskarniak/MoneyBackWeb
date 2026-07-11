'use client';

import { useState } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Modal, Stack, Table, Text } from '@mantine/core';
import { IconAlertCircle, IconDeviceFloppy, IconDownload, IconDatabaseImport } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useCreateDatabaseBackup, useDatabaseBackups, useRestoreDatabaseBackup } from '@/hooks/useDatabaseBackups';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR');
}

function formatSize(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function getDownloadUrl(filename: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const normalizedBaseUrl = baseUrl.endsWith('/api')
    ? baseUrl
    : `${baseUrl.replace(/\/$/, '')}/api`;
  return `${normalizedBaseUrl}/database-backups/${encodeURIComponent(filename)}/download`;
}

export function DatabaseBackupWorkspace() {
  const backupsQuery = useDatabaseBackups();
  const createMutation = useCreateDatabaseBackup();
  const restoreMutation = useRestoreDatabaseBackup();
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Sauvegarde de la base</Text>

        <Box
          style={{
            background: PANEL_BG,
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box
            style={{
              background: CRUD.couleurs.fondBandeau,
              color: CRUD.couleurs.texteBandeau,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Nouvelle sauvegarde
          </Box>

          <Stack gap={16} style={{ padding: '18px 20px' }}>
            {createMutation.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{createMutation.error.message}</Text>
              </Alert>
            ) : null}

            {createMutation.data ? (
              <Alert color="green">
                <Text size="sm">{createMutation.data.message}</Text>
                <Text size="sm" c={TEXT_MUTED}>{createMutation.data.filename}</Text>
              </Alert>
            ) : null}

            <Button
              leftSection={<IconDeviceFloppy size={14} />}
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              style={{ alignSelf: 'flex-start' }}
            >
              Créer une sauvegarde datée
            </Button>

            <Text fz={13} c={TEXT_MUTED}>
              La sauvegarde produit un dump PostgreSQL `.sql` dans `Téléchargements/moneyback_backups`.
            </Text>
          </Stack>
        </Box>

        <Box
          style={{
            background: PANEL_BG,
            border: `1px solid ${GRAY_BORDER}`,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box
            style={{
              background: CRUD.couleurs.fondBandeau,
              color: CRUD.couleurs.texteBandeau,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Sauvegardes disponibles
          </Box>

          {backupsQuery.isLoading ? (
            <Center style={{ minHeight: 140 }}>
              <Loader size="sm" />
            </Center>
          ) : backupsQuery.isError ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />} m="md">
              <Text size="sm">{backupsQuery.error.message}</Text>
            </Alert>
          ) : (
            <Stack gap={0}>
              <Box style={{ padding: '14px 16px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
                <Text fw={600}>Dossier : {backupsQuery.data?.directory ?? '—'}</Text>
              </Box>

              <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th>Fichier</Table.Th>
                    <Table.Th>Taille</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Chemin</Table.Th>
                    <Table.Th>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(backupsQuery.data?.items.length ?? 0) === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '18px 16px' }}>
                        <Text c={TEXT_MUTED}>Aucune sauvegarde disponible.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    backupsQuery.data?.items.map(item => (
                      <Table.Tr key={item.filename}>
                        <Table.Td>{item.filename}</Table.Td>
                        <Table.Td>{formatSize(item.sizeBytes)}</Table.Td>
                        <Table.Td>{formatDate(item.createdAt)}</Table.Td>
                        <Table.Td>{item.path}</Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <Button
                              component="a"
                              href={getDownloadUrl(item.filename)}
                              size="xs"
                              variant="light"
                              leftSection={<IconDownload size={14} />}
                            >
                              Télécharger
                            </Button>
                            <Button
                              size="xs"
                              variant="light"
                              color="orange"
                              leftSection={<IconDatabaseImport size={14} />}
                              onClick={() => setRestoreTarget(item.filename)}
                            >
                              Restaurer
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          )}
        </Box>
        {restoreMutation.isSuccess ? (
          <Alert color="green" icon={<IconDatabaseImport size={16} />}>
            <Text size="sm">{restoreMutation.data.message}</Text>
            <Text size="sm" c={TEXT_MUTED}>{restoreMutation.data.filename}</Text>
          </Alert>
        ) : null}

        {restoreMutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            <Text size="sm">{restoreMutation.error.message}</Text>
          </Alert>
        ) : null}
      </Stack>

      <Modal
        opened={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        title="Confirmer la restauration"
        centered
      >
        <Stack gap={16}>
          <Text size="sm">
            La base de données actuelle sera <strong>entièrement remplacée</strong> par le contenu de la sauvegarde :
          </Text>
          <Text size="sm" fw={600}>{restoreTarget}</Text>
          <Text size="sm" c="red">Cette opération est irréversible. Pensez à créer une sauvegarde avant de continuer.</Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="default" onClick={() => setRestoreTarget(null)}>
              Annuler
            </Button>
            <Button
              color="orange"
              loading={restoreMutation.isPending}
              onClick={() => {
                if (restoreTarget) {
                  restoreMutation.mutate(restoreTarget, {
                    onSuccess: () => setRestoreTarget(null),
                  });
                }
              }}
            >
              Restaurer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
