import { useCallback, useState } from 'react';
import { handleUnauthorized, UNAUTHORIZED_ERROR } from './apiUtils';

const REQUEST_FAILED = 'Create category failed';

export interface UseCreateCategoryModalArgs {
  addToast: (message: string) => void;
  fetchLists: () => Promise<void>;
  onUnauthorized: () => void;
}

export interface UseCreateCategoryModalResult {
  open: boolean;
  name: string;
  isCreating: boolean;
  setName: (value: string) => void;
  handleOpen: () => void;
  handleClose: () => void;
  handleSubmit: () => Promise<void>;
}

const readErrorDetail = (text: string) => {
  if (!text) return null;
  try {
    const data = JSON.parse(text);
    return typeof data?.detail === 'string' ? data.detail : null;
  } catch {
    return null;
  }
};

const requestCreateCategory = async (name: string, onUnauthorized: () => void) => {
  const response = await fetch('/api/master/create-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (handleUnauthorized(response, onUnauthorized)) throw new Error(UNAUTHORIZED_ERROR);
  if (response.ok) return;
  const detail = readErrorDetail(await response.text());
  throw new Error(detail || REQUEST_FAILED);
};

export const useCreateCategoryModal = ({
  addToast,
  fetchLists,
  onUnauthorized,
}: UseCreateCategoryModalArgs): UseCreateCategoryModalResult => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleOpen = useCallback(() => {
    setName('');
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (isCreating) return;
    setOpen(false);
    setName('');
    setIsCreating(false);
  }, [isCreating]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      await requestCreateCategory(trimmed, onUnauthorized);
      addToast(`Category "${trimmed}" created`);
      await fetchLists();
      setOpen(false);
      setName('');
    } catch (error) {
      console.error('Create category error:', error);
      const message = error instanceof Error ? error.message : REQUEST_FAILED;
      addToast(message || REQUEST_FAILED);
    } finally {
      setIsCreating(false);
    }
  }, [name, isCreating, addToast, fetchLists, onUnauthorized]);

  return { open, name, isCreating, setName, handleOpen, handleClose, handleSubmit };
};
