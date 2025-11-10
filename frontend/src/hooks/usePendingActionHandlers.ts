import { Dispatch, SetStateAction, useCallback } from 'react';
import { FALLBACK_CATEGORY_NAME, normalizeCategoryId } from '../utils/appUtils';
import { MasterListItem, PendingDeleteEntry, PendingMoveEntry } from '../types';

type PendingMap<Entry> = Record<string, Entry>;
type PendingItem = Pick<MasterListItem, 'id' | 'name'> & { categoryId?: string | null };

const SELECT_MESSAGE = 'Select a category before tagging items.';
const ALREADY_IN_CATEGORY = 'Item is already in that category.';

const removeEntry = <Entry>(map: PendingMap<Entry>, id: string) => {
  if (!map[id]) return map;
  const next = { ...map };
  delete next[id];
  return next;
};

const buildMoveEntry = (item: PendingItem, targetId: string, targetName: string): PendingMoveEntry => ({
  itemId: item.id,
  itemName: item.name,
  targetCategoryId: targetId,
  targetCategoryName: targetName,
});

const applyMoveUpdate = (
  prev: PendingMap<PendingMoveEntry>,
  item: PendingItem,
  targetId: string,
  lookup: Map<string, string>
) => {
  const current = prev[item.id];
  if (current?.targetCategoryId === targetId) return removeEntry(prev, item.id);
  const targetName = lookup.get(targetId) ?? FALLBACK_CATEGORY_NAME;
  return { ...prev, [item.id]: buildMoveEntry(item, targetId, targetName) };
};

const toggleDelete = (prev: PendingMap<PendingDeleteEntry>, item: PendingItem) =>
  prev[item.id] ? removeEntry(prev, item.id) : { ...prev, [item.id]: { itemId: item.id, itemName: item.name } };

interface ResolveArgs {
  selectedCategoryId: string | null;
  item: PendingItem;
  pendingMoves: PendingMap<PendingMoveEntry>;
  addToast: (message: string) => void;
}

interface ResolveResult {
  skip: boolean;
  targetId: string | null;
}

const resolveMoveTarget = ({ selectedCategoryId, item, pendingMoves, addToast }: ResolveArgs): ResolveResult => {
  if (!selectedCategoryId) {
    addToast(SELECT_MESSAGE);
    return { skip: true, targetId: null };
  }
  const targetId = normalizeCategoryId(selectedCategoryId);
  const currentId = normalizeCategoryId(item.categoryId);
  if (!pendingMoves[item.id] && currentId === targetId) {
    addToast(ALREADY_IN_CATEGORY);
    return { skip: true, targetId };
  }
  return { skip: false, targetId };
};

export interface UsePendingActionHandlersArgs {
  pendingMoves: PendingMap<PendingMoveEntry>;
  setPendingMoves: Dispatch<SetStateAction<PendingMap<PendingMoveEntry>>>;
  setPendingDeletes: Dispatch<SetStateAction<PendingMap<PendingDeleteEntry>>>;
  selectedCategoryId: string | null;
  categoryNameLookup: Map<string, string>;
  addToast: (message: string) => void;
  isApplying: boolean;
}

export interface UsePendingActionHandlersResult {
  handleToggleMove: (item: PendingItem) => void;
  handleToggleDelete: (item: PendingItem) => void;
}

export const usePendingActionHandlers = ({
  pendingMoves,
  setPendingMoves,
  setPendingDeletes,
  selectedCategoryId,
  categoryNameLookup,
  addToast,
  isApplying,
}: UsePendingActionHandlersArgs): UsePendingActionHandlersResult => {
  const handleToggleMove = useCallback(
    (item: PendingItem) => {
      if (isApplying) return;
      const { skip, targetId } = resolveMoveTarget({ selectedCategoryId, item, pendingMoves, addToast });
      if (skip || targetId === null) return;
      setPendingDeletes((prev) => removeEntry(prev, item.id));
      setPendingMoves((prev) => applyMoveUpdate(prev, item, targetId, categoryNameLookup));
    },
    [addToast, categoryNameLookup, isApplying, pendingMoves, selectedCategoryId, setPendingDeletes, setPendingMoves]
  );

  const handleToggleDelete = useCallback(
    (item: PendingItem) => {
      if (isApplying) return;
      setPendingMoves((prev) => removeEntry(prev, item.id));
      setPendingDeletes((prev) => toggleDelete(prev, item));
    },
    [isApplying, setPendingDeletes, setPendingMoves]
  );

  return { handleToggleMove, handleToggleDelete };
};
