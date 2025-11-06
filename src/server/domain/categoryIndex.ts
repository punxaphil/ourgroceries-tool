import { CategoryMeta } from '../types.js';
import { coerceArray, coerceRecord, coerceString } from '../utils/coerce.js';
import { compareSortKeyThenName } from '../utils/sorting.js';

const CONTAINER_KEYS = ['list', 'categoryList'];

export interface CategoryIndexResult {
  categories: CategoryMeta[];
  lookup: Map<string, string>;
  categoryListId: string | null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return coerceRecord<unknown>(value) ?? null;
}

function pickContainer(payload: unknown): Record<string, unknown> | null {
  const record = toRecord(payload);
  if (!record) return null;
  for (const key of CONTAINER_KEYS) {
    const candidate = toRecord(record[key]);
    if (candidate) return candidate;
  }
  return null;
}

function readItems(container: Record<string, unknown> | null): unknown[] {
  if (!container) return [];
  return coerceArray<unknown>(container.items) ?? [];
}

function readCategoryListId(container: Record<string, unknown> | null): string | null {
  if (!container) return null;
  return coerceString(container.id) ?? null;
}

function createCategory(entry: unknown): CategoryMeta | null {
  const record = toRecord(entry);
  if (!record) return null;
  const id = coerceString(record.id);
  const name = coerceString(record.value) ?? coerceString(record.name);
  if (!id || !name) return null;
  const meta: CategoryMeta = { id, name };
  const sortOrder = coerceString(record.sortOrder);
  if (sortOrder) meta.sortOrder = sortOrder;
  return meta;
}

function collectCategories(entries: unknown[]) {
  const list: CategoryMeta[] = [];
  const lookup = new Map<string, string>();
  entries.forEach((entry) => {
    const meta = createCategory(entry);
    if (!meta) return;
    list.push(meta);
    lookup.set(meta.id, meta.name);
  });
  return { list, lookup };
}

function sortCategories(categories: CategoryMeta[]): CategoryMeta[] {
  return [...categories].sort((a, b) =>
    compareSortKeyThenName(a.sortOrder ?? null, a.name, b.sortOrder ?? null, b.name)
  );
}

export function buildCategoryIndex(payload: unknown): CategoryIndexResult {
  const container = pickContainer(payload);
  const { list, lookup } = collectCategories(readItems(container));
  return {
    categories: sortCategories(list),
    lookup,
    categoryListId: readCategoryListId(container),
  };
}
