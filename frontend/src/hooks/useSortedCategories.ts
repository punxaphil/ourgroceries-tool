import { useMemo } from 'react';
import { MasterListSection } from '../types';
import { CategorySummary, normalizeCategoryId } from '../utils/appUtils';

type PendingMoves = Record<string, { targetCategoryId: string }>;

export type ReorderableSection = MasterListSection & { id: string; items: MasterListSection['items'] };

export type UseSortedCategoriesArgs = {
  categories: ReadonlyArray<CategorySummary>;
  filterCategories: ReadonlySet<string>;
  pendingMoves: PendingMoves;
  masterSections: ReadonlyArray<MasterListSection>;
};

export type UseSortedCategoriesResult = {
  sortedCategories: CategorySummary[];
  reorderableSections: ReorderableSection[];
};

const normalizeSection = (section: MasterListSection): ReorderableSection => ({
  ...section,
  id: normalizeCategoryId(section.id),
  items: section.items ?? [],
});

const buildLookup = (sections: ReorderableSection[]) => {
  const lookup = new Map<string, ReorderableSection>();
  sections.forEach((section) => lookup.set(section.id, section));
  return lookup;
};

const computeTaggedCategoryIds = (pendingMoves: PendingMoves) => {
  const ids = Object.values(pendingMoves).map((move) => move.targetCategoryId);
  return new Set(ids);
};

const categorize = (
  category: CategorySummary,
  filterCategories: ReadonlySet<string>,
  taggedSet: ReadonlySet<string>
) => {
  if (filterCategories.has(category.id)) return 'filtered';
  if (taggedSet.has(category.id)) return 'tagged';
  return 'rest';
};

const sortCategories = (
  categories: ReadonlyArray<CategorySummary>,
  filterCategories: ReadonlySet<string>,
  pendingMoves: PendingMoves
) => {
  const buckets = { filtered: [] as CategorySummary[], tagged: [] as CategorySummary[], rest: [] as CategorySummary[] };
  const taggedSet = computeTaggedCategoryIds(pendingMoves);
  categories.forEach((category) => buckets[categorize(category, filterCategories, taggedSet)].push(category));
  return [...buckets.filtered, ...buckets.tagged, ...buckets.rest];
};

const buildReorderableSections = (
  sortedCategories: ReadonlyArray<CategorySummary>,
  normalizedSections: ReorderableSection[]
) => {
  const lookup = buildLookup(normalizedSections);
  return sortedCategories
    .map((category) => lookup.get(category.id))
    .filter((section): section is ReorderableSection => Boolean(section));
};

export const useSortedCategories = ({
  categories,
  filterCategories,
  pendingMoves,
  masterSections,
}: UseSortedCategoriesArgs): UseSortedCategoriesResult => {
  const normalizedSections = useMemo(
    () => masterSections.map((section) => normalizeSection(section)),
    [masterSections]
  );
  const sortedCategories = useMemo(
    () => sortCategories(categories, filterCategories, pendingMoves),
    [categories, filterCategories, pendingMoves]
  );
  const reorderableSections = useMemo(
    () => buildReorderableSections(sortedCategories, normalizedSections),
    [sortedCategories, normalizedSections]
  );
  return { sortedCategories, reorderableSections };
};
