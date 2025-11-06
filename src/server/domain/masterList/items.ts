import { FormattedItem } from '../../types.js';
import { coerceString } from '../../utils/coerce.js';
import { EMPTY_CATEGORY_LABEL, MASTER_LIST_UNNAMED_ITEM_LABEL } from './constants.js';
import { MasterListItemRecord, toMasterListItemRecord } from './record.js';

const CROSSED_OFF_KEY = 'crossedOff';

function itemId(record: MasterListItemRecord): string | null {
  const id = coerceString(record.id);
  return id ?? null;
}

function itemName(record: MasterListItemRecord): string {
  return coerceString(record.value) ?? coerceString(record.name) ?? MASTER_LIST_UNNAMED_ITEM_LABEL;
}

function itemCategoryId(record: MasterListItemRecord): string | null {
  return coerceString(record.categoryId) ?? null;
}

function itemCategoryName(categoryId: string | null, categoryLookup: Map<string, string>): string {
  if (!categoryId) return EMPTY_CATEGORY_LABEL;
  return categoryLookup.get(categoryId) ?? EMPTY_CATEGORY_LABEL;
}

function itemNote(record: MasterListItemRecord): string | undefined {
  const note = coerceString(record.note);
  return note && note.length > 0 ? note : undefined;
}

function isCrossedOff(record: MasterListItemRecord): boolean {
  return Boolean(record[CROSSED_OFF_KEY]);
}

function buildFormattedItem(
  id: string,
  record: MasterListItemRecord,
  categoryId: string | null,
  categoryLookup: Map<string, string>
): FormattedItem {
  const item: FormattedItem = {
    id,
    name: itemName(record),
    categoryId,
    categoryName: itemCategoryName(categoryId, categoryLookup),
    crossedOff: isCrossedOff(record),
  };
  const note = itemNote(record);
  if (note) item.note = note;
  return item;
}

export function toFormattedItem(entry: unknown, categoryLookup: Map<string, string>): FormattedItem | null {
  const record = toMasterListItemRecord(entry);
  if (!record) return null;
  const id = itemId(record);
  if (!id) return null;
  const categoryId = itemCategoryId(record);
  return buildFormattedItem(id, record, categoryId, categoryLookup);
}
