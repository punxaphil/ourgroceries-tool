import { useCallback, useRef, useState } from 'react';
import { handleUnauthorized, readApiError, UNAUTHORIZED_ERROR } from './apiUtils';
import { MasterList } from '../types';

type Toast = (message: string) => void;
type FetchLists = () => Promise<void>;
type SyncMaster = (next: MasterList) => void;

const DELETE_FAILED = 'Delete category failed';
const ENDPOINT = '/api/master/delete-category';
const successMessage = (name: string) => `Category "${name}" deleted`;
const confirmDeletion = (name: string) =>
  window.confirm(`Delete category "${name}"? Items in this category will become uncategorized.`);

const requestDelete = async (
  categoryId: string,
  onUnauthorized: () => void
): Promise<MasterList | null> => {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryId }),
  });
  if (handleUnauthorized(response, onUnauthorized)) throw new Error(UNAUTHORIZED_ERROR);
  if (!response.ok) throw new Error(await readApiError(response));
  const payload = await response.json();
  return (payload?.masterList as MasterList | null) ?? null;
};

export interface UseCategoryDeletionArgs {
  addToast: Toast;
  fetchLists: FetchLists;
  syncMasterList: SyncMaster;
  isApplying: boolean;
  onUnauthorized: () => void;
}

export interface UseCategoryDeletionResult {
  isDeleting: boolean;
  deleteCategory: (categoryId: string, categoryName: string) => Promise<void>;
}

export const useCategoryDeletion = ({
  addToast,
  fetchLists,
  syncMasterList,
  isApplying,
  onUnauthorized,
}: UseCategoryDeletionArgs): UseCategoryDeletionResult => {
  const [isDeleting, setInternalIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const setDeleting = useCallback((value: boolean) => {
    isDeletingRef.current = value;
    setInternalIsDeleting(value);
  }, []);

  const deleteCategory = useCallback(
    async (categoryId: string, categoryName: string) => {
      if (isApplying || isDeletingRef.current) return;
      if (!confirmDeletion(categoryName)) return;
      setDeleting(true);
      try {
        const master = await requestDelete(categoryId, onUnauthorized);
        if (master) syncMasterList(master);
        await fetchLists();
        addToast(successMessage(categoryName));
      } catch (error) {
        console.error('Delete category error:', error);
        const message = error instanceof Error && error.message ? error.message : DELETE_FAILED;
        addToast(message);
      } finally {
        setDeleting(false);
      }
    },
    [addToast, fetchLists, isApplying, onUnauthorized, setDeleting, syncMasterList]
  );

  return { isDeleting, deleteCategory };
};
