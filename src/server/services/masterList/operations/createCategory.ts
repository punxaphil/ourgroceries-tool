import type { FormattedMasterList, CreateMasterCategoryInput } from '../../../types.js';
import type { OurGroceries } from 'ourgroceries';
import { mutateMasterList } from './shared.js';

async function applyCreateCategory(client: OurGroceries, input: CreateMasterCategoryInput) {
  await client.createCategory(input.name);
}

export function createMasterCategory(
  sessionId: string,
  input: CreateMasterCategoryInput
): Promise<FormattedMasterList> {
  return mutateMasterList(sessionId, (client) => applyCreateCategory(client, input));
}
