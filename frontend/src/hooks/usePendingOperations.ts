import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { FALLBACK_CATEGORY_NAME, PENDING_OPERATIONS_KEY, normalizeCategoryId, readStoredJson } from '../utils/appUtils';
import { MasterList, MasterListItem, PendingDeleteEntry, PendingMoveEntry } from '../types';

type PendingMap<Entry> = Record<string, Entry>;

export interface UsePendingOperationsArgs {
  masterList: MasterList | null;
  itemLookup: Map<string, MasterListItem>;
  categoryNameLookup: Map<string, string>;
}

export interface UsePendingOperationsResult {
  pendingMoves: PendingMap<PendingMoveEntry>;
  pendingDeletes: PendingMap<PendingDeleteEntry>;
  setPendingMoves: Dispatch<SetStateAction<PendingMap<PendingMoveEntry>>>;
  setPendingDeletes: Dispatch<SetStateAction<PendingMap<PendingDeleteEntry>>>;
  hasPendingChanges: boolean;
}

const RESTORE_ERROR = 'Unable to restore pending operations:';

const hasEntries = (moves: PendingMap<PendingMoveEntry>, deletes: PendingMap<PendingDeleteEntry>) =>
  Object.keys(moves).length > 0 || Object.keys(deletes).length > 0;

const buildMoveEntry = (item: MasterListItem, targetId: string, targetName: string): PendingMoveEntry => ({
  itemId: item.id,
  itemName: item.name,
  targetCategoryId: targetId,
  targetCategoryName: targetName,
});

const extractMoves = (
  entries: unknown[],
  itemLookup: Map<string, MasterListItem>,
  categoryNameLookup: Map<string, string>
) => {
  if (!Array.isArray(entries)) return {};
  const result: PendingMap<PendingMoveEntry> = {};
  entries.forEach((raw: any) => {
    if (!raw?.itemId) return;
    const item = itemLookup.get(raw.itemId);
    if (!item) return;
    const targetId = normalizeCategoryId(raw.targetCategoryId);
    const targetName = categoryNameLookup.get(targetId) || raw.targetCategoryName || FALLBACK_CATEGORY_NAME;
    result[raw.itemId] = buildMoveEntry(item, targetId, targetName);
  });
  return result;
};

const extractDeletes = (entries: unknown[], itemLookup: Map<string, MasterListItem>) => {
  if (!Array.isArray(entries)) return {};
  const result: PendingMap<PendingDeleteEntry> = {};
  entries.forEach((raw: any) => {
    if (!raw?.itemId) return;
    const item = itemLookup.get(raw.itemId);
    if (!item) return;
    result[raw.itemId] = { itemId: item.id, itemName: item.name };
  });
  return result;
};

const rebuildMoves = (
  map: PendingMap<PendingMoveEntry>,
  itemLookup: Map<string, MasterListItem>,
  categoryNameLookup: Map<string, string>
) => {
  const result: PendingMap<PendingMoveEntry> = {};
  Object.values(map).forEach((entry) => {
    const item = itemLookup.get(entry.itemId);
    if (!item) return;
    const targetId = normalizeCategoryId(entry.targetCategoryId);
    const targetName = categoryNameLookup.get(targetId) || entry.targetCategoryName || FALLBACK_CATEGORY_NAME;
    result[entry.itemId] = buildMoveEntry(item, targetId, targetName);
  });
  return result;
};

const rebuildDeletes = (map: PendingMap<PendingDeleteEntry>, itemLookup: Map<string, MasterListItem>) => {
  const result: PendingMap<PendingDeleteEntry> = {};
  Object.values(map).forEach((entry) => {
    const item = itemLookup.get(entry.itemId);
    if (!item) return;
    result[entry.itemId] = { itemId: entry.itemId, itemName: item.name };
  });
  return result;
};

const readStoredEntries = (itemLookup: Map<string, MasterListItem>, categoryNameLookup: Map<string, string>) => {
  const stored = readStoredJson(PENDING_OPERATIONS_KEY, RESTORE_ERROR) as any;
  const moves = extractMoves(stored?.moves ?? [], itemLookup, categoryNameLookup);
  const deletes = extractDeletes(stored?.deletes ?? [], itemLookup);
  return { moves, deletes };
};

const writeStoredEntries = (moves: PendingMap<PendingMoveEntry>, deletes: PendingMap<PendingDeleteEntry>) => {
  const payload = { moves: Object.values(moves), deletes: Object.values(deletes) };
  window.localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(payload));
};

export const usePendingOperations = ({
  masterList,
  itemLookup,
  categoryNameLookup,
}: UsePendingOperationsArgs): UsePendingOperationsResult => {
  const [pendingMoves, setPendingMoves] = useState<PendingMap<PendingMoveEntry>>({});
  const [pendingDeletes, setPendingDeletes] = useState<PendingMap<PendingDeleteEntry>>({});
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!masterList || hasLoaded.current) return;
    const { moves, deletes } = readStoredEntries(itemLookup, categoryNameLookup);
    setPendingMoves(moves);
    setPendingDeletes(deletes);
    hasLoaded.current = true;
  }, [masterList, itemLookup, categoryNameLookup]);

  useEffect(() => {
    if (!hasLoaded.current) return;
    writeStoredEntries(pendingMoves, pendingDeletes);
  }, [pendingMoves, pendingDeletes]);

  useEffect(() => {
    if (!masterList) return;
    setPendingMoves((prev) => rebuildMoves(prev, itemLookup, categoryNameLookup));
    setPendingDeletes((prev) => rebuildDeletes(prev, itemLookup));
  }, [masterList, itemLookup, categoryNameLookup]);

  const hasPendingChanges = useMemo(() => hasEntries(pendingMoves, pendingDeletes), [pendingMoves, pendingDeletes]);

  return {
    pendingMoves,
    pendingDeletes,
    setPendingMoves,
    setPendingDeletes,
    hasPendingChanges,
  };
};
