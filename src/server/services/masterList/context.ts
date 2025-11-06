import { FormattedMasterList } from '../../types.js';
import { createHttpError } from '../../utils/httpError.js';
import { getCategoryIndex, getListsPayload } from '../listAggregator.js';

const ITEM_NOT_FOUND_ERROR = 'Item not found.';
const CATEGORY_LIST_ERROR = 'Category list identifier not available.';

export interface MasterItemContext {
  listId: string;
  categoryId: string | null;
}

export async function fetchMasterList(): Promise<FormattedMasterList> {
  const { masterList } = await getListsPayload();
  return masterList;
}

function locateItemContext(list: FormattedMasterList, itemId: string): MasterItemContext | null {
  for (const section of list.sections) {
    const match = section.items.find((item) => item.id === itemId);
    if (match) return { listId: list.id, categoryId: match.categoryId };
  }
  return null;
}

export async function requireMasterItemContext(itemId: string): Promise<MasterItemContext> {
  const context = locateItemContext(await fetchMasterList(), itemId);
  if (context) return context;
  throw createHttpError(404, ITEM_NOT_FOUND_ERROR);
}

export async function requireCategoryListId(): Promise<string> {
  const { categoryListId } = await getCategoryIndex();
  if (categoryListId) return categoryListId;
  throw createHttpError(500, CATEGORY_LIST_ERROR);
}
