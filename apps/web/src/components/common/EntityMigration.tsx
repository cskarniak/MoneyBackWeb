'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconCopy, IconExternalLink } from '@tabler/icons-react';
import { PositioningSelect } from '@/components/common/PositioningSelect';

const TEXT_MUTED = '#667085';

type MigrationOption = { value: string; label: string };

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function MigrationReportBanner({
  entityLabel,
  migratedToLabel,
  migratedAt,
  report,
  targetHref,
}: {
  entityLabel: string;
  migratedToLabel: string;
  migratedAt: string | null;
  report: string;
  targetHref: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  return (
    <Alert color="orange" icon={<IconAlertCircle size={16} />} title={`${entityLabel} migrée`}>
      <Stack gap={10}>
        <Text size="sm">
          Cette fiche a été migrée vers <strong>{migratedToLabel}</strong>
          {migratedAt ? ` le ${new Date(migratedAt).toLocaleString('fr-FR')}` : ''}.
        </Text>
        <Textarea
          value={report}
          readOnly
          autosize
          minRows={4}
          maxRows={14}
          styles={{ input: { fontFamily: 'monospace', fontSize: 12, background: '#fff' } }}
        />
        <Group gap={8}>
          <Button
            size="xs"
            variant="default"
            leftSection={<IconCopy size={14} />}
            onClick={async () => {
              const ok = await copyToClipboard(report);
              setCopied(ok);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copié !' : 'Copier le rapport'}
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconExternalLink size={14} />}
            onClick={() => router.push(targetHref)}
          >
            Ouvrir la fiche cible
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}

export function MigrateActionButton({
  entityLabel,
  currentId,
  currentLabel,
  options,
  onMigrate,
}: {
  entityLabel: string;
  currentId: string;
  currentLabel: string;
  options: MigrationOption[];
  onMigrate: (targetId: string) => Promise<{ report: string }>;
}) {
  const [opened, setOpened] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const targetOptions = options.filter(option => option.value !== currentId);
  const targetLabel = targetOptions.find(option => option.value === targetId)?.label ?? '';

  const close = () => {
    setOpened(false);
    setTargetId(null);
    setError(null);
    setReport(null);
    setIsMigrating(false);
  };

  const handleConfirm = async () => {
    if (!targetId) return;
    setIsMigrating(true);
    setError(null);
    try {
      const result = await onMigrate(targetId);
      setReport(result.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration impossible.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="xs"
        radius="md"
        variant="outline"
        color="grape"
        leftSection={<IconArrowRight size={14} />}
        onClick={() => setOpened(true)}
      >
        Migrer vers...
      </Button>

      <Modal opened={opened} onClose={close} title={`Migrer cette ${entityLabel}`} centered size="lg">
        <Stack gap={16}>
          {!report ? (
            <>
              <Text size="sm">
                Toutes les références à <strong>« {currentLabel} »</strong> (opérations, opérations ventilées,
                tiers, tiers ventilés, abonnements, abonnements ventilés) seront basculées vers la {entityLabel}{' '}
                choisie ci-dessous. « {currentLabel} » sera ensuite rendue inactive et conservera un rapport de
                migration consultable.
              </Text>

              <PositioningSelect
                label={`${entityLabel.charAt(0).toUpperCase()}${entityLabel.slice(1)} cible`}
                placeholder="Choisir..."
                data={targetOptions}
                value={targetId}
                onChange={setTargetId}
                clearable
              />

              {error ? (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>
                  <Text size="sm">{error}</Text>
                </Alert>
              ) : null}

              <Group justify="flex-end" gap={8}>
                <Button variant="default" onClick={close}>
                  Annuler
                </Button>
                <Button color="grape" loading={isMigrating} disabled={!targetId} onClick={handleConfirm}>
                  Migrer{targetLabel ? ` vers "${targetLabel}"` : ''}
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Alert color="green">
                <Text size="sm">Migration effectuée avec succès.</Text>
              </Alert>
              <Textarea
                value={report}
                readOnly
                autosize
                minRows={4}
                maxRows={14}
                styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
              />
              <Text size="xs" c={TEXT_MUTED}>
                Ce rapport reste consultable en rouvrant la fiche d&apos;origine.
              </Text>
              <Group justify="flex-end" gap={8}>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconCopy size={14} />}
                  onClick={async () => {
                    const ok = await copyToClipboard(report);
                    setCopied(ok);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? 'Copié !' : 'Copier le rapport'}
                </Button>
                <Button onClick={close}>Fermer</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}

