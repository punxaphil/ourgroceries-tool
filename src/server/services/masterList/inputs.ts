import { ensureArray, ensureObject, ensureOptionalString, ensureString } from '../../utils/validators.js';
import type {
  MoveMasterItemInput,
  MoveMasterItemsInput,
  DeleteMasterItemsInput,
  RenameMasterItemInput,
  RenameMasterCategoryInput,
  CreateMasterCategoryInput,
  DeleteMasterCategoryInput,
  ReorderMasterCategoriesInput,
} from '../../types.js';

const BODY_CONTEXT = 'body';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function readBody(body: unknown) {
  return ensureObject(body, BODY_CONTEXT);
}

function parseMoveItem(value: unknown): MoveMasterItemInput {
  const record = ensureObject(value, 'items[]');
  return {
    itemId: ensureString(record.item_id, 'item_id'),
    itemName: ensureString(record.item_name, 'item_name'),
  };
}

export function parseMoveMasterItemsInput(body: unknown): MoveMasterItemsInput {
  const record = readBody(body);
  return {
    listId: ensureString(record.list_id, 'list_id'),
    items: ensureArray(record.items, 'items').map(parseMoveItem),
    targetCategoryId: ensureOptionalString(record.target_category_id, 'target_category_id') ?? null,
  };
}

export function parseDeleteMasterItemsInput(body: unknown): DeleteMasterItemsInput {
  const record = readBody(body);
  const values = ensureArray(record.item_ids, 'item_ids', isString);
  return {
    listId: ensureString(record.list_id, 'list_id'),
    itemIds: values.map((value) => ensureString(value, 'item_ids[]')),
  };
}

export function parseRenameMasterItemInput(body: unknown): RenameMasterItemInput {
  const record = readBody(body);
  return {
    itemId: ensureString(record.itemId, 'itemId'),
    newName: ensureString(record.newName, 'newName'),
  };
}

export function parseRenameMasterCategoryInput(body: unknown): RenameMasterCategoryInput {
  const record = readBody(body);
  return {
    categoryId: ensureString(record.categoryId, 'categoryId'),
    newName: ensureString(record.newName, 'newName'),
  };
}

export function parseCreateMasterCategoryInput(body: unknown): CreateMasterCategoryInput {
  const record = readBody(body);
  return { name: ensureString(record.name, 'name') };
}

export function parseDeleteMasterCategoryInput(body: unknown): DeleteMasterCategoryInput {
  const record = readBody(body);
  return { categoryId: ensureString(record.categoryId, 'categoryId') };
}

export function parseReorderMasterCategoriesInput(body: unknown): ReorderMasterCategoriesInput {
  const record = readBody(body);
  return {
    itemId: ensureString(record.itemId, 'itemId'),
    nextItemId: ensureOptionalString(record.nextItemId, 'nextItemId') ?? null,
  };
}
