import type { FormattedMasterList, ReorderMasterCategoriesInput } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { requireCategoryListId } from '../context.js';
import { mutateMasterList, postCommand, REORDER_COMMAND, CATEGORY_KEY } from './shared.js';

async function applyReorder(
  sessionId: string,
  client: OurGroceries,
  input: ReorderMasterCategoriesInput
): Promise<void> {
  const listId = await requireCategoryListId(sessionId);
  await postCommand(client)(REORDER_COMMAND, {
    listId,
    itemId: input.itemId,
    nextItemId: input.nextItemId,
    [CATEGORY_KEY]: null,
  });
}

export function reorderMasterCategories(
  sessionId: string,
  input: ReorderMasterCategoriesInput
): Promise<FormattedMasterList> {
  return mutateMasterList(sessionId, (client) => applyReorder(sessionId, client, input));
}
