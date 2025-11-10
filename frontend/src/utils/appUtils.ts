import { MasterList, MasterListItem } from '../types';

export const CATEGORY_COLORS = [
  '#fde68a',
  '#bbf7d0',
  '#bfdbfe',
  '#fbcfe8',
  '#ede9fe',
  '#fee2e2',
  '#dcfce7',
  '#e0f2fe',
] as const;

export const HASH_MASTER = '#/master';
export const HASH_LISTS = '#/lists';
export const PENDING_OPERATIONS_KEY = 'master-pending-operations';
export const FILTER_STATE_KEY = 'master-filter-state';
export const PENDING_FILTER_KEY = 'master-pending-filter';
export const UNCATEGORIZED_ID = 'uncategorized';
export const FALLBACK_CATEGORY_NAME = 'Uncategorized';

export type AppView = 'master' | 'lists';

export interface CategorySummary {
  id: string;
  name: string;
}

const categoryNameOrFallback = (name: string | null | undefined): string => {
  if (!name) return FALLBACK_CATEGORY_NAME;
  const trimmed = name.trim();
  return trimmed.length === 0 ? FALLBACK_CATEGORY_NAME : trimmed;
};

export const normalizeCategoryId = (categoryId: string | null | undefined): string => {
  if (!categoryId) return UNCATEGORIZED_ID;
  return categoryId;
};

export const denormalizeCategoryId = (categoryId: string | null | undefined): string | null => {
  if (!categoryId || categoryId === UNCATEGORIZED_ID) return null;
  return categoryId;
};

export const buildItemLookup = (masterList: MasterList | null): Map<string, MasterListItem> => {
  const lookup = new Map<string, MasterListItem>();
  if (!masterList) return lookup;
  for (const section of masterList.sections ?? []) {
    for (const item of section.items ?? []) {
      if (item?.id) lookup.set(item.id, item);
    }
  }
  return lookup;
};

export const readStoredJson = <T>(key: string, errorMessage: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
};

export const mapCategoriesWithFallback = (masterList: MasterList | null): CategorySummary[] => {
  if (!masterList) return [];
  return (masterList.sections ?? []).map((section) => ({
    id: normalizeCategoryId(section.id ?? null),
    name: categoryNameOrFallback(section.name),
  }));
};

export const createCategoryColorMap = (categories: CategorySummary[]): Record<string, string> => {
  return categories.reduce<Record<string, string>>((acc, category, index) => {
    acc[category.id] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    return acc;
  }, {});
};

export const resolveViewFromHash = (hash: string): AppView => (hash === HASH_MASTER ? 'master' : 'lists');
