'use client';

import { Alert, Badge, Box, Group, Stack, Table, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

export function EnvironmentWorkspace() {
  const envLabel = process.env.NEXT_PUBLIC_APP_ENV_LABEL ?? 'LOCAL';
  const envDescription = process.env.NEXT_PUBLIC_APP_ENV_DESCRIPTION ?? 'Base locale principale';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  const databaseName = process.env.NEXT_PUBLIC_APP_DB_NAME ?? 'moneyback';
  const webOrigin = process.env.NEXT_PUBLIC_APP_WEB_URL ?? 'http://localhost:3000';

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Environnement actif</Text>

        <Alert color="orange" icon={<IconAlertTriangle size={16} />} variant="light">
          <Text size="sm">
            Vérifie toujours cet écran avant un test sensible, surtout si tu manipules des données importées.
          </Text>
        </Alert>

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
            Contexte courant
          </Box>

          <Stack gap={16} style={{ padding: '18px 20px' }}>
            <Group gap={10}>
              <Badge color={envLabel === 'TEST' ? 'orange' : 'green'} variant="filled" radius="sm" size="lg">
                {envLabel}
              </Badge>
              <Text fw={600}>{envDescription}</Text>
            </Group>

            <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th style={{ width: 240 }}>Base PostgreSQL</Table.Th>
                  <Table.Td>{databaseName}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>URL API</Table.Th>
                  <Table.Td>{apiUrl}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>URL Web</Table.Th>
                  <Table.Td>{webOrigin}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Connexion base</Table.Th>
                  <Table.Td>{databaseName}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Text fz={13} c={TEXT_MUTED}>
              En mode test, l’application doit pointer vers `moneyback_test` et afficher le badge `TEST` dans la barre de navigation.
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
