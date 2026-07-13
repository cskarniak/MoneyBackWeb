'use client';

import { useRef } from 'react';
import type { MantineSize } from '@mantine/core';
import { Combobox, Input, InputBase, useCombobox } from '@mantine/core';

export type PositioningSelectOption = { value: string; label: string };

// Valeur interne représentant la ligne vide en tête de liste qui permet de
// vider le champ, à la place d'une croix qui se superposait avec le chevron.
const EMPTY_OPTION_VALUE = '__positioning-select-empty__';

type Props<T extends PositioningSelectOption> = {
  data: T[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  styles?: { input?: React.CSSProperties; option?: React.CSSProperties };
  maxDropdownHeight?: number;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  size?: MantineSize;
  style?: React.CSSProperties;
  w?: React.CSSProperties['width'];
  radius?: MantineSize | number;
  readOnly?: boolean;
  dropdownZIndex?: number;
  /** Largeur du menu déroulant (par défaut, largeur du champ). Utile quand le champ est étroit (ex: code court) mais que les libellés sont longs. */
  dropdownWidth?: number | string;
  /** Appelé après la gestion interne du clavier (ex: navigation vers la ligne suivante sur Entrée dans une grille). */
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  /** Personnalise le rendu d'une option (ex: code court + libellé complet). Par défaut, affiche `option.label`. */
  renderOption?: (option: T) => React.ReactNode;
  /** Texte(s) utilisé(s) pour le positionnement clavier. Par défaut, `option.label`. */
  getSearchText?: (option: T) => string | string[];
};

/**
 * Select "à la <select> natif" : la liste complète reste toujours affichée,
 * la saisie clavier ne filtre pas les options mais se contente de positionner
 * (surligner + faire défiler) le premier item dont le libellé commence par le
 * texte tapé, comme le ferait un <select> HTML natif. Le texte tapé s'accumule
 * tant que la liste reste ouverte ; Entrée valide l'item positionné.
 */
export function PositioningSelect<T extends PositioningSelectOption = PositioningSelectOption>({
  data,
  value,
  onChange,
  placeholder,
  clearable,
  disabled,
  styles,
  maxDropdownHeight = 220,
  label,
  description,
  error,
  required,
  size,
  style,
  w,
  radius,
  readOnly,
  dropdownZIndex,
  dropdownWidth,
  onKeyDown,
  renderOption,
  getSearchText,
}: Props<T>) {
  const typeaheadBuffer = useRef('');

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      typeaheadBuffer.current = '';
    },
  });

  const emptyOption = { value: EMPTY_OPTION_VALUE, label: ' ' } as T;
  const displayedData: T[] = clearable ? [emptyOption, ...data] : data;

  const selectedOption = data.find(item => item.value === value) ?? null;

  const matchesTypedText = (item: T) => {
    const searchTexts = getSearchText ? getSearchText(item) : item.label;
    const values = Array.isArray(searchTexts) ? searchTexts : [searchTexts];
    return values.some(text => text.toLowerCase().startsWith(typeaheadBuffer.current));
  };

  const jumpToTypedText = (char: string) => {
    typeaheadBuffer.current += char.toLowerCase();

    const matchIndex = displayedData.findIndex(matchesTypedText);
    if (matchIndex >= 0) {
      combobox.openDropdown();
      combobox.selectOption(matchIndex);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (readOnly) {
      onKeyDown?.(event);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (!combobox.dropdownOpened) {
        combobox.openDropdown();
      } else {
        const index = combobox.getSelectedOptionIndex();
        const option = index >= 0 ? displayedData[index] : null;
        if (option) {
          onChange(option.value === EMPTY_OPTION_VALUE ? null : option.value);
        }
        combobox.closeDropdown();
      }

      onKeyDown?.(event);
      return;
    }

    if (event.key === 'Escape') {
      combobox.closeDropdown();
      onKeyDown?.(event);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (clearable && value) {
        onChange(null);
      }
      onKeyDown?.(event);
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      jumpToTypedText(event.key);
      return;
    }

    onKeyDown?.(event);
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={val => {
        onChange(val === EMPTY_OPTION_VALUE ? null : val);
        combobox.closeDropdown();
      }}
      styles={{ dropdown: { border: '1px solid #000000', zIndex: dropdownZIndex } }}
      width={dropdownWidth}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer={!readOnly}
          disabled={disabled}
          label={label}
          description={description}
          error={error}
          required={required}
          size={size}
          style={style}
          w={w}
          radius={radius}
          onClick={event => {
            if (readOnly) return;
            // Sur Safari, un clic sur un <button> ne donne pas le focus par
            // défaut : on le force pour que la saisie clavier fonctionne.
            event.currentTarget.focus();
            combobox.toggleDropdown();
          }}
          onKeyDown={handleKeyDown}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          styles={{
            input: {
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              ...styles?.input,
            },
          }}
        >
          <span
            title={selectedOption?.label}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0, flex: 1 }}
          >
            {selectedOption ? selectedOption.label : <Input.Placeholder>{placeholder}</Input.Placeholder>}
          </span>
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options className="positioning-select-options" mah={maxDropdownHeight} style={{ overflowY: 'auto' }}>
          {data.length === 0 ? (
            <Combobox.Empty>Aucun résultat</Combobox.Empty>
          ) : (
            displayedData.map(item => (
              <Combobox.Option
                value={item.value}
                key={item.value}
                active={item.value === value}
                style={{
                  // Les items de la liste reprennent la même police/taille/couleur
                  // que le champ (via styles.input), pour rester cohérents visuellement.
                  fontSize: styles?.input?.fontSize,
                  fontFamily: styles?.input?.fontFamily,
                  fontWeight: styles?.input?.fontWeight,
                  color: styles?.input?.color,
                  paddingTop: 0,
                  paddingBottom: 0,
                  paddingLeft: 2,
                  ...styles?.option,
                }}
              >
                {item.value === EMPTY_OPTION_VALUE ? item.label : (renderOption ? renderOption(item) : item.label)}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
