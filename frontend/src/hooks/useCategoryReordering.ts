import { DragEvent, Dispatch, SetStateAction, useCallback, useState } from 'react';
import { FALLBACK_CATEGORY_NAME, UNCATEGORIZED_ID } from '../utils/appUtils';
import { MasterList, MasterListSection } from '../types';
import { handleUnauthorized, UNAUTHORIZED_ERROR } from './apiUtils';

type MasterListUpdater = (transform: (current: MasterList) => MasterList) => void;

type UseCategoryReorderingArgs = {
  sortedCategoryList: MasterListSection[];
  onMasterListOptimisticUpdate: MasterListUpdater;
  syncMasterList: (next: MasterList) => void;
  reloadMasterList: () => Promise<void>;
  addToast: (message: string) => void;
  onUnauthorized: () => void;
};

type UseCategoryReorderingResult = {
  draggedCategoryId: string | null;
  dragOverCategoryId: string | null;
  handleCategoryDragStart: (event: DragEvent<HTMLElement>, categoryId: string) => void;
  handleCategoryDragEnd: () => void;
  handleCategoryDragOver: (event: DragEvent<HTMLElement>, categoryId: string) => void;
  handleCategoryDrop: (event: DragEvent<HTMLElement>, targetCategoryId: string) => void;
};

type DropDetails = {
  sourceId: string;
  targetId: string;
  nextItemId: string | null;
  placeAfter: boolean;
};

const nextItemIdFor = (list: MasterListSection[], targetIndex: number, placeAfter: boolean): string | null => {
  if (!placeAfter) return list[targetIndex]?.id ?? null;
  const next = list[targetIndex + 1];
  return !next || next.id === UNCATEGORIZED_ID ? null : (next.id ?? null);
};

const buildDropDetails = (
  draggedId: string | null,
  targetId: string,
  list: MasterListSection[],
  addToast: (message: string) => void
): DropDetails | null => {
  if (!draggedId || draggedId === targetId) return null;
  if (draggedId === UNCATEGORIZED_ID || targetId === UNCATEGORIZED_ID) {
    addToast(`Cannot reorder '${FALLBACK_CATEGORY_NAME}' category`);
    return null;
  }
  const sourceIndex = list.findIndex((section) => section.id === draggedId);
  const targetIndex = list.findIndex((section) => section.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return null;
  return {
    sourceId: draggedId,
    targetId,
    nextItemId: nextItemIdFor(list, targetIndex, sourceIndex < targetIndex),
    placeAfter: sourceIndex < targetIndex,
  };
};

const reorderSections = (sections: MasterListSection[], details: DropDetails): MasterListSection[] => {
  const clone = sections.slice();
  const fromIndex = clone.findIndex((section) => section.id === details.sourceId);
  if (fromIndex === -1) return sections;
  const [source] = clone.splice(fromIndex, 1);
  const targetIndex = clone.findIndex((section) => section.id === details.targetId);
  const insertAt = details.placeAfter ? targetIndex + 1 : targetIndex;
  clone.splice(insertAt < 0 ? clone.length : insertAt, 0, source);
  return clone.map((section, order) => ({ ...section, sortOrder: String(order).padStart(4, '0') }));
};

const applyOptimisticUpdate = (update: MasterListUpdater, details: DropDetails) => {
  update((current) => ({ ...current, sections: reorderSections(current.sections, details) }));
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  const fallback = 'Failed to reorder categories';
  const raw = await response.text();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown };
    const message = [parsed.detail, parsed.message].find((value) => typeof value === 'string' && value.trim().length);
    return (message as string | undefined) ?? raw;
  } catch {
    return raw;
  }
};

const sendReorderRequest = async (
  details: DropDetails,
  onUnauthorized: () => void
): Promise<MasterList | null> => {
  const response = await fetch('/api/master/reorder-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: details.sourceId, nextItemId: details.nextItemId }),
  });
  if (handleUnauthorized(response, onUnauthorized)) throw new Error(UNAUTHORIZED_ERROR);
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  const payload = await response.json();
  return (payload?.masterList as MasterList | undefined) ?? null;
};

const finalizeReorder = async (
  details: DropDetails,
  syncMasterList: (next: MasterList) => void,
  reloadMasterList: () => Promise<void>,
  addToast: (message: string) => void,
  onUnauthorized: () => void
) => {
  try {
    const masterList = await sendReorderRequest(details, onUnauthorized);
    if (masterList) syncMasterList(masterList);
    addToast('Categories reordered');
  } catch (error) {
    console.error('Error reordering categories:', error);
    const message = error instanceof Error && error.message ? error.message : 'Failed to reorder categories';
    addToast(`Error: ${message}`);
    await reloadMasterList();
  }
};

const createDragStart = (setDraggedId: (id: string) => void) => (event: DragEvent<HTMLElement>, id: string) => {
  setDraggedId(id);
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', id);
};

const createDragOver =
  (setDragOverId: Dispatch<SetStateAction<string | null>>) => (event: DragEvent<HTMLElement>, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDragOverId((current) => (current === id ? current : id));
  };

const createDropHandler = (args: {
  getDraggedId: () => string | null;
  sortedCategoryList: MasterListSection[];
  addToast: (message: string) => void;
  resetDragState: () => void;
  onMasterListOptimisticUpdate: MasterListUpdater;
  syncMasterList: (next: MasterList) => void;
  reloadMasterList: () => Promise<void>;
  onUnauthorized: () => void;
}) => {
  return async (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const details = buildDropDetails(args.getDraggedId(), targetId, args.sortedCategoryList, args.addToast);
    if (!details) return args.resetDragState();
    applyOptimisticUpdate(args.onMasterListOptimisticUpdate, details);
    args.resetDragState();
    await finalizeReorder(details, args.syncMasterList, args.reloadMasterList, args.addToast, args.onUnauthorized);
  };
};

const useDragState = () => {
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const resetDragState = useCallback(() => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  }, []);
  return { draggedCategoryId, dragOverCategoryId, setDraggedCategoryId, setDragOverCategoryId, resetDragState };
};

export const useCategoryReordering = ({
  sortedCategoryList,
  onMasterListOptimisticUpdate,
  syncMasterList,
  reloadMasterList,
  addToast,
  onUnauthorized,
}: UseCategoryReorderingArgs): UseCategoryReorderingResult => {
  const { draggedCategoryId, dragOverCategoryId, setDraggedCategoryId, setDragOverCategoryId, resetDragState } =
    useDragState();

  const handleCategoryDragStart = useCallback(createDragStart(setDraggedCategoryId), [setDraggedCategoryId]);
  const handleCategoryDragEnd = resetDragState;
  const handleCategoryDragOver = useCallback(createDragOver(setDragOverCategoryId), [setDragOverCategoryId]);

  const handleCategoryDrop = useCallback(
    createDropHandler({
      getDraggedId: () => draggedCategoryId,
      sortedCategoryList,
      addToast,
      resetDragState,
      onMasterListOptimisticUpdate,
      syncMasterList,
      reloadMasterList,
      onUnauthorized,
    }),
    [
      draggedCategoryId,
      sortedCategoryList,
      addToast,
      resetDragState,
      onMasterListOptimisticUpdate,
      syncMasterList,
      reloadMasterList,
      onUnauthorized,
    ]
  );

  return {
    draggedCategoryId,
    dragOverCategoryId,
    handleCategoryDragStart,
    handleCategoryDragEnd,
    handleCategoryDragOver,
    handleCategoryDrop,
  };
};
