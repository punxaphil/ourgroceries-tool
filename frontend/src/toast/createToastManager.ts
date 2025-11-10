import {
  CategorySelectionOptions,
  CategorySelectionToast,
  PointerPosition,
  Toast,
  ToastId,
  ToastManager,
  ToastManagerConfig,
} from '../types';

const DEFAULT_TIMEOUT_MS = 2800;
const ZERO_POSITION: PointerPosition = { x: 0, y: 0 };

const createDefaultId = (): ToastId => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const safeList = (value: Toast[] | undefined): Toast[] => (Array.isArray(value) ? value : []);

const categoryToastFrom = (
  id: ToastId,
  position: PointerPosition,
  options: CategorySelectionOptions
): CategorySelectionToast => ({
  id,
  type: 'category-selection',
  lines: options.lines ?? [],
  selectedIndex: options.selectedIndex ?? 0,
  keyLetter: options.keyLetter ?? '',
  groupIds: options.groupIds ?? null,
  x: position.x,
  y: position.y,
  hoverCancelable: true,
});

const ensureUpdater = (setter: ToastManagerConfig['setToasts']): ToastManagerConfig['setToasts'] => {
  if (typeof setter !== 'function') throw new Error('setToasts function is required');
  return setter;
};

export const createToastManager = (config: ToastManagerConfig): ToastManager => {
  const apply = ensureUpdater(config.setToasts);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const idFactory = config.idFactory ?? createDefaultId;
  const timeouts = new Map<ToastId, number>();

  const readPointer = (position: PointerPosition | null | undefined): PointerPosition => {
    if (position) return position;
    return typeof config.getPointerPosition === 'function' ? config.getPointerPosition() : ZERO_POSITION;
  };

  const update = (mapper: (current: Toast[]) => Toast[]) => {
    apply((current) => mapper(safeList(current)));
  };

  const clearTimeoutId = (id: ToastId) => {
    const handle = timeouts.get(id);
    if (!handle) return;
    window.clearTimeout(handle);
    timeouts.delete(id);
  };

  const scheduleRemoval = (id: ToastId) => {
    clearTimeoutId(id);
    const handle = window.setTimeout(() => {
      update((list) => list.filter((toast) => toast.id !== id));
      timeouts.delete(id);
    }, timeoutMs);
    timeouts.set(id, handle);
  };

  const add = (message: string, position: PointerPosition | null = null): ToastId => {
    const id = idFactory();
    const coords = readPointer(position);
    update((list) => [...list, { id, message, x: coords.x, y: coords.y }]);
    scheduleRemoval(id);
    return id;
  };

  const showCategorySelection = (options: CategorySelectionOptions = {}): ToastId => {
    const id = idFactory();
    const toast = categoryToastFrom(id, readPointer(options.position ?? null), options);
    update((list) => [...list.filter((entry) => entry.type !== 'category-selection'), toast]);
    scheduleRemoval(id);
    return id;
  };

  const dismiss = (id: ToastId) => {
    if (!id) return;
    clearTimeoutId(id);
    update((list) => list.filter((toast) => toast.id !== id));
  };

  const cancelAutoDismiss = (id: ToastId) => {
    if (!id) return;
    clearTimeoutId(id);
  };

  const scheduleAutoDismiss = (id: ToastId) => {
    if (!id) return;
    scheduleRemoval(id);
  };

  const clearAll = () => {
    timeouts.forEach((handle) => window.clearTimeout(handle));
    timeouts.clear();
    update(() => []);
  };

  return {
    add,
    showCategorySelection,
    dismiss,
    cancelAutoDismiss,
    scheduleAutoDismiss,
    clearAll,
  };
};
