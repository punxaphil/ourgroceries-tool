import type { ComponentProps } from 'react';
import type ApplyModal from '../components/ApplyModal';
import type CreateCategoryModal from '../components/CreateCategoryModal';
import type RenameModal from '../components/RenameModal';
import type CategorySidebar from '../components/master/CategorySidebar';
import type { CategorySelectionToast, PendingDeleteEntry, PendingMoveEntry } from '../types';

type SidebarProps = ComponentProps<typeof CategorySidebar>;
type ApplyModalProps = ComponentProps<typeof ApplyModal>;
type RenameModalProps = ComponentProps<typeof RenameModal>;
type CreateCategoryModalProps = ComponentProps<typeof CreateCategoryModal>;

type PendingMoves = Record<string, PendingMoveEntry>;
type PendingDeletes = Record<string, PendingDeleteEntry>;

type PendingSummary = {
  pendingMoves: PendingMoves;
  pendingDeletes: PendingDeletes;
};

type SidebarInput = Pick<
  SidebarProps,
  | 'loading'
  | 'categories'
  | 'categoryColorMap'
  | 'selectedCategoryId'
  | 'filterCategories'
  | 'isApplying'
  | 'showPendingOnly'
  | 'draggedCategoryId'
  | 'dragOverCategoryId'
  | 'sidebarRef'
  | 'onToggleFilter'
  | 'onSelectCategory'
  | 'onClearFilters'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragOver'
  | 'onDrop'
> &
  PendingSummary;

type ToastHandlerInput = {
  onDismiss: (id: string) => void;
  onCancelAutoDismiss: (id: string) => void;
  onCategorySelect: (toast: CategorySelectionToast, index: number) => void;
};

type ApplyModalInput = Pick<
  ApplyModalProps,
  'open' | 'isApplying' | 'steps' | 'onClose' | 'onConfirm' | 'onRemoveStep'
> &
  PendingSummary;

const hasEntries = (record: Record<string, unknown>) => Object.keys(record).length > 0;

const canReorderCategories = ({
  isApplying,
  showPendingOnly,
  filterCategories,
  pendingMoves,
  pendingDeletes,
}: Pick<SidebarProps, 'isApplying' | 'showPendingOnly' | 'filterCategories'> & PendingSummary) => {
  if (isApplying || showPendingOnly) return false;
  if (filterCategories.size > 0) return false;
  return !(hasEntries(pendingMoves) || hasEntries(pendingDeletes));
};

export const createSidebarProps = (params: SidebarInput): SidebarProps => {
  const { pendingMoves, pendingDeletes, ...rest } = params;
  return { ...rest, canReorderCategories: canReorderCategories(params) };
};

export const createToastHandlers = (handlers: ToastHandlerInput): ToastHandlerInput => handlers;

export const createApplyModalProps = (params: ApplyModalInput): ApplyModalProps => {
  const { pendingMoves, pendingDeletes, ...rest } = params;
  return {
    ...rest,
    pendingMoveCount: Object.keys(pendingMoves).length,
    pendingDeleteCount: Object.keys(pendingDeletes).length,
  };
};

export const createRenameModalProps = (params: RenameModalProps): RenameModalProps => params;

export const createCreateCategoryModalProps = (params: CreateCategoryModalProps): CreateCategoryModalProps => params;
