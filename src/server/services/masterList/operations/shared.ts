import type { OurGroceries } from 'ourgroceries';
import { getOurGroceriesClient } from '../../ourGroceriesClient.js';
import type { FormattedMasterList } from '../../../types.js';
import { fetchMasterList } from '../context.js';

export const REORDER_COMMAND = 'reorderItem';
export const CATEGORY_KEY = 'categoryId';

export type ChangeItemOnList = (
  listId: string,
  itemId: string,
  categoryId: string | null,
  value: string
) => Promise<unknown>;

export type Poster = (command: string, payload?: Record<string, unknown>) => Promise<unknown>;

export type MutateAction = (client: OurGroceries) => Promise<void>;

export function changeItem(client: OurGroceries): ChangeItemOnList {
  const changer = client as unknown as { changeItemOnList: ChangeItemOnList };
  return changer.changeItemOnList.bind(client);
}

export function postCommand(client: OurGroceries): Poster {
  const poster = client as unknown as { post: Poster };
  return poster.post.bind(client);
}

export async function mutateMasterList(action: MutateAction): Promise<FormattedMasterList> {
  const client = await getOurGroceriesClient();
  await action(client);
  return fetchMasterList();
}
