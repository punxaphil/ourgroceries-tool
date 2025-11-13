import type { DeleteMasterItemsInput, FormattedMasterList } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { mutateMasterList } from './shared.js';

async function applyDeletes(client: OurGroceries, input: DeleteMasterItemsInput) {
  const { listId, itemIds } = input;
  const tasks = itemIds.map((id) => client.removeItemFromList(listId, id));
  await Promise.all(tasks);
}

export function deleteMasterItems(sessionId: string, input: DeleteMasterItemsInput): Promise<FormattedMasterList> {
  return mutateMasterList(sessionId, (client) => applyDeletes(client, input));
}
