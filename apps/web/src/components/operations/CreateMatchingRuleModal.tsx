'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Group, Modal, SegmentedControl, Select, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useThirdParty, useThirdPartiesAll, useCreateThirdParty, useUpdateThirdParty } from '@/hooks/useThirdParties';
import { useCategoriesAll } from '@/hooks/useCategories';
import { useEnveloppesAll } from '@/hooks/useEnveloppes';
import type { Operation } from '@/hooks/useOperations';

type ConditionDraft = {
  field: string;
  matcher: string;
  value: string;
  value2: string;
  negate: boolean;
};

const MATCHING_FIELD_OPTIONS = [
  { value: 'label', label: 'Libellé brut' },
  { value: 'normalizedLabel', label: 'Libellé normalisé' },
  { value: 'amount', label: 'Montant' },
  { value: 'direction', label: 'Sens' },
  { value: 'accountId', label: 'Compte' },
  { value: 'statementRef', label: 'Référence relevé' },
  { value: 'counterpartyName', label: 'Contrepartie' },
  { value: 'memo', label: 'Mémo' },
  { value: 'dayOfMonth', label: 'Jour du mois' },
];

const MATCHING_MATCHER_OPTIONS = [
  { value: 'contains', label: 'Contient' },
  { value: 'equals', label: 'Égal à' },
  { value: 'startsWith', label: 'Commence par' },
  { value: 'endsWith', label: 'Finit par' },
  { value: 'regex', label: 'Regex' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'between', label: 'Entre' },
  { value: 'in', label: 'Dans la liste' },
];

const DIRECTION_OPTIONS = [
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Recette' },
];

function operationAmount(operation: Operation) {
  return Number(operation.income) > 0 ? Number(operation.income) : Number(operation.expense);
}

function operationDirection(operation: Operation): 'income' | 'expense' {
  return Number(operation.income) > 0 ? 'income' : 'expense';
}

function defaultCondition(operation: Operation): ConditionDraft {
  return {
    field: 'normalizedLabel',
    matcher: 'contains',
    value: operation.label.trim(),
    value2: '',
    negate: false,
  };
}

type Props = {
  opened: boolean;
  onClose: () => void;
  operation: Operation | null;
};

