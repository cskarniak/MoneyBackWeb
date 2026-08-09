'use client';

import { useState } from 'react';
import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';

let modalCounter = 0;

function openBlockingModal(
  title: string,
  render: (helpers: { confirm: () => void; cancel: () => void }) => React.ReactNode,
): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const id = `confirm-modal-${++modalCounter}`;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
      modals.close(id);
    };

    modals.open({
      modalId: id,
      title,
      centered: true,
      onClose: () => settle(false),
      children: render({ confirm: () => settle(true), cancel: () => settle(false) }),
    });
  });
}

function SimpleConfirmBody({
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Stack gap={16}>
      <Text size="sm" style={{ whiteSpace: 'pre-line' }}>{message}</Text>
      <Group justify="flex-end" gap={8}>
        <Button variant="default" onClick={onCancel}>Annuler</Button>
        <Button color={confirmColor} onClick={onConfirm} autoFocus>{confirmLabel}</Button>
      </Group>
    </Stack>
  );
}

function StrongConfirmBody({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const valid = value.trim().toUpperCase() === 'OUI';

  return (
    <Stack gap={16}>
      <Text size="sm" style={{ whiteSpace: 'pre-line' }}>{message}</Text>
      <Text size="sm" c="dimmed">Cet élément est ventilé. Tapez OUI pour confirmer la suppression.</Text>
      <TextInput
        value={value}
        onChange={event => setValue(event.currentTarget.value)}
        placeholder="OUI"
        autoFocus
        onKeyDown={event => {
          if (event.key === 'Enter' && valid) onConfirm();
        }}
      />
      <Group justify="flex-end" gap={8}>
        <Button variant="default" onClick={onCancel}>Annuler</Button>
        <Button color="red" onClick={onConfirm} disabled={!valid}>Supprimer</Button>
      </Group>
    </Stack>
  );
}

/** Remplace window.confirm pour une confirmation générique (non liée à une suppression). */
export function confirmAction(message: string, confirmLabel = 'Confirmer'): Promise<boolean> {
  return openBlockingModal('Confirmation', ({ confirm, cancel }) => (
    <SimpleConfirmBody message={message} confirmLabel={confirmLabel} confirmColor="blue" onConfirm={confirm} onCancel={cancel} />
  ));
}

export function confirmSimpleDelete(message: string): Promise<boolean> {
  return openBlockingModal('Confirmer la suppression', ({ confirm, cancel }) => (
    <SimpleConfirmBody message={message} confirmLabel="Supprimer" confirmColor="red" onConfirm={confirm} onCancel={cancel} />
  ));
}

export function confirmStrongDelete(message: string): Promise<boolean> {
  return openBlockingModal('Confirmer la suppression', ({ confirm, cancel }) => (
    <StrongConfirmBody message={message} onConfirm={confirm} onCancel={cancel} />
  ));
}
