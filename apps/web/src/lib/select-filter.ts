import type { ComboboxParsedItem, ComboboxParsedItemGroup, OptionsFilter } from '@mantine/core';

function isOptionsGroup(item: ComboboxParsedItem): item is ComboboxParsedItemGroup {
  return 'group' in item;
}

/**
 * Filtre les options d'un Select Mantine avec l'opérateur "commence par"
 * (insensible à la casse), au lieu du filtre par défaut de Mantine qui
 * utilise "contient".
 */
export const startsWithOptionsFilter: OptionsFilter = ({ options, search }) => {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return options;

  const filterItems = (items: ComboboxParsedItem[]): ComboboxParsedItem[] => {
    const result: ComboboxParsedItem[] = [];

    for (const item of items) {
      if (isOptionsGroup(item)) {
        result.push({ group: item.group, items: filterItems(item.items) as ComboboxParsedItemGroup['items'] });
      } else if (item.label.toLowerCase().startsWith(normalizedSearch)) {
        result.push(item);
      }
    }

    return result;
  };

  return filterItems(options);
};
