'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Table, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCreateThirdParty } from '@/hooks/useThirdParties';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import type { Operation } from '@/hooks/useOperations';
import { PositioningSelect } from '@/components/common/PositioningSelect';
import { filterActiveOptions } from '@/lib/activeOptions';

type Props = {
  opened: boolean;
  onClose: () => void;
  operation: Operation | null;
};

function formatAmount(value: string) {
  const amount = Number(value || 0);
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CreateThirdPartyFromOperationModal({ opened, onClose, operation }: Props) {
  const { data: categories = [] } = useCategoriesAll();
  const { data: enveloppes = [] } = useEnveloppesAll();
  const createMutation = useCreateThirdParty();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isVentilated = !!operation && operation.splits.length > 0;

  useEffect(() => {
    if (!opened || !operation) return;
    setName(operation.label.trim());
    setCategoryId(operation.categoryId ?? null);
    setBudgetId(operation.budgetId ?? null);
    setError(null);
  }, [opened, operation]);

  const categoryOptions = filterActiveOptions(
    categories.map(category => ({ value: category.id, label: category.label })),
    value => !!categories.find(category => category.id === value)?.active,
    [],
  );
  const budgetOptions = filterActiveOptions(
    enveloppes.map(budget => ({ value: budget.id, label: budget.label })),
    value => !!enveloppes.find(budget => budget.id === value)?.active,
    [],
  );

  const handleSubmit = async () => {
    if (!operation) return;
    if (!name.trim()) {
      setError('Indique le nom du tiers.');
      return;
    }
    setError(null);

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        budgetBearer: false,
        ventilated: isVentilated,
        active: true,
        categoryId: isVentilated ? null : categoryId,
        budgetId: isVentilated ? null : budgetId,
        movementTypeId: operation.movementTypeId,
        ...(isVentilated && {
          splits: operation.splits.map(split => ({
            label: split.label,
            expense: Number(split.expense),
            income: Number(split.income),
            categoryId: split.categoryId,
            budgetId: split.budgetId,
          })),
        }),
      });
      notifications.show({ message: `Tiers "${created.name}" créé.`, color: 'green' });
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Impossible de créer le tiers.');
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Créer un tiers à partir de cette écriture" size="md" centered>
      {!operation ? null : (
        <Stack gap={14}>
          <Text size="sm" c="dimmed">
            {operation.label} — {new Date(operation.operationDate).toLocaleDateString('fr-FR')}
          </Text>

          <TextInput
            label="Nom du tiers"
            value={name}
            onChange={event => setName(event.currentTarget.value)}
            required
          />

          {isVentilated ? (
            <Stack gap={8}>
              <Alert color="blue" variant="light">
                Cette écriture est ventilée : le tiers sera créé comme tiers ventilé, avec un modèle de ventilation
                reprenant ces lignes et leurs montants.
              </Alert>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Libellé</Table.Th>
                    <Table.Th>Catégorie</Table.Th>
                    <Table.Th>Enveloppe</Table.Th>
                    <Table.Th ta="right">Dépense</Table.Th>
                    <Table.Th ta="right">Recette</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {operation.splits.map((split, index) => (
                    <Table.Tr key={split.id ?? index}>
                      <Table.Td>{split.label || '—'}</Table.Td>
                      <Table.Td>{split.categorie?.label ?? '—'}</Table.Td>
                      <Table.Td>{split.enveloppe?.label ?? '—'}</Table.Td>
                      <Table.Td ta="right">{formatAmount(split.expense)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(split.income)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          ) : (
            <Group grow align="flex-end">
              <PositioningSelect
                label="Catégorie"
                placeholder="Aucune"
                data={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                clearable
              />
              <PositioningSelect
                label="Enveloppe"
                placeholder="Aucune"
                data={budgetOptions}
                value={budgetId}
                onChange={setBudgetId}
                clearable
              />
            </Group>
          )}

          {error && <Text size="sm" c="red">{error}</Text>}

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!name.trim()}>
              Créer le tiers
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
