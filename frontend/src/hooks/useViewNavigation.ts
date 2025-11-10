import { useCallback, useEffect, useState } from 'react';
import { HASH_LISTS, HASH_MASTER, resolveViewFromHash } from '../utils/appUtils';

export type ViewName = ReturnType<typeof resolveViewFromHash>;

export interface UseViewNavigationResult {
  view: ViewName;
  handleNavigateToMaster: () => void;
  handleNavigateHome: () => void;
}

const useEnsureDefaultHash = () => {
  useEffect(() => {
    if (window.location.hash) return;
    window.location.hash = HASH_LISTS;
  }, []);
};

const useHashSync = (setView: (value: ViewName) => void) => {
  useEffect(() => {
    const handleHashChange = () => setView(resolveViewFromHash(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setView]);
};

const useHashNavigator = (target: string) =>
  useCallback(() => {
    window.location.hash = target;
  }, [target]);

export const useViewNavigation = (): UseViewNavigationResult => {
  const [view, setView] = useState<ViewName>(() => resolveViewFromHash(window.location.hash));
  useEnsureDefaultHash();
  useHashSync(setView);
  const handleNavigateToMaster = useHashNavigator(HASH_MASTER);
  const handleNavigateHome = useHashNavigator(HASH_LISTS);
  return { view, handleNavigateToMaster, handleNavigateHome };
};
