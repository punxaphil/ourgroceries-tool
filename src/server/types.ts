export interface ShoppingListSummary {
  id: string;
  name: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
  sortOrder?: string;
}

export interface FormattedItem {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  crossedOff: boolean;
  note?: string;
}

export interface FormattedSection {
  id: string;
  name: string;
  items: FormattedItem[];
  sortOrder?: string;
}

export interface FormattedMasterList {
  id: string;
  name: string;
  itemCount: number;
  sections: FormattedSection[];
}

export interface ListsPayload {
  lists: ShoppingListSummary[];
  masterList: FormattedMasterList;
}

export interface MoveMasterItemInput {
  itemId: string;
  itemName: string;
}

export interface MoveMasterItemsInput {
  listId: string;
  items: MoveMasterItemInput[];
  targetCategoryId: string | null;
}

export interface DeleteMasterItemsInput {
  listId: string;
  itemIds: string[];
}

export interface RenameMasterItemInput {
  itemId: string;
  newName: string;
}

export interface RenameMasterCategoryInput {
  categoryId: string;
  newName: string;
}

export interface CreateMasterCategoryInput {
  name: string;
}

export interface DeleteMasterCategoryInput {
  categoryId: string;
}

export interface ReorderMasterCategoriesInput {
  itemId: string;
  nextItemId: string | null;
}

export interface ErrorBody {
  detail: string;
}