export function CreateMatchingRuleModal({ opened, onClose, operation }: Props) {
  const { data: thirdParties = [] } = useThirdPartiesAll();
  const { data: categories = [] } = useCategoriesAll();
  const { data: enveloppes = [] } = useEnveloppesAll();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [thirdPartyId, setThirdPartyId] = useState<string | null>(null);
  const { data: selectedThirdParty, isFetching: loadingSelectedThirdParty } = useThirdParty(
    mode === 'existing' ? thirdPartyId ?? '' : '',
  );
  const updateMutation = useUpdateThirdParty();
  const createMutation = useCreateThirdParty();

  const [newThirdPartyName, setNewThirdPartyName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [newBudgetId, setNewBudgetId] = useState<string | null>(null);

  const [ruleLabel, setRuleLabel] = useState('');
  const [operator, setOperator] = useState<'AND' | 'OR'>('AND');
  const [stopOnMatch, setStopOnMatch] = useState(false);
  const [restrictToAccount, setRestrictToAccount] = useState(false);
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !operation) return;
    setMode('existing');
    setThirdPartyId(operation.thirdPartyId ?? null);
    setNewThirdPartyName('');
    setNewCategoryId(null);
    setNewBudgetId(null);
    setRuleLabel(operation.label.trim());
    setOperator('AND');
    setStopOnMatch(false);
    setRestrictToAccount(false);
    setConditions([defaultCondition(operation)]);
    setError(null);
  }, [opened, operation]);

  const thirdPartyOptions = thirdParties.map(tp => ({ value: tp.id, label: tp.name }));
  const categoryOptions = categories.map(category => ({ value: category.id, label: category.label }));
  const budgetOptions = enveloppes.map(budget => ({ value: budget.id, label: budget.label }));

  const updateCondition = (index: number, patch: Partial<ConditionDraft>) => {
    setConditions(current => current.map((condition, i) => (i === index ? { ...condition, ...patch } : condition)));
  };

  const addCondition = () => {
    setConditions(current => [...current, { field: 'normalizedLabel', matcher: 'contains', value: '', value2: '', negate: false }]);
  };

  const addAmountCondition = () => {
    if (!operation) return;
    setConditions(current => [
      ...current,
      { field: 'amount', matcher: 'equals', value: String(operationAmount(operation)), value2: '', negate: false },
      { field: 'direction', matcher: 'equals', value: operationDirection(operation), value2: '', negate: false },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(current => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!operation) return;
    if (!ruleLabel.trim()) {
      setError('Indique un libellé pour la règle.');
      return;
    }
    if (mode === 'existing' && !thirdPartyId) {
      setError('Sélectionne un tiers.');
      return;
    }
    if (mode === 'new' && !newThirdPartyName.trim()) {
      setError('Indique le nom du nouveau tiers.');
      return;
    }
    if (mode === 'existing' && (!selectedThirdParty || selectedThirdParty.id !== thirdPartyId)) {
      setError('Chargement des règles du tiers en cours, réessaie dans un instant.');
      return;
    }
    const effectiveConditions = [
      ...conditions,
      ...(restrictToAccount ? [{ field: 'accountId', matcher: 'equals', value: operation.accountId, value2: '', negate: false }] : []),
    ];
    if (effectiveConditions.length === 0 || effectiveConditions.some(condition => !condition.value.trim())) {
      setError('Chaque condition doit avoir une valeur.');
      return;
    }
    setError(null);

    const newRule = {
      label: ruleLabel.trim(),
      description: `Créée depuis l'opération "${operation.label}" du ${new Date(operation.operationDate).toLocaleDateString('fr-FR')}.`,
      active: true,
      operator,
      stopOnMatch,
      conditions: effectiveConditions.map((condition, index) => ({
        field: condition.field,
        matcher: condition.matcher,
        value: condition.value.trim(),
        value2: condition.value2.trim() || null,
        negate: condition.negate,
        position: index,
      })),
    };

    try {
      if (mode === 'new') {
        const created = await createMutation.mutateAsync({
          name: newThirdPartyName.trim(),
          budgetBearer: false,
          ventilated: false,
          active: true,
          categoryId: newCategoryId,
          budgetId: newBudgetId,
          matchingRules: [newRule],
        });
        notifications.show({ message: `Tiers "${created.name}" créé avec la règle "${newRule.label}".`, color: 'green' });
      } else {
        const existingRules = selectedThirdParty!.matchingRules.map(rule => ({
          label: rule.label,
          description: rule.description,
          active: rule.active,
          operator: rule.operator,
          stopOnMatch: rule.stopOnMatch,
          conditions: rule.conditions.map((condition, index) => ({
            field: condition.field,
            matcher: condition.matcher,
            value: condition.value,
            value2: condition.value2,
            negate: condition.negate,
            position: index,
          })),
        }));
        await updateMutation.mutateAsync({
          id: thirdPartyId!,
          matchingRules: [...existingRules, newRule],
        });
        notifications.show({ message: `Règle "${newRule.label}" ajoutée au tiers.`, color: 'green' });
      }
      onClose();
    } catch {
      setError("Impossible de créer la règle.");
    }
  };

  const isSubmitting = updateMutation.isPending || createMutation.isPending;

  return (
    <Modal opened={opened} onClose={onClose} title="Créer une règle d'affectation à partir de cette opération" size="lg" centered>
      {!operation ? null : (
        <Stack gap={14}>
          <Text size="sm" c="dimmed">
            {operation.label} — {new Date(operation.operationDate).toLocaleDateString('fr-FR')} — {operationAmount(operation).toFixed(2)} € ({operationDirection(operation) === 'income' ? 'recette' : 'dépense'})
          </Text>

          <SegmentedControl
            value={mode}
            onChange={value => setMode(value as 'existing' | 'new')}
            data={[
              { value: 'existing', label: 'Tiers existant' },
              { value: 'new', label: 'Nouveau tiers' },
            ]}
          />

          {mode === 'existing' ? (
            <Select
              label="Tiers cible"
              placeholder="Sélectionner un tiers"
              data={thirdPartyOptions}
              value={thirdPartyId}
              onChange={setThirdPartyId}
              searchable
              required
            />
          ) : (
            <Group grow align="flex-end">
              <TextInput
                label="Nom du nouveau tiers"
                value={newThirdPartyName}
                onChange={event => setNewThirdPartyName(event.currentTarget.value)}
                required
              />
              <Select
                label="Catégorie"
                placeholder="Aucune"
                data={categoryOptions}
                value={newCategoryId}
                onChange={setNewCategoryId}
                searchable
                clearable
              />
              <Select
                label="Enveloppe"
                placeholder="Aucune"
                data={budgetOptions}
                value={newBudgetId}
                onChange={setNewBudgetId}
                searchable
                clearable
              />
            </Group>
          )}

          <TextInput
            label="Libellé de la règle"
            value={ruleLabel}
            onChange={event => setRuleLabel(event.currentTarget.value)}
            required
          />

          <Group grow>
            <Select
              label="Opérateur"
              data={[
                { value: 'AND', label: 'ET' },
                { value: 'OR', label: 'OU' },
              ]}
              value={operator}
              onChange={value => setOperator((value as 'AND' | 'OR') ?? 'AND')}
            />
            <Checkbox
              mt={22}
              label="Stopper sur match"
              checked={stopOnMatch}
              onChange={event => setStopOnMatch(event.currentTarget.checked)}
            />
          </Group>

          <Box style={{ borderTop: '1px solid #e9eef5', paddingTop: 10 }}>
            <Group justify="space-between" align="center" mb={8}>
              <Text fw={600} size="sm">Conditions</Text>
              <Group gap={8}>
                <Button type="button" variant="light" size="xs" onClick={addAmountCondition}>
                  Ajouter le montant et le sens
                </Button>
                <Button type="button" variant="light" size="xs" onClick={addCondition}>
                  Ajouter une condition
                </Button>
              </Group>
            </Group>

            <Stack gap={8}>
              {conditions.map((condition, index) => {
                const showSecondValue = condition.matcher === 'between';
                const isDirectionField = condition.field === 'direction';
                return (
                  <Box key={index} style={{ border: '1px solid #edf2f7', borderRadius: 8, padding: 10, background: '#fff' }}>
                    <Stack gap={8}>
                      <Group grow align="flex-end">
                        <Select
                          label="Champ"
                          data={MATCHING_FIELD_OPTIONS}
                          value={condition.field}
                          onChange={value => updateCondition(index, { field: value ?? 'normalizedLabel' })}
                        />
                        <Select
                          label="Test"
                          data={MATCHING_MATCHER_OPTIONS}
                          value={condition.matcher}
                          onChange={value => updateCondition(index, { matcher: value ?? 'contains' })}
                        />
                        {isDirectionField ? (
                          <Select
                            label="Valeur 1"
                            data={DIRECTION_OPTIONS}
                            value={condition.value || null}
                            onChange={value => updateCondition(index, { value: value ?? '' })}
                          />
                        ) : (
                          <TextInput
                            label="Valeur 1"
                            value={condition.value}
                            onChange={event => updateCondition(index, { value: event.currentTarget.value })}
                          />
                        )}
                        {showSecondValue && (
                          <TextInput
                            label="Valeur 2"
                            value={condition.value2}
                            onChange={event => updateCondition(index, { value2: event.currentTarget.value })}
                          />
                        )}
                      </Group>
                      <Group justify="space-between">
                        <Checkbox
                          label="Négation"
                          checked={condition.negate}
                          onChange={event => updateCondition(index, { negate: event.currentTarget.checked })}
                        />
                        {conditions.length > 1 && (
                          <Button type="button" color="red" variant="subtle" size="xs" onClick={() => removeCondition(index)}>
                            Supprimer la condition
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Checkbox
            label={`Restreindre au compte de l'opération`}
            checked={restrictToAccount}
            onChange={event => setRestrictToAccount(event.currentTarget.checked)}
          />

          {error && <Text size="sm" c="red">{error}</Text>}

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={(mode === 'existing' && (!thirdPartyId || loadingSelectedThirdParty)) || (mode === 'new' && !newThirdPartyName.trim())}
            >
              Créer la règle
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
