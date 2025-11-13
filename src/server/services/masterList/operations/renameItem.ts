import type { OurGroceries } from 'ourgroceries';
import { requireMasterItemContext } from '../context.js';
import { changeItem, mutateMasterList } from './shared.js';
import type { FormattedMasterList, RenameMasterItemInput } from '../../../types.js';

async function applyRename(sessionId: string, client: OurGroceries, input: RenameMasterItemInput) {
  const { listId, categoryId } = await requireMasterItemContext(input.itemId, sessionId);
  await changeItem(client)(listId, input.itemId, categoryId, input.newName);
}

export function renameMasterItem(sessionId: string, input: RenameMasterItemInput): Promise<FormattedMasterList> {
  return mutateMasterList(sessionId, (client) => applyRename(sessionId, client, input));
}
