import type { FormattedMasterList, MoveMasterItemsInput } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { changeItem, mutateMasterList } from './shared.js';

async function applyMoves(client: OurGroceries, input: MoveMasterItemsInput) {
  const change = changeItem(client);
  await Promise.all(
    input.items.map((item) => change(input.listId, item.itemId, input.targetCategoryId, item.itemName))
  );
}

export function moveMasterItems(input: MoveMasterItemsInput): Promise<FormattedMasterList> {
  return mutateMasterList((client) => applyMoves(client, input));
}
