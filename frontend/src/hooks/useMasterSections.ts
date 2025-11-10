import { useMemo } from 'react';
import { NormalizedSection } from './useMasterListLookups';

type PendingMoves = Record<string, unknown>;
type PendingDeletes = Record<string, unknown>;

export type UseMasterSectionsArgs = {
  sections: NormalizedSection[];
  filterCategories: ReadonlySet<string>;
  showPendingOnly: boolean;
  pendingMoves: PendingMoves;
  pendingDeletes: PendingDeletes;
  totalItemCount: number;
};

export type UseMasterSectionsResult = {
  filteredSections: NormalizedSection[];
  filteredItemCount: number;
  itemCountText: string;
};

const getPendingIds = (moves: PendingMoves, deletes: PendingDeletes) => {
  const ids = new Set<string>();
  Object.keys(moves).forEach((id) => ids.add(id));
  Object.keys(deletes).forEach((id) => ids.add(id));
  return ids;
};

const filterByPending = (sections: NormalizedSection[], pendingIds: Set<string>) =>
  sections.reduce<NormalizedSection[]>((acc, section) => {
    const items = section.items.filter((item) => pendingIds.has(item.id));
    if (items.length > 0) acc.push({ ...section, items });
    return acc;
  }, []);

const filterByCategories = (sections: NormalizedSection[], filters: ReadonlySet<string>) =>
  sections.filter((section) => filters.has(section.id));

const countItems = (sections: NormalizedSection[]) =>
  sections.reduce((total, section) => total + section.items.length, 0);

const buildItemCountText = (
  showPendingOnly: boolean,
  pendingMoves: PendingMoves,
  pendingDeletes: PendingDeletes,
  filterCategories: ReadonlySet<string>,
  filteredItemCount: number,
  totalItemCount: number
) => {
  if (showPendingOnly) {
    const pendingCount = Object.keys(pendingMoves).length + Object.keys(pendingDeletes).length;
    const label = pendingCount === 1 ? 'change' : 'changes';
    return `Showing ${pendingCount} pending ${label} of ${totalItemCount} items`;
  }
  if (filterCategories.size > 0) return `Filtered out ${filteredItemCount} of ${totalItemCount} items`;
  return `${totalItemCount} items`;
};

export const useMasterSections = ({
  sections,
  filterCategories,
  showPendingOnly,
  pendingMoves,
  pendingDeletes,
  totalItemCount,
}: UseMasterSectionsArgs): UseMasterSectionsResult => {
  const filteredSections = useMemo(() => {
    if (showPendingOnly) {
      const pendingIds = getPendingIds(pendingMoves, pendingDeletes);
      if (pendingIds.size === 0) return [];
      return filterByPending(sections, pendingIds);
    }
    if (filterCategories.size === 0) return sections;
    return filterByCategories(sections, filterCategories);
  }, [sections, showPendingOnly, pendingMoves, pendingDeletes, filterCategories]);

  const filteredItemCount = useMemo(() => countItems(filteredSections), [filteredSections]);

  const itemCountText = useMemo(
    () =>
      buildItemCountText(
        showPendingOnly,
        pendingMoves,
        pendingDeletes,
        filterCategories,
        filteredItemCount,
        totalItemCount
      ),
    [showPendingOnly, pendingMoves, pendingDeletes, filterCategories, filteredItemCount, totalItemCount]
  );

  return { filteredSections, filteredItemCount, itemCountText };
};
