'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Portal,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { CRUD } from '@/lib/crud-tokens';
import { PositioningSelect } from '@/components/common/PositioningSelect';

const GRAY_BORDER = CRUD.couleurs.grilleTableau;

export type SplitModalRow = {
  id: string;
  label: string;
  expense: string;
  income: string;
  budgetId: string | null;
  categoryId: string | null;
  enveloppeLabel?: string | null;
  categorieLabel?: string | null;
};

type SelectOption = { value: string; label: string };

type Props = {
  opened: boolean;
  title: string;
  editable: boolean;
  rows: SplitModalRow[];
  splitError?: string | null;
  remainingBalance?: number | null;
  showSaveHint?: boolean;
  splitExpense: number;
  splitIncome: number;
  enveloppeOptions?: SelectOption[];
  categoryOptions?: SelectOption[];
  onClose: () => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  onChangeRow?: (index: number, field: 'label' | 'expense' | 'income' | 'budgetId' | 'categoryId', value: string | null) => void;
  onRowEnter?: (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function OperationSplitModal({
  opened,
  title,
  editable,
  rows,
  splitError,
  remainingBalance,
  showSaveHint = false,
  splitExpense,
  splitIncome,
  enveloppeOptions = [],
  categoryOptions = [],
  onClose,
  onAddRow,
  onRemoveRow,
  onChangeRow,
  onRowEnter,
}: Props) {
  const [position, setPosition] = useState({ x: 80, y: 72 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const splitLabelRefs = useRef<Array<HTMLInputElement | null>>([]);

  const splitGridInputStyle = {
    background: '#ffffff',
    height: 24,
    minHeight: 24,
    fontSize: 10,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 4,
    paddingRight: 4,
    border: 'none',
    borderRadius: 0,
  } as const;

  const splitGridCellStyle = {
    padding: 0,
    borderRight: `1px solid ${CRUD.couleurs.grilleTableau}`,
    borderBottom: `1px solid ${CRUD.couleurs.grilleTableau}`,
    background: '#ffffff',
  } as const;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging.current) return;

      const nextX = event.clientX - dragOffset.current.x;
      const nextY = event.clientY - dragOffset.current.y;

      setPosition({
        x: Math.max(12, Math.min(window.innerWidth - 640, nextX)),
        y: Math.max(12, Math.min(window.innerHeight - 120, nextY)),
      });
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!opened) {
    return null;
  }

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragging.current = true;
    document.body.style.userSelect = 'none';
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  return (
    <Portal>
      <Box
        onClick={event => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.18)',
          zIndex: 300,
        }}
      />
      <Box
        onMouseDown={event => event.stopPropagation()}
        style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
          width: `min(${CRUD.miseEnPage.largeurMaxListe}px, calc(100vw - 24px))`,
          maxHeight: 'calc(100vh - 24px)',
          background: '#ffffff',
          border: `1px solid ${GRAY_BORDER}`,
          borderRadius: 10,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
          zIndex: 301,
          display: 'flex',
          flexDirection: 'column',
          overscrollBehavior: 'contain',
        }}
      >
        <Group
          justify="space-between"
          align="center"
          onMouseDown={startDrag}
          style={{
            cursor: 'move',
            userSelect: 'none',
            padding: '10px 12px',
            borderBottom: `1px solid ${GRAY_BORDER}`,
            background: '#f6f8fc',
            borderRadius: '10px 10px 0 0',
          }}
        >
          <Text fw={700}>{title}</Text>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onMouseDown={event => event.stopPropagation()}
            onClick={onClose}
            title="Fermer"
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
        <Box style={{ padding: 12, overflow: 'auto', overscrollBehavior: 'contain' }}>
          <Stack gap={12}>
            {splitError && (remainingBalance === null || remainingBalance === undefined) && (
              <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{splitError}</Text>
              </Alert>
            )}

            {remainingBalance !== null && remainingBalance !== undefined && Math.abs(remainingBalance) >= 0.005 && (
              <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">Solde à ventiler : {remainingBalance.toFixed(2)}</Text>
              </Alert>
            )}

            {editable && showSaveHint && (
              <Alert color="blue" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">Après fermeture, cliquer sur Enregistrer pour valider la mise à jour de l'écriture.</Text>
              </Alert>
            )}

            <Box
              style={{
                border: `1px solid ${GRAY_BORDER}`,
                borderRadius: 8,
                overflow: 'auto',
                background: '#ffffff',
                maxHeight: 'min(420px, calc(100vh - 220px))',
                overscrollBehavior: 'contain',
              }}
            >
              <Table withTableBorder={false} withColumnBorders={false} style={{ tableLayout: 'fixed' }}>
                <Table.Thead>
                  <Table.Tr style={{ background: CRUD.couleurs.fondEnteteTableau }}>
                    <Table.Th style={{ padding: '4px 6px', fontSize: 11, width: '34%' }}>Libellé</Table.Th>
                    <Table.Th style={{ padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 100 }}>Dépense</Table.Th>
                    <Table.Th style={{ padding: '4px 6px', fontSize: 11, textAlign: 'right', width: 100 }}>Recette</Table.Th>
                    <Table.Th style={{ padding: '4px 6px', fontSize: 11, width: '24%' }}>Enveloppe</Table.Th>
                    <Table.Th style={{ padding: '4px 6px', fontSize: 11, width: '24%' }}>Catégorie</Table.Th>
                    {editable && <Table.Th style={{ padding: '4px 6px', fontSize: 11, width: 40 }} />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row, index) => (
                    <Table.Tr key={row.id}>
                      <Table.Td style={splitGridCellStyle}>
                        <TextInput
                          value={row.label}
                          ref={node => {
                            splitLabelRefs.current[index] = node;
                          }}
                          onChange={event => onChangeRow?.(index, 'label', event.currentTarget.value)}
                          onKeyDown={onRowEnter?.(index)}
                          placeholder="Libellé"
                          radius={0}
                          readOnly={!editable}
                          styles={{ input: splitGridInputStyle }}
                        />
                      </Table.Td>
                      <Table.Td style={splitGridCellStyle}>
                        <TextInput
                          value={row.expense}
                          inputMode="decimal"
                          onChange={event => onChangeRow?.(index, 'expense', event.currentTarget.value)}
                          onKeyDown={onRowEnter?.(index)}
                          placeholder="0,00"
                          radius={0}
                          readOnly={!editable}
                          styles={{ input: { ...splitGridInputStyle, textAlign: 'right' } }}
                        />
                      </Table.Td>
                      <Table.Td style={splitGridCellStyle}>
                        <TextInput
                          value={row.income}
                          inputMode="decimal"
                          onChange={event => onChangeRow?.(index, 'income', event.currentTarget.value)}
                          onKeyDown={onRowEnter?.(index)}
                          placeholder="0,00"
                          radius={0}
                          readOnly={!editable}
                          styles={{ input: { ...splitGridInputStyle, textAlign: 'right' } }}
                        />
                      </Table.Td>
                      <Table.Td style={splitGridCellStyle}>
                        <PositioningSelect
                          data={editable ? enveloppeOptions : row.enveloppeLabel ? [{ value: row.budgetId ?? '__value__', label: row.enveloppeLabel }] : []}
                          value={editable ? row.budgetId : (row.enveloppeLabel ? row.budgetId ?? '__value__' : null)}
                          onChange={value => onChangeRow?.(index, 'budgetId', value)}
                          onKeyDown={event => onRowEnter?.(index)(event as React.KeyboardEvent<HTMLInputElement>)}
                          dropdownZIndex={500}
                          clearable={editable}
                          radius={0}
                          readOnly={!editable}
                          styles={{ input: splitGridInputStyle }}
                        />
                      </Table.Td>
                      <Table.Td style={{ ...splitGridCellStyle, borderRight: editable ? `1px solid ${CRUD.couleurs.grilleTableau}` : 'none' }}>
                        <PositioningSelect
                          data={editable ? categoryOptions : row.categorieLabel ? [{ value: row.categoryId ?? '__value__', label: row.categorieLabel }] : []}
                          value={editable ? row.categoryId : (row.categorieLabel ? row.categoryId ?? '__value__' : null)}
                          onChange={value => onChangeRow?.(index, 'categoryId', value)}
                          onKeyDown={event => onRowEnter?.(index)(event as React.KeyboardEvent<HTMLInputElement>)}
                          dropdownZIndex={500}
                          clearable={editable}
                          radius={0}
                          readOnly={!editable}
                          styles={{ input: splitGridInputStyle }}
                        />
                      </Table.Td>
                      {editable && (
                        <Table.Td style={{ ...splitGridCellStyle, borderRight: 'none' }}>
                          <ActionIcon
                            size="sm"
                            color="red"
                            variant="subtle"
                            radius={0}
                            onClick={() => onRemoveRow?.(index)}
                            title="Supprimer la ligne"
                            style={{ width: '100%', height: 24 }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>

            <Group justify="space-between">
              {editable ? (
                <Button
                  variant="default"
                  leftSection={<IconPlus size={12} />}
                  size="xs"
                  onClick={onAddRow}
                >
                  Ajouter une ligne
                </Button>
              ) : (
                <Box />
              )}
              <Group gap={20}>
                <Text size="sm">Dépense: <strong>{splitExpense.toFixed(2)}</strong></Text>
                <Text size="sm">Recette: <strong>{splitIncome.toFixed(2)}</strong></Text>
                <Text size="sm">Solde: <strong>{(splitIncome - splitExpense).toFixed(2)}</strong></Text>
                {remainingBalance !== null && remainingBalance !== undefined && Math.abs(remainingBalance) >= 0.005 && (
                  <Text size="sm" c="orange">
                    Reste à ventiler: <strong>{remainingBalance.toFixed(2)}</strong>
                  </Text>
                )}
              </Group>
            </Group>
          </Stack>
        </Box>
      </Box>
    </Portal>
  );
}
