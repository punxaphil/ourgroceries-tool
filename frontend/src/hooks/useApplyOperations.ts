import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { denormalizeCategoryId } from '../utils/appUtils';
import { ApplyStep, ApplyStepStatus, MasterList, PendingDeleteEntry, PendingMoveEntry } from '../types';
import { handleUnauthorized, UNAUTHORIZED_ERROR } from './apiUtils';

type PendingMap<Entry> = Record<string, Entry>;
type PendingSetter<Entry> = Dispatch<SetStateAction<PendingMap<Entry>>>;

type UseApplyOperationsArgs = {
  masterList: MasterList | null;
  pendingMoves: PendingMap<PendingMoveEntry>;
  setPendingMoves: PendingSetter<PendingMoveEntry>;
  pendingDeletes: PendingMap<PendingDeleteEntry>;
  setPendingDeletes: PendingSetter<PendingDeleteEntry>;
  fetchLists: () => Promise<void>;
  addToast: (message: string) => void;
  showPendingOnly: boolean;
  setShowPendingOnly: Dispatch<SetStateAction<boolean>>;
  syncMasterList: (next: MasterList) => void;
  onUnauthorized: () => void;
};

export type UseApplyOperationsResult = {
  applyModalOpen: boolean;
  applySteps: ApplyStep[];
  isApplying: boolean;
  handleApply: () => void;
  handleConfirmApply: () => Promise<void>;
  handleRemoveStep: (step: ApplyStep) => void;
  handleCloseModal: () => void;
};

const BATCH_SIZE = 5;
const REQUEST_FAILED = 'Request failed';
const APPLY_SUCCESS = 'Changes applied successfully.';
const APPLY_FAILURE = 'Some changes failed. Review and try again.';

const buildApplySteps = (moves: PendingMoveEntry[], deletes: PendingDeleteEntry[]): ApplyStep[] => [
  ...moves.map((entry) => ({
    key: `move-${entry.itemId}`,
    type: 'move' as const,
    status: 'pending' as ApplyStepStatus,
    itemId: entry.itemId,
    itemName: entry.itemName,
    targetCategoryId: entry.targetCategoryId,
    targetCategoryName: entry.targetCategoryName,
  })),
  ...deletes.map((entry) => ({
    key: `delete-${entry.itemId}`,
    type: 'delete' as const,
    status: 'pending' as ApplyStepStatus,
    itemId: entry.itemId,
    itemName: entry.itemName,
  })),
];

const scrollApplyList = () => {
  const listEl = document.querySelector('.apply-progress-list');
  if (!listEl) return;
  const items = Array.from(listEl.querySelectorAll('li'));
  const incomplete = items.filter(
    (node) => node.classList.contains('status-pending') || node.classList.contains('status-running')
  );
  if (incomplete.length === 0) {
    listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
    return;
  }
  const first = incomplete[0];
  const last = incomplete[incomplete.length - 1];
  const firstTop = first.offsetTop;
  const lastBottom = last.offsetTop + last.offsetHeight;
  const viewportTop = listEl.scrollTop;
  const viewportBottom = viewportTop + listEl.clientHeight;
  if (viewportTop > firstTop) {
    listEl.scrollTo({ top: firstTop, behavior: 'smooth' });
    return;
  }
  if (lastBottom > viewportBottom) {
    const desiredTop = Math.max(firstTop, lastBottom - listEl.clientHeight);
    listEl.scrollTo({ top: desiredTop, behavior: 'smooth' });
  }
};

const updateApplyStepStatus =
  (setApplySteps: Dispatch<SetStateAction<ApplyStep[]>>) =>
  (index: number, status: ApplyStepStatus, errorMessage?: string | null) => {
    setApplySteps((prev) =>
      prev.map((step, idx) =>
        idx === index
          ? {
              ...step,
              status,
              errorMessage: errorMessage ?? step.errorMessage ?? null,
            }
          : step
      )
    );
    setTimeout(scrollApplyList, 0);
  };

const requestMove = async (listId: string, step: ApplyStep, onUnauthorized: () => void): Promise<MasterList | null> => {
  const targetId = step.targetCategoryId;
  if (!targetId) throw new Error(REQUEST_FAILED);
  const response = await fetch('/api/master/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      list_id: listId,
      items: [{ item_id: step.itemId, item_name: step.itemName }],
      target_category_id: denormalizeCategoryId(targetId),
    }),
  });
  if (handleUnauthorized(response, onUnauthorized)) throw new Error(UNAUTHORIZED_ERROR);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || REQUEST_FAILED);
  }
  const payload = await response.json();
  return (payload?.masterList as MasterList | undefined) ?? null;
};

const requestDelete = async (
  listId: string,
  step: ApplyStep,
  onUnauthorized: () => void
): Promise<MasterList | null> => {
  const response = await fetch('/api/master/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_id: listId, item_ids: [step.itemId] }),
  });
  if (handleUnauthorized(response, onUnauthorized)) throw new Error(UNAUTHORIZED_ERROR);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || REQUEST_FAILED);
  }
  const payload = await response.json();
  return (payload?.masterList as MasterList | undefined) ?? null;
};

