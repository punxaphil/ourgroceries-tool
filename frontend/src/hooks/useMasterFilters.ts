import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { FILTER_STATE_KEY, PENDING_FILTER_KEY, readStoredJson } from '../utils/appUtils';
import { PendingDeleteEntry, PendingMoveEntry } from '../types';

type PendingMap<Entry> = Record<string, Entry>;
type CategorySetState = Dispatch<SetStateAction<Set<string>>>;
type BooleanState = Dispatch<SetStateAction<boolean>>;

const PENDING_RESET_MESSAGE = 'No pending changes remaining - showing all items';

const readStoredCategories = () => {
  const stored = readStoredJson<{ categories?: string[] }>(FILTER_STATE_KEY, 'Failed to load filter state:');
  if (Array.isArray(stored?.categories)) return new Set(stored.categories);
  return new Set<string>();
};

const readStoredPendingFlag = () => {
  const stored = readStoredJson<boolean>(PENDING_FILTER_KEY, 'Failed to load pending filter state:');
  return stored === true;
};

const writeCategories = (categories: Set<string>) => {
  const payload = { categories: Array.from(categories) };
  window.localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(payload));
};

const writePendingFlag = (flag: boolean) => {
  window.localStorage.setItem(PENDING_FILTER_KEY, JSON.stringify(flag));
};

const useFilterCategoriesState = () => {
  const [categories, setCategories] = useState<Set<string>>(readStoredCategories);
  useEffect(() => writeCategories(categories), [categories]);
  return [categories, setCategories] as const;
};

const usePendingFlagState = () => {
  const [flag, setFlag] = useState<boolean>(readStoredPendingFlag);
  useEffect(() => writePendingFlag(flag), [flag]);
  return [flag, setFlag] as const;
};

const hasPendingEntries = <Entry>(moves: PendingMap<Entry>, deletes: PendingMap<Entry>) =>
  Object.keys(moves).length > 0 || Object.keys(deletes).length > 0;

const usePendingAutoDisable = ({
  showPendingOnly,
  pendingMoves,
  pendingDeletes,
  setShowPendingOnly,
  addToast,
}: {
  showPendingOnly: boolean;
  pendingMoves: PendingMap<PendingMoveEntry>;
  pendingDeletes: PendingMap<PendingDeleteEntry>;
  setShowPendingOnly: BooleanState;
  addToast: (message: string) => void;
}) => {
  useEffect(() => {
    if (!showPendingOnly) return;
    if (hasPendingEntries(pendingMoves, pendingDeletes)) return;
    setShowPendingOnly(false);
    addToast(PENDING_RESET_MESSAGE);
  }, [showPendingOnly, pendingMoves, pendingDeletes, setShowPendingOnly, addToast]);
};

const toggleCategory = (current: Set<string>, categoryId: string) => {
  const next = new Set(current);
  if (next.has(categoryId)) {
    next.delete(categoryId);
    return next;
  }
  next.add(categoryId);
  return next;
};

export interface UseMasterFiltersArgs {
  pendingMoves: PendingMap<PendingMoveEntry>;
  pendingDeletes: PendingMap<PendingDeleteEntry>;
  addToast: (message: string) => void;
}

export interface UseMasterFiltersResult {
  filterCategories: Set<string>;
  showPendingOnly: boolean;
  handleTogglePendingFilter: () => void;
  handleToggleCategoryFilter: (categoryId: string) => void;
  handleClearAllFilters: () => void;
  setFilterCategories: CategorySetState;
  setShowPendingOnly: BooleanState;
}

export const useMasterFilters = ({
  pendingMoves,
  pendingDeletes,
  addToast,
}: UseMasterFiltersArgs): UseMasterFiltersResult => {
  const [filterCategories, setFilterCategories] = useFilterCategoriesState();
  const [showPendingOnly, setShowPendingOnly] = usePendingFlagState();
  usePendingAutoDisable({ showPendingOnly, pendingMoves, pendingDeletes, setShowPendingOnly, addToast });

  const handleToggleCategoryFilter = useCallback((categoryId: string) => {
    setFilterCategories((prev) => toggleCategory(prev, categoryId));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilterCategories(() => new Set());
  }, []);

  const handleTogglePendingFilter = useCallback(() => {
    setShowPendingOnly((prev) => {
      const next = !prev;
      if (next) setFilterCategories(() => new Set());
      return next;
    });
  }, [setFilterCategories]);

  return {
    filterCategories,
    showPendingOnly,
    handleTogglePendingFilter,
    handleToggleCategoryFilter,
    handleClearAllFilters,
    setFilterCategories,
    setShowPendingOnly,
  };
};
