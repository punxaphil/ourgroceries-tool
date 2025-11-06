import type { DeleteMasterCategoryInput, FormattedMasterList } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { requireCategoryListId } from '../context.js';
import { mutateMasterList } from './shared.js';

async function applyDeleteCategory(client: OurGroceries, input: DeleteMasterCategoryInput) {
  const listId = await requireCategoryListId();
  await client.removeItemFromList(listId, input.categoryId);
}

export function deleteMasterCategory(input: DeleteMasterCategoryInput): Promise<FormattedMasterList> {
  return mutateMasterList((client) => applyDeleteCategory(client, input));
}
