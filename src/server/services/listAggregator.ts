import type { OurGroceries } from 'ourgroceries';
import type { CategoryIndexResult } from '../domain/categoryIndex.js';
import { getOurGroceriesClient } from './ourGroceriesClient.js';
import { extractShoppingLists } from './listExtractor.js';
import { buildCategoryIndex } from '../domain/categoryIndex.js';
import { formatMasterList } from '../domain/masterList/index.js';
import { CategoryMeta, FormattedMasterList, ListsPayload, ShoppingListSummary } from '../types.js';
import { createHttpError } from '../utils/httpError.js';

const NO_LISTS_ERROR = 'No shopping lists found in OurGroceries response.';

async function loadOverview(client: OurGroceries): Promise<unknown> {
  return client.getMyLists();
}

function ensureShoppingLists(lists: ShoppingListSummary[]): ShoppingListSummary[] {
  if (lists.length > 0) return lists;
  throw createHttpError(404, NO_LISTS_ERROR);
}

async function loadCategoryIndex(client: OurGroceries): Promise<CategoryIndexResult> {
  const response = await client.getCategoryItems();
  return buildCategoryIndex(response);
}

async function loadMasterList(
  client: OurGroceries,
  categories: CategoryMeta[],
  lookup: Map<string, string>
): Promise<FormattedMasterList> {
  const response = await client.getMasterList();
  return formatMasterList(response, categories, lookup);
}

export async function getCategoryIndex(sessionId: string): Promise<CategoryIndexResult> {
  const client = await getOurGroceriesClient(sessionId);
  return loadCategoryIndex(client);
}

export async function getListsPayload(sessionId: string): Promise<ListsPayload> {
  const client = await getOurGroceriesClient(sessionId);
  const overview = await loadOverview(client);
  const lists = ensureShoppingLists(extractShoppingLists(overview));
  const { categories, lookup } = await loadCategoryIndex(client);
  const masterList = await loadMasterList(client, categories, lookup);
  return { lists, masterList };
}
