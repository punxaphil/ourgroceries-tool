import { CategoryMeta, FormattedItem, FormattedMasterList } from '../../types.js';
import { toFormattedItem } from './items.js';
import { assignItemToSection, createSectionState, finalizeSections, SectionState } from './sections.js';
import { readMasterListId, readMasterListItems, readMasterListName, requireMasterListRecord } from './record.js';

function collectItems(entries: unknown[], categoryLookup: Map<string, string>, state: SectionState): FormattedItem[] {
  const items: FormattedItem[] = [];
  entries.forEach((entry) => {
    const item = toFormattedItem(entry, categoryLookup);
    if (!item) return;
    items.push(item);
    assignItemToSection(state, item);
  });
  return items;
}

export function formatMasterList(
  payload: unknown,
  categories: CategoryMeta[],
  categoryLookup: Map<string, string>
): FormattedMasterList {
  const record = requireMasterListRecord(payload);
  const state = createSectionState(categories);
  const items = collectItems(readMasterListItems(record), categoryLookup, state);
  return {
    id: readMasterListId(record),
    name: readMasterListName(record),
    itemCount: items.length,
    sections: finalizeSections(state),
  };
}
