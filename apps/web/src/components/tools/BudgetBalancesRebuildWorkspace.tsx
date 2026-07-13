'use client';

import { useState } from 'react';
import { Alert, Box, Button, Center, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { useRebuildBudgetBalances } from '@/hooks/useEnveloppes';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;
const PANEL_BG = '#ffffff';
const TEXT_MUTED = '#667085';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function BudgetBalancesRebuildWorkspace() {
  const rebuildMutation = useRebuildBudgetBalances();
  const result = rebuildMutation.data;
  const [dateRef, setDateRef] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <Box style={{ padding: '20px 24px' }}>
      <Stack gap={18} style={{ maxWidth: 900, margin: '0 auto' }}>
        <Text fw={700} fz={22}>Recalcul des soldes enveloppes</Text>

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
            Traitement
          </Box>

          <Stack gap={16} style={{ padding: '18px 20px' }}>
            {rebuildMutation.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{rebuildMutation.error?.message}</Text>
              </Alert>
            ) : null}

            <Text fz={13} c={TEXT_MUTED}>
              Rejoue toutes les opérations et ventilations existantes pour recalculer, à la date de référence
              choisie, le solde de chaque enveloppe (colonne <em>balance</em>, sur la date d&apos;opération) et son
              solde en date d&apos;échéance (colonne <em>invoiceBalance</em>), puis les enregistre sur
              l&apos;enveloppe avec cette date de référence.
            </Text>

            <Group align="end">
              <Box style={{ minWidth: 220 }}>
                <Text fz={13} fw={600} mb={6}>Date de référence</Text>
                <TextInput
                  type="date"
                  value={dateRef}
                  onChange={event => setDateRef(event.currentTarget.value)}
                />
              </Box>
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => rebuildMutation.mutate({ referenceDate: toIsoDate(dateRef) })}
                loading={rebuildMutation.isPending}
              >
                Recalculer les soldes
              </Button>
            </Group>
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
            Résultat
          </Box>

          {!result ? (
            <Center style={{ minHeight: 100 }}>
              <Text c={TEXT_MUTED}>Aucun recalcul lancé.</Text>
            </Center>
          ) : (
            <Group style={{ padding: '18px 20px' }}>
              <Text fw={600}>{result.updatedCount} enveloppe(s) mise(s) à jour</Text>
              <Text c={TEXT_MUTED} fz={13}>Date de référence : {formatDate(result.referenceDate)}</Text>
            </Group>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
