export interface PointerPosition {
  x: number;
  y: number;
}

export type ToastId = string;

interface ToastBase {
  id: ToastId;
  x: number;
  y: number;
  hoverCancelable?: boolean;
}

export interface MessageToast extends ToastBase {
  type?: 'message';
  message: string;
}

export interface CategorySelectionToast extends ToastBase {
  type: 'category-selection';
  lines: string[];
  selectedIndex: number;
  keyLetter: string;
  groupIds: string[] | null;
  hoverCancelable: true;
}

export type Toast = MessageToast | CategorySelectionToast;

export interface ToastManager {
  add: (message: string, position?: PointerPosition | null) => ToastId;
  showCategorySelection: (options: CategorySelectionOptions) => ToastId;
  dismiss: (id: ToastId) => void;
  cancelAutoDismiss: (id: ToastId) => void;
  scheduleAutoDismiss: (id: ToastId) => void;
  clearAll: () => void;
}

export interface ToastManagerConfig {
  setToasts: (updater: (current: Toast[]) => Toast[]) => void;
  getPointerPosition: () => PointerPosition;
  timeoutMs?: number;
  idFactory?: () => ToastId;
}

export interface CategorySelectionOptions {
  lines?: string[];
  selectedIndex?: number;
  keyLetter?: string;
  groupIds?: string[] | null;
  position?: PointerPosition | null;
}

export interface ShoppingListSummary {
  id: string | null;
  name: string;
}

export interface MasterListItem {
  id: string;
  name: string;
  categoryId: string | null;
  crossedOff?: boolean;
}

export interface MasterListSection {
  id: string | null;
  name: string;
  sortOrder?: string;
  items: MasterListItem[];
}

export interface MasterList {
  id: string;
  name: string;
  itemCount: number;
  sections: MasterListSection[];
}

export interface PendingMoveEntry {
  itemId: string;
  itemName: string;
  targetCategoryId: string;
  targetCategoryName: string;
}

export interface PendingDeleteEntry {
  itemId: string;
  itemName: string;
}

export type ApplyOperationType = 'move' | 'delete';

export type ApplyStepStatus = 'pending' | 'running' | 'success' | 'error';

export interface ApplyStep {
  key: string;
  type: ApplyOperationType;
  status: ApplyStepStatus;
  itemId: string;
  itemName: string;
  targetCategoryId?: string;
  targetCategoryName?: string;
  errorMessage?: string | null;
}

export type RenameTargetType = 'category' | 'item';

export interface RenameTarget {
  type: RenameTargetType;
  id: string;
  currentName: string;
}
