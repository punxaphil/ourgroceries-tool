import type { FormattedMasterList, RenameMasterCategoryInput } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { requireCategoryListId } from '../context.js';
import { changeItem, mutateMasterList } from './shared.js';

async function applyRenameCategory(
  sessionId: string,
  client: OurGroceries,
  input: RenameMasterCategoryInput
) {
  const listId = await requireCategoryListId(sessionId);
  await changeItem(client)(listId, input.categoryId, null, input.newName);
}

export function renameMasterCategory(
  sessionId: string,
  input: RenameMasterCategoryInput
): Promise<FormattedMasterList> {
  return mutateMasterList(sessionId, (client) => applyRenameCategory(sessionId, client, input));
}
