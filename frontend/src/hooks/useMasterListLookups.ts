import { useMemo } from 'react';
import { MasterList, MasterListItem, MasterListSection } from '../types';
import {
  buildItemLookup,
  createCategoryColorMap,
  mapCategoriesWithFallback,
  normalizeCategoryId,
} from '../utils/appUtils';

export type MasterListLookups = {
  itemLookup: ReturnType<typeof buildItemLookup>;
  categories: ReturnType<typeof mapCategoriesWithFallback>;
  categoryNameLookup: Map<string, string>;
  categoryColorMap: Record<string, string>;
  sections: NormalizedSection[];
};

export type NormalizedSection = {
  id: string;
  name: string;
  items: NormalizedItem[];
};

export type NormalizedItem = {
  id: string;
  name: string;
  categoryId: string | null;
};

const normalizeItem = (item: MasterListItem): NormalizedItem => ({
  id: item.id,
  name: item.name,
  categoryId: item.categoryId ?? null,
});

const normalizeSections = (sections: MasterListSection[]): NormalizedSection[] =>
  sections.map((section) => ({
    id: normalizeCategoryId(section.id),
    name: section.name ?? '',
    items: (section.items ?? []).map(normalizeItem),
  }));

const createCategoryNameLookup = (categories: ReturnType<typeof mapCategoriesWithFallback>): Map<string, string> => {
  const lookup = new Map<string, string>();
  categories.forEach((category) => lookup.set(category.id, category.name));
  return lookup;
};

export const useMasterListLookups = (masterList: MasterList | null | undefined): MasterListLookups =>
  useMemo(() => {
    const resolvedMasterList = masterList ?? null;
    const sections = resolvedMasterList?.sections ?? [];
    const categories = mapCategoriesWithFallback(resolvedMasterList);
    const categoryNameLookup = createCategoryNameLookup(categories);
    return {
      itemLookup: buildItemLookup(resolvedMasterList),
      categories,
      categoryNameLookup,
      categoryColorMap: createCategoryColorMap(categories),
      sections: normalizeSections(sections),
    };
  }, [masterList]);
