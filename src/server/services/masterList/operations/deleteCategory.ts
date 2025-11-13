import type { DeleteMasterCategoryInput, FormattedMasterList } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { requireCategoryListId } from '../context.js';
import { mutateMasterList } from './shared.js';

async function applyDeleteCategory(sessionId: string, client: OurGroceries, input: DeleteMasterCategoryInput) {
  const listId = await requireCategoryListId(sessionId);
  await client.removeItemFromList(listId, input.categoryId);
}

export function deleteMasterCategory(
  sessionId: string,
  input: DeleteMasterCategoryInput
): Promise<FormattedMasterList> {
  return mutateMasterList(sessionId, (client) => applyDeleteCategory(sessionId, client, input));
}
