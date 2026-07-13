'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Code,
  FileInput,
  Group,
  Paper,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconChecklist,
  IconFileImport,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { useAccountsAll } from '@/hooks/useAccounts';
import { useConfirmBankCsv, useImportProfilesAll, usePreviewBankCsv } from '@/hooks/useImportProfiles';
import { CRUD } from '@/lib/crud-tokens';
import { startsWithOptionsFilter } from '@/lib/select-filter';
import { decodeTextFile } from '@/lib/text-file-decoder';

const PANEL_STYLE = {
  background: '#ffffff',
  border: `1px solid ${CRUD.couleurs.grilleTableau}`,
  borderRadius: 10,
  overflow: 'hidden' as const,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
};

const TABLE_MIN_WIDTH = 1680;

function formatPreviewDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatPreviewColumnAmount(value: string | null) {
  if (!value) return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function TruncatedCell({ value, width }: { value: string | null; width: number }) {
  const content = value?.trim() ? value : '—';
  const showTooltip = content !== '—' && content.length > 40;

  return (
    <Tooltip label={content} disabled={!showTooltip} withArrow multiline maw={420}>
      <Text
        fz={12}
        style={{
          maxWidth: width,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {content}
      </Text>
    </Tooltip>
  );
}

export function BankImportWorkspace() {
  const router = useRouter();
  const { data: profilesResponse, isLoading: loadingProfiles } = useImportProfilesAll();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccountsAll();
  const previewMutation = usePreviewBankCsv();
  const confirmMutation = useConfirmBankCsv();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [selectedLineNums, setSelectedLineNums] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchReference, setBatchReference] = useState('');
  const [integrationDate, setIntegrationDate] = useState(new Date().toISOString().slice(0, 10));

  const preview = previewMutation.data;
  const profiles = profilesResponse?.items ?? [];
  const selectedProfile = profiles.find(profile => profile.id === selectedProfileId) ?? null;

  useEffect(() => {
    if (!preview) return;

    setSelectedLineNums(
      preview.lines
        .filter(line => line.status === 'valid')
        .map(line => String(line.lineNum)),
    );
  }, [preview]);

  const profileOptions = useMemo(
    () =>
      profiles.map(profile => ({
        value: profile.id,
        label: profile.name,
      })),
    [profiles],
  );

  const accountOptions = useMemo(
    () =>
      accounts.map(account => ({
        value: account.id,
        label: account.name,
      })),
    [accounts],
  );

  const selectableLineNums = useMemo(
    () =>
      (preview?.lines ?? [])
        .filter(line => line.status !== 'error')
        .map(line => String(line.lineNum)),
    [preview],
  );

  const selectedCount = selectedLineNums.length;
  const alreadyInOperationsCount = preview?.lines.filter(line => line.alreadyInOperations).length ?? 0;
  const duplicateInFileCount = preview?.lines.filter(line => line.duplicateInFile).length ?? 0;
  const progressPercent = importProgress && importProgress.total > 0
    ? Math.round((importProgress.done / importProgress.total) * 100)
    : 0;

  const isAllSelectableChecked =
    selectableLineNums.length > 0 && selectableLineNums.every(lineNum => selectedLineNums.includes(lineNum));

  useEffect(() => {
    if (!selectedFile) return;

    const encoding = selectedProfile?.mapping.file.encoding || 'utf-8';
    let cancelled = false;

    void decodeTextFile(selectedFile, encoding)
      .then(content => {
        if (cancelled) return;
        setCsvContent(content);
      })
      .catch(() => {
        if (cancelled) return;
        notifications.show({ message: 'Impossible de lire le fichier sélectionné.', color: 'red' });
        setSelectedFile(null);
        setSelectedFileName(null);
        setCsvContent('');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile, selectedProfile]);

  const handleFileSelected = (file: File | null) => {
    previewMutation.reset();
    setSelectedLineNums([]);

    if (!file) {
      setSelectedFile(null);
      setSelectedFileName(null);
      setCsvContent('');
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  const handlePreview = async () => {
    if (!selectedAccountId) {
      notifications.show({ message: "Choisis d'abord le compte concerné.", color: 'orange' });
      return;
    }

    if (!selectedProfileId) {
      notifications.show({ message: "Choisis d'abord un masque d'import.", color: 'orange' });
      return;
    }

    if (!csvContent.trim()) {
      notifications.show({ message: "Sélectionne d'abord un fichier CSV.", color: 'orange' });
      return;
    }

    try {
      await previewMutation.mutateAsync({
        accountId: selectedAccountId,
        profileId: selectedProfileId,
        csvContent,
      });
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : "La visualisation de l'import a échoué.",
        color: 'red',
      });
    }
  };

  const handleImport = async () => {
    if (!preview) {
      notifications.show({ message: "Visualise d'abord le fichier.", color: 'orange' });
      return;
    }

    if (!selectedAccountId) {
      notifications.show({ message: "Choisis d'abord le compte concerné.", color: 'orange' });
      return;
    }

    const normalizedBatchReference = batchReference.trim();
    if (normalizedBatchReference.length !== 9) {
      notifications.show({ message: 'Le numéro de lot doit contenir exactement 9 caractères.', color: 'orange' });
      return;
    }

    if (!integrationDate) {
      notifications.show({ message: "Choisis d'abord la date d'intégration.", color: 'orange' });
      return;
    }

    const selectedLines = preview.lines.filter(
      line => selectedLineNums.includes(String(line.lineNum)) && line.status === 'valid',
    );

    if (selectedLines.length === 0) {
      notifications.show({ message: 'Aucune ligne valide sélectionnée à importer.', color: 'orange' });
      return;
    }

    setImportProgress({ done: 0, total: selectedLines.length });

    let importedCount = 0;
    let skippedCount = 0;

    try {
      for (let index = 0; index < selectedLines.length; index += 1) {
        const line = selectedLines[index]!;
        const result = await confirmMutation.mutateAsync({
          accountId: selectedAccountId,
          profileId: selectedProfileId ?? undefined,
          integrationDate: new Date(`${integrationDate}T00:00:00.000Z`).toISOString(),
          reference: normalizedBatchReference,
          lines: [{
            lineNum: line.lineNum,
            operationDate: line.operationDate!,
            label: line.label ?? '',
            comment: line.comment,
            pieceNumber: line.pieceNumber,
            expense: line.expense,
            income: line.income,
            statementRef: line.statementRef,
          }],
        });

        importedCount += result.importedCount;
        skippedCount += result.skippedCount;
        setImportProgress({ done: index + 1, total: selectedLines.length });
      }

      notifications.show({
        message: `${importedCount} ligne(s) importée(s), ${skippedCount} ignorée(s).`,
        color: importedCount > 0 ? 'green' : 'yellow',
      });
      window.alert(`Import terminé.\n${importedCount} ligne(s) importée(s), ${skippedCount} ignorée(s).`);

      await handlePreview();
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : "L'import a échoué.",
        color: 'red',
      });
    } finally {
      setImportProgress(null);
    }
  };

  const toggleLine = (lineNum: string, checked: boolean) => {
    setSelectedLineNums(current =>
      checked ? Array.from(new Set([...current, lineNum])) : current.filter(value => value !== lineNum),
    );
  };

  const toggleAllSelectable = (checked: boolean) => {
    setSelectedLineNums(checked ? selectableLineNums : []);
  };

  const statusBadge = (line: NonNullable<typeof preview>['lines'][number]) => {
    if (line.alreadyInOperations) {
      return <Badge color="orange" variant="light">Déjà en opérations</Badge>;
    }

    if (line.duplicateInFile) {
      return <Badge color="yellow" variant="light">Doublon fichier</Badge>;
    }

    if (line.status === 'error') {
      return <Badge color="red" variant="light">Erreur</Badge>;
    }

    return <Badge color="teal" variant="light">À importer</Badge>;
  };

  return (
    <Stack gap={18} style={{ maxWidth: 1760, margin: '0 auto' }}>
      <Group justify="space-between" align="flex-end">
        <Box>
          <Text fw={700} fz={22}>Import bancaire</Text>
          <Text c="dimmed" fz="sm">
            Sélectionne le fichier, applique un masque existant, puis coche les lignes à retenir pour la suite du traitement.
          </Text>
        </Box>
        <Badge variant="light" color="blue">Étape 1 sur 2</Badge>
      </Group>

      <Alert color="blue" variant="light" icon={<IconChecklist size={16} />}>
        Cette étape prépare l&apos;import. Les lignes déjà présentes dans les opérations sont repérées à partir de la clé
        `date + libellé + montant`.
      </Alert>

      <Paper style={PANEL_STYLE}>
        <Box
          style={{
            background: CRUD.couleurs.fondBandeau,
            color: CRUD.couleurs.texteBandeau,
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Sélection du fichier
        </Box>

        <Stack gap="md" p="lg">
          <Group align="flex-end" wrap="wrap">
            <Select
              style={{ flex: '1 1 320px' }}
              label="Compte"
              placeholder={loadingAccounts ? 'Chargement des comptes...' : 'Choisir un compte'}
              data={accountOptions}
              value={selectedAccountId}
              onChange={value => {
                previewMutation.reset();
                setSelectedLineNums([]);
                setSelectedAccountId(value);
              }}
              searchable
              filter={startsWithOptionsFilter}
              nothingFoundMessage="Aucun compte"
            />

            <FileInput
              style={{ flex: '1 1 460px' }}
              label="Fichier CSV"
              placeholder="Sélectionner un fichier bancaire"
              accept=".csv,text/csv"
              value={null}
              onChange={handleFileSelected}
              leftSection={<IconFileImport size={15} />}
            />

            <Select
              style={{ flex: '1 1 320px' }}
              label="Masque d'import"
              placeholder={loadingProfiles ? 'Chargement des masques...' : 'Choisir un masque'}
              data={profileOptions}
              value={selectedProfileId}
              onChange={value => {
                previewMutation.reset();
                setSelectedLineNums([]);
                setSelectedProfileId(value);
              }}
              searchable
              filter={startsWithOptionsFilter}
              nothingFoundMessage="Aucun masque"
            />

            <Button
              onClick={handlePreview}
              loading={previewMutation.isPending}
              leftSection={<IconRefresh size={15} />}
            >
              Visualiser le fichier
            </Button>
          </Group>

          {selectedFileName ? (
            <Text size="sm" c="dimmed">
              Fichier chargé : <Code>{selectedFileName}</Code>
            </Text>
          ) : null}

          {profiles.length === 0 && !loadingProfiles ? (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
              <Group justify="space-between" align="center">
                <Text size="sm">Aucun masque actif n&apos;est disponible pour interpréter le fichier.</Text>
                <Button
                  size="xs"
                  variant="white"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => router.push('/imports/new')}
                >
                  Créer un masque
                </Button>
              </Group>
            </Alert>
          ) : null}

          {accounts.length === 0 && !loadingAccounts ? (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
              <Text size="sm">Aucun compte n&apos;est disponible pour contrôler les doublons de l&apos;import.</Text>
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {preview ? (
        <Paper style={PANEL_STYLE}>
          <Box
            style={{
              background: CRUD.couleurs.fondBandeau,
              color: CRUD.couleurs.texteBandeau,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Visualisation des lignes
          </Box>

          <Stack gap="md" p="lg">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <Badge variant="light" color="blue">{preview.totalLines} ligne(s)</Badge>
                <Badge variant="light" color="teal">{preview.validLines} prête(s)</Badge>
                <Badge variant="light" color="orange">{alreadyInOperationsCount} déjà en opérations</Badge>
                <Badge variant="light" color="yellow">{duplicateInFileCount} doublon(s) fichier</Badge>
                <Badge variant="light" color="red">{preview.errorLines} erreur(s)</Badge>
              </Group>

              <Group gap="sm">
                <TextInput
                  label="Numéro de lot"
                  placeholder="9 caractères"
                  value={batchReference}
                  onChange={event => setBatchReference(event.currentTarget.value.toUpperCase())}
                  maxLength={9}
                  styles={{ root: { minWidth: 170 } }}
                />
                <TextInput
                  label="Date d'intégration"
                  type="date"
                  value={integrationDate}
                  onChange={event => setIntegrationDate(event.currentTarget.value)}
                  styles={{ root: { minWidth: 170 } }}
                />
                {importProgress ? (
                  <Box style={{ minWidth: 240 }}>
                    <Text size="xs" c="dimmed" mb={4}>
                      Import en cours: {importProgress.done}/{importProgress.total}
                    </Text>
                    <Progress value={progressPercent} size="sm" radius="xl" animated />
                  </Box>
                ) : null}
                <Checkbox
                  label="Tout cocher"
                  checked={isAllSelectableChecked}
                  onChange={event => toggleAllSelectable(event.currentTarget.checked)}
                  disabled={selectableLineNums.length === 0}
                />
                <Text size="sm" c="dimmed">
                  {selectedCount} ligne(s) cochée(s)
                </Text>
                <Button
                  onClick={handleImport}
                  loading={confirmMutation.isPending || importProgress !== null}
                  disabled={selectedCount === 0}
                >
                  Importer les lignes cochées
                </Button>
              </Group>
            </Group>

            <ScrollArea>
              <Table withTableBorder striped highlightOnHover style={{ minWidth: TABLE_MIN_WIDTH }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={84}>Importer</Table.Th>
                    <Table.Th w={70}>Ligne</Table.Th>
                    <Table.Th w={180}>Statut</Table.Th>
                    <Table.Th w={120}>Date</Table.Th>
                    <Table.Th w={360}>Libellé</Table.Th>
                    <Table.Th w={130}>Dépense</Table.Th>
                    <Table.Th w={130}>Recette</Table.Th>
                    <Table.Th w={260}>Commentaire</Table.Th>
                    <Table.Th w={160}>Pièce</Table.Th>
                    <Table.Th w={170}>Réf. relevé</Table.Th>
                    <Table.Th w={260}>Contrôle</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {preview.lines.map(line => {
                    const lineKey = String(line.lineNum);
                    const checked = selectedLineNums.includes(lineKey);
                    const disabled = line.status === 'error';
                    const expenseAmount = formatPreviewColumnAmount(line.expense);
                    const incomeAmount = formatPreviewColumnAmount(line.income);

                    return (
                      <Table.Tr
                        key={line.lineNum}
                        style={{
                          backgroundColor: line.alreadyInOperations
                            ? '#fff4e6'
                            : line.status === 'error'
                              ? '#fff5f5'
                              : undefined,
                        }}
                      >
                        <Table.Td>
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onChange={event => toggleLine(lineKey, event.currentTarget.checked)}
                            aria-label={`Importer la ligne ${line.lineNum}`}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text fz={12}>{line.lineNum}</Text>
                        </Table.Td>
                        <Table.Td>{statusBadge(line)}</Table.Td>
                        <Table.Td>
                          <Text fz={12} style={{ whiteSpace: 'nowrap' }}>
                            {formatPreviewDate(line.operationDate)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <TruncatedCell value={line.label} width={340} />
                        </Table.Td>
                        <Table.Td>
                          <Text
                            fz={12}
                            fw={600}
                            c={line.expense ? 'red.7' : undefined}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {expenseAmount}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text
                            fz={12}
                            fw={600}
                            c={line.income ? 'teal.7' : undefined}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {incomeAmount}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <TruncatedCell value={line.comment} width={240} />
                        </Table.Td>
                        <Table.Td>
                          <TruncatedCell value={line.pieceNumber} width={140} />
                        </Table.Td>
                        <Table.Td>
                          <TruncatedCell value={line.statementRef} width={150} />
                        </Table.Td>
                        <Table.Td>
                          <Tooltip
                            label={line.errors.join(' • ') || (line.alreadyInOperations ? 'Opération déjà présente.' : '')}
                            disabled={line.errors.length === 0 && !line.alreadyInOperations}
                            withArrow
                            multiline
                            maw={420}
                          >
                            <Text
                              fz={12}
                              c={line.errors.length > 0 ? 'red.7' : line.alreadyInOperations ? 'orange.8' : 'dimmed'}
                              style={{
                                maxWidth: 240,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {line.errors[0] ?? (line.alreadyInOperations ? 'Clé déjà trouvée dans les opérations.' : '—')}
                            </Text>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
