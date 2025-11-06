import type { FormattedMasterList, RenameMasterCategoryInput } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { requireCategoryListId } from '../context.js';
import { changeItem, mutateMasterList } from './shared.js';

async function applyRenameCategory(client: OurGroceries, input: RenameMasterCategoryInput) {
  const listId = await requireCategoryListId();
  await changeItem(client)(listId, input.categoryId, null, input.newName);
}

export function renameMasterCategory(input: RenameMasterCategoryInput): Promise<FormattedMasterList> {
  return mutateMasterList((client) => applyRenameCategory(client, input));
}
