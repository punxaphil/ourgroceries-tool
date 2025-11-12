import { useCallback, useState } from 'react';
import { MasterList, RenameTarget } from '../types';
import { handleUnauthorized, UNAUTHORIZED_ERROR } from './apiUtils';

type UseRenameModalArgs = {
  addToast: (message: string) => void;
  onMasterListUpdate: (next: MasterList) => void;
  onUnauthorized: () => void;
};

type PreparedRename = {
  target: RenameTarget;
  name: string;
};

export type UseRenameModalResult = {
  renameModalOpen: boolean;
  renameTarget: RenameTarget | null;
  renameValue: string;
  isRenaming: boolean;
  setRenameValue: (value: string) => void;
  openRename: (target: RenameTarget) => void;
  closeRename: () => void;
  submitRename: () => void;
};

const RENAME_FAILURE = 'Rename failed';

const textFrom = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const errorFrom = (raw: string, fallback: string): string => {
  try {
    const data = JSON.parse(raw) as { detail?: unknown; message?: unknown };
    return (textFrom(data.detail) ?? textFrom(data.message) ?? raw) || fallback;
  } catch {
    return raw || fallback;
  }
};

const parseError = async (response: Response, fallback: string): Promise<string> => {
  const text = await response.text();
  if (!text) return fallback;
  return errorFrom(text, fallback);
};

const renamePayload = (target: RenameTarget, name: string) => {
  if (target.type === 'category') {
    return { endpoint: '/api/master/rename-category', body: { categoryId: target.id, newName: name } };
  }
  return { endpoint: '/api/master/rename-item', body: { itemId: target.id, newName: name } };
};

const requestRename = async (
  target: RenameTarget,
  name: string,
  onUnauthorized: () => void
) => {
  const { endpoint, body } = renamePayload(target, name);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (handleUnauthorized(response, onUnauthorized)) throw new Error(UNAUTHORIZED_ERROR);
  if (response.ok) return;
  throw new Error(await parseError(response, RENAME_FAILURE));
};

const loadMasterList = async (onUnauthorized: () => void): Promise<MasterList | null> => {
  try {
    const response = await fetch('/api/lists');
    if (handleUnauthorized(response, onUnauthorized)) return null;
    if (!response.ok) return null;
    const payload = (await response.json()) as { masterList?: MasterList | null };
    return payload?.masterList ?? null;
  } catch {
    return null;
  }
};

const prepareRename = (target: RenameTarget | null, value: string, busy: boolean): PreparedRename | null => {
  if (!target || busy) return null;
  const name = value.trim();
  if (!name) return null;
  return { target, name };
};

export const useRenameModal = ({ addToast, onMasterListUpdate, onUnauthorized }: UseRenameModalArgs): UseRenameModalResult => {
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const closeRename = useCallback(() => {
    if (isRenaming) return;
    setRenameModalOpen(false);
    setRenameTarget(null);
    setRenameValue('');
  }, [isRenaming]);

  const handleRenameError = useCallback(
    (error: unknown) => {
      console.error('Rename error:', error);
      const message = error instanceof Error && error.message ? error.message : RENAME_FAILURE;
      addToast(message);
    },
    [addToast]
  );

  const completeRename = useCallback(
    async (target: RenameTarget, name: string) => {
      await requestRename(target, name, onUnauthorized);
      addToast(`Renamed to "${name}"`);
      const masterList = await loadMasterList(onUnauthorized);
      if (masterList) onMasterListUpdate(masterList);
      closeRename();
    },
    [addToast, closeRename, onMasterListUpdate, onUnauthorized]
  );

  const openRename = useCallback((target: RenameTarget) => {
    setRenameTarget(target);
    setRenameValue(target.currentName);
    setRenameModalOpen(true);
  }, []);

  const submitRename = useCallback(async () => {
    const prepared = prepareRename(renameTarget, renameValue, isRenaming);
    if (!prepared) return;
    if (prepared.name === prepared.target.currentName) return closeRename();
    setIsRenaming(true);
    await completeRename(prepared.target, prepared.name).catch(handleRenameError);
    setIsRenaming(false);
  }, [renameTarget, renameValue, isRenaming, completeRename, handleRenameError, closeRename]);

  return {
    renameModalOpen,
    renameTarget,
    renameValue,
    isRenaming,
    setRenameValue,
    openRename,
    closeRename,
    submitRename,
  };
};

export type { UseRenameModalArgs };
