import type { OurGroceries } from 'ourgroceries';
import { requireMasterItemContext } from '../context.js';
import { changeItem, mutateMasterList } from './shared.js';
import type { FormattedMasterList, RenameMasterItemInput } from '../../../types.js';

async function applyRename(client: OurGroceries, input: RenameMasterItemInput) {
  const { listId, categoryId } = await requireMasterItemContext(input.itemId);
  await changeItem(client)(listId, input.itemId, categoryId, input.newName);
}

export function renameMasterItem(input: RenameMasterItemInput): Promise<FormattedMasterList> {
  return mutateMasterList((client) => applyRename(client, input));
}
