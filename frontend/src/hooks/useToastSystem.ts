import { Dispatch, MutableRefObject, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { createToastManager } from '../toast/createToastManager';
import { CategorySelectionOptions, PointerPosition, Toast, ToastId, ToastManager } from '../types';

export type UseToastSystemResult = {
  toasts: Toast[];
  addToast: (message: string, position?: PointerPosition | null) => ToastId | null;
  showCategorySelection: (options: CategorySelectionOptions) => ToastId | null;
  dismissToast: (id: ToastId) => void;
  cancelAutoDismiss: (id: ToastId) => void;
};

type ToastManagerRef = MutableRefObject<ToastManager | null>;

const initialPointer = (): PointerPosition => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: 24 };
};

const createMoveHandler = (pointerRef: MutableRefObject<PointerPosition>) => (event: MouseEvent) => {
  pointerRef.current = { x: event.clientX, y: event.clientY };
};

const usePointerTracker = (pointerRef: MutableRefObject<PointerPosition>) => {
  useEffect(() => {
    const handleMove = createMoveHandler(pointerRef);
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [pointerRef]);
};

const useManagerLifecycle = (
  managerRef: ToastManagerRef,
  setToasts: Dispatch<SetStateAction<Toast[]>>,
  pointerRef: MutableRefObject<PointerPosition>
) => {
  useEffect(() => {
    const manager = createToastManager({
      setToasts,
      getPointerPosition: () => pointerRef.current,
    });
    managerRef.current = manager;
    return () => manager.clearAll();
  }, [setToasts, pointerRef]);
};

const addToastWith =
  (managerRef: ToastManagerRef) =>
  (message: string, position: PointerPosition | null = null): ToastId | null => {
    const manager = managerRef.current;
    if (!manager) return null;
    return manager.add(message, position);
  };

const showSelectionWith =
  (managerRef: ToastManagerRef) =>
  (options: CategorySelectionOptions): ToastId | null => {
    const manager = managerRef.current;
    if (!manager) return null;
    return manager.showCategorySelection(options);
  };

const callManager =
  <Key extends 'dismiss' | 'cancelAutoDismiss'>(managerRef: ToastManagerRef, method: Key) =>
  (id: ToastId) => {
    const manager = managerRef.current;
    if (!manager) return;
    manager[method](id);
  };

const useToastState = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pointerRef = useRef<PointerPosition>(initialPointer());
  const managerRef = useRef<ToastManager | null>(null);
  usePointerTracker(pointerRef);
  useManagerLifecycle(managerRef, setToasts, pointerRef);
  return { toasts, managerRef };
};

export const useToastSystem = (): UseToastSystemResult => {
  const { toasts, managerRef } = useToastState();
  const actions = useMemo(
    () => ({
      addToast: addToastWith(managerRef),
      showCategorySelection: showSelectionWith(managerRef),
      dismissToast: callManager(managerRef, 'dismiss'),
      cancelAutoDismiss: callManager(managerRef, 'cancelAutoDismiss'),
    }),
    [managerRef]
  );
  return { toasts, ...actions };
};
