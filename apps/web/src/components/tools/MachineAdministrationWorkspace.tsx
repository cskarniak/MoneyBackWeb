'use client';

import { Box, Center, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { IconServer } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useApiHostInfo, useHostInfo, type HostInfo } from '@/hooks/useHostInfo';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';

function HostInfoPanel({ title, hostInfo, isLoading }: { title: string; hostInfo: HostInfo | undefined; isLoading: boolean }) {
  return (
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
        <Group gap={8}>
          <IconServer size={16} />
          <Text inherit fw={700}>{title}</Text>
        </Group>
      </Box>

      <Box style={{ padding: '18px 20px' }}>
        {isLoading ? (
          <Center style={{ minHeight: 100 }}>
            <Loader size="sm" />
          </Center>
        ) : hostInfo ? (
          <Table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th style={{ width: 240 }}>Nom de la machine</Table.Th>
                <Table.Td>{hostInfo.hostname}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Système</Table.Th>
                <Table.Td>{hostInfo.platform} {hostInfo.release} ({hostInfo.arch})</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Processeur</Table.Th>
                <Table.Td>{hostInfo.cpuModel ?? 'Inconnu'} — {hostInfo.cpuCount} cœur(s)</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Mémoire</Table.Th>
                <Table.Td>{hostInfo.totalMemGB} Go</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        ) : (
          <Text size="sm" c="dimmed">Informations indisponibles.</Text>
        )}
      </Box>
    </Box>
  );
}

export function MachineAdministrationWorkspace() {
  const { data: hostInfo, isLoading: loadingHostInfo } = useHostInfo();
  const { data: apiHostInfo, isLoading: loadingApiHostInfo } = useApiHostInfo();

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Administration machine</Text>
        <Text size="sm" c="dimmed">
          Machines qui exécutent réellement le front (Next.js) et l&apos;API (NestJS) de l&apos;application, utile pour vérifier sur quel poste tourne l&apos;instance consultée.
        </Text>

        <HostInfoPanel title="Front (Next.js)" hostInfo={hostInfo} isLoading={loadingHostInfo} />
        <HostInfoPanel title="API (NestJS)" hostInfo={apiHostInfo} isLoading={loadingApiHostInfo} />
      </Stack>
    </Box>
  );
}