const prunePending = <Entry extends { itemId: string }>(setState: PendingSetter<Entry>, keepIds: Set<string>) => {
  setState((prev) => {
    if (keepIds.size === 0) return {};
    const next: PendingMap<Entry> = {};
    Object.values(prev).forEach((entry) => {
      if (keepIds.has(entry.itemId)) next[entry.itemId] = entry;
    });
    return next;
  });
};

const removePendingEntry = <Entry>(map: PendingMap<Entry>, id: string) => {
  if (!map[id]) return map;
  const next = { ...map };
  delete next[id];
  return next;
};

const pruneApplySteps = (steps: ApplyStep[], step: ApplyStep) => {
  const next = steps.filter((current) => current.key !== step.key);
  return { next, shouldClose: next.length === 0 };
};

export const useApplyOperations = ({
  masterList,
  pendingMoves,
  setPendingMoves,
  pendingDeletes,
  setPendingDeletes,
  fetchLists,
  addToast,
  showPendingOnly,
  setShowPendingOnly,
  syncMasterList,
  onUnauthorized,
}: UseApplyOperationsArgs): UseApplyOperationsResult => {
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applySteps, setApplySteps] = useState<ApplyStep[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const updateStatus = useCallback(updateApplyStepStatus(setApplySteps), []);

  const runOperations = useCallback(
    async (listId: string, moveEntries: PendingMoveEntry[], deleteEntries: PendingDeleteEntry[]) => {
      const remainingMoveIds = new Set(moveEntries.map((entry) => entry.itemId));
      const remainingDeleteIds = new Set(deleteEntries.map((entry) => entry.itemId));
      const steps = buildApplySteps(moveEntries, deleteEntries);
      let hadErrors = false;

      for (let index = 0; index < steps.length; index += BATCH_SIZE) {
        const batch = steps.slice(index, index + BATCH_SIZE);
        const tasks = batch.map((step, offset) =>
          (async () => {
            const stepIndex = index + offset;
            updateStatus(stepIndex, 'running');
            try {
              const master =
                step.type === 'move'
                  ? await requestMove(listId, step, onUnauthorized)
                  : await requestDelete(listId, step, onUnauthorized);
              if (master) syncMasterList(master);
              if (step.type === 'move') remainingMoveIds.delete(step.itemId);
              if (step.type === 'delete') remainingDeleteIds.delete(step.itemId);
              updateStatus(stepIndex, 'success');
            } catch (error) {
              console.error(error);
              hadErrors = true;
              const message = error instanceof Error && error.message ? error.message : REQUEST_FAILED;
              updateStatus(stepIndex, 'error', message);
            }
          })()
        );
        await Promise.allSettled(tasks);
      }

      prunePending(setPendingMoves, remainingMoveIds);
      prunePending(setPendingDeletes, remainingDeleteIds);

      if (!hadErrors) {
        await fetchLists();
        setApplyModalOpen(false);
        addToast(APPLY_SUCCESS);
        if (showPendingOnly && remainingMoveIds.size === 0 && remainingDeleteIds.size === 0) {
          setShowPendingOnly(false);
        }
      } else {
        addToast(APPLY_FAILURE);
      }

      setIsApplying(false);
    },
    [
      addToast,
      fetchLists,
      setPendingMoves,
      setPendingDeletes,
      setShowPendingOnly,
      showPendingOnly,
      syncMasterList,
      onUnauthorized,
      updateStatus,
    ]
  );

  const handleApply = useCallback(() => {
    if (isApplying || !masterList) return;
    const moveEntries = Object.values(pendingMoves);
    const deleteEntries = Object.values(pendingDeletes);
    if (moveEntries.length === 0 && deleteEntries.length === 0) return;
    setApplySteps(buildApplySteps(moveEntries, deleteEntries));
    setApplyModalOpen(true);
  }, [isApplying, masterList, pendingMoves, pendingDeletes]);

  const handleConfirmApply = useCallback(async () => {
    if (isApplying || !masterList) return;
    const moveEntries = Object.values(pendingMoves);
    const deleteEntries = Object.values(pendingDeletes);
    if (moveEntries.length === 0 && deleteEntries.length === 0) return;
    setIsApplying(true);
    await runOperations(masterList.id, moveEntries, deleteEntries);
  }, [isApplying, masterList, pendingMoves, pendingDeletes, runOperations]);

  const handleRemoveStep = useCallback(
    (step: ApplyStep) => {
      if (isApplying) return;
      if (step.type === 'move') {
        setPendingMoves((prev) => removePendingEntry(prev, step.itemId));
      } else {
        setPendingDeletes((prev) => removePendingEntry(prev, step.itemId));
      }
      setApplySteps((prev) => {
        const { next, shouldClose } = pruneApplySteps(prev, step);
        if (shouldClose) setApplyModalOpen(false);
        return next;
      });
    },
    [isApplying, setPendingMoves, setPendingDeletes]
  );

  const handleCloseModal = useCallback(() => {
    if (isApplying) return;
    setApplyModalOpen(false);
  }, [isApplying]);

  return {
    applyModalOpen,
    applySteps,
    isApplying,
    handleApply,
    handleConfirmApply,
    handleRemoveStep,
    handleCloseModal,
  };
};
