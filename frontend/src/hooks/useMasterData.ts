import { useCallback, useEffect, useState } from 'react';
import { MasterList, ShoppingListSummary } from '../types';

type MasterData = {
  lists: ShoppingListSummary[];
  masterList: MasterList | null;
};

type MasterListTransform = (current: MasterList) => MasterList;

const INITIAL_STATUS = 'Loading lists…';
const REQUEST_ERROR = 'Unable to load lists. Check credentials and try again.';

export interface UseMasterDataResult {
  data: MasterData;
  status: string | null;
  loading: boolean;
  fetchLists: () => Promise<void>;
  applyMasterListTransform: (transform: MasterListTransform) => void;
  syncMasterList: (next: MasterList) => void;
}

const readListsPayload = (payload: unknown): MasterData => {
  if (!payload || typeof payload !== 'object') {
    return { lists: [], masterList: null };
  }
  const source = payload as Record<string, unknown>;
  const lists = Array.isArray(source.lists) ? (source.lists as ShoppingListSummary[]) : [];
  const masterList = (source.masterList as MasterList | null) ?? null;
  return { lists, masterList };
};

const shouldShowEmptyState = ({ lists, masterList }: MasterData) => {
  if (lists.length > 0) return false;
  if (!masterList) return true;
  return masterList.itemCount === 0;
};

const hydrateMasterData = async (response: Response): Promise<MasterData | null> => {
  if (!response.ok) {
    console.error(`Request failed with ${response.status}`);
    return null;
  }
  try {
    const payload = await response.json();
    return readListsPayload(payload);
  } catch (error) {
    console.error('Failed to parse lists payload', error);
    return null;
  }
};

export const useMasterData = (): UseMasterDataResult => {
  const [data, setData] = useState<MasterData>({ lists: [], masterList: null });
  const [status, setStatus] = useState<string | null>(INITIAL_STATUS);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lists');
      const nextData = await hydrateMasterData(response);
      if (!nextData) {
        setStatus(REQUEST_ERROR);
        return;
      }
      setData(nextData);
      setStatus(shouldShowEmptyState(nextData) ? 'No lists found.' : null);
    } catch (error) {
      console.error(error);
      setStatus(REQUEST_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const applyMasterListTransform = useCallback((transform: MasterListTransform) => {
    setData((prev) => {
      if (!prev.masterList) return prev;
      return { ...prev, masterList: transform(prev.masterList) };
    });
  }, []);

  const syncMasterList = useCallback((next: MasterList) => {
    setData((prev) => ({ ...prev, masterList: next }));
  }, []);

  return { data, status, loading, fetchLists, applyMasterListTransform, syncMasterList };
};
