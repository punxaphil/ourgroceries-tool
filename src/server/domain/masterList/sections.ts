import { UNCATEGORIZED_SECTION_ID, UNCATEGORIZED_SECTION_NAME, UNCATEGORIZED_SECTION_SORT_KEY } from './constants.js';
import { CategoryMeta, FormattedItem, FormattedSection } from '../../types.js';
import { compareSortKeyThenName } from '../../utils/sorting.js';

export interface SectionState {
  sections: FormattedSection[];
  lookup: Map<string, FormattedSection>;
  fallback: FormattedSection;
}

function sectionFromCategory(category: CategoryMeta): FormattedSection {
  const section: FormattedSection = { id: category.id, name: category.name, items: [] };
  if (category.sortOrder) section.sortOrder = category.sortOrder;
  return section;
}

function buildSectionLookup(sections: FormattedSection[]): Map<string, FormattedSection> {
  const lookup = new Map<string, FormattedSection>();
  sections.forEach((section) => lookup.set(section.id, section));
  return lookup;
}

function createFallbackSection(): FormattedSection {
  return {
    id: UNCATEGORIZED_SECTION_ID,
    name: UNCATEGORIZED_SECTION_NAME,
    items: [],
    sortOrder: UNCATEGORIZED_SECTION_SORT_KEY,
  };
}

export function createSectionState(categories: CategoryMeta[]): SectionState {
  const sections = categories.map(sectionFromCategory);
  return {
    sections,
    lookup: buildSectionLookup(sections),
    fallback: createFallbackSection(),
  };
}

function lookupSection(state: SectionState, categoryId: string | null): FormattedSection {
  if (!categoryId) return state.fallback;
  return state.lookup.get(categoryId) ?? state.fallback;
}

export function assignItemToSection(state: SectionState, item: FormattedItem): void {
  lookupSection(state, item.categoryId).items.push(item);
}

function sortSectionItems(section: FormattedSection): void {
  section.items.sort((a, b) => a.name.localeCompare(b.name));
}

function sortSections(list: FormattedSection[]): FormattedSection[] {
  return [...list].sort((a, b) => compareSortKeyThenName(a.sortOrder ?? null, a.name, b.sortOrder ?? null, b.name));
}

export function finalizeSections(state: SectionState): FormattedSection[] {
  const combined = state.fallback.items.length > 0 ? [...state.sections, state.fallback] : [...state.sections];
  combined.forEach(sortSectionItems);
  return sortSections(combined);
}
