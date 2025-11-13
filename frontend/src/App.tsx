import React, { useCallback, useRef } from 'react';
import ListsView from './components/ListsView';
import MasterViewContainer from './components/MasterViewContainer';
import AppLayers from './components/AppLayers';
import LoginView from './components/LoginView';
import { useCategoryReordering } from './hooks/useCategoryReordering';
import { useApplyOperations } from './hooks/useApplyOperations';
import { useCategorySelection } from './hooks/useCategorySelection';
import { useRenameModal } from './hooks/useRenameModal';
import { useToastSystem } from './hooks/useToastSystem';
import { useViewNavigation } from './hooks/useViewNavigation';
import { useMasterData } from './hooks/useMasterData';
import { useAuth } from './hooks/useAuth';
import { useCategoryListAnimation } from './hooks/useCategoryListAnimation';
import { useMasterFilters } from './hooks/useMasterFilters';
import { useCreateCategoryModal } from './hooks/useCreateCategoryModal';
import { usePendingOperations } from './hooks/usePendingOperations';
import { usePendingActionHandlers } from './hooks/usePendingActionHandlers';
import { useCategoryDeletion } from './hooks/useCategoryDeletion';
import { useMasterListLookups } from './hooks/useMasterListLookups';
import { useSortedCategories } from './hooks/useSortedCategories';
import { useMasterSections } from './hooks/useMasterSections';
import { CategorySelectionOptions, CategorySelectionToast } from './types';
import {
  createApplyModalProps,
  createCreateCategoryModalProps,
  createRenameModalProps,
  createSidebarProps,
  createToastHandlers,
} from './utils/appProps';

type CategorySelectionPresentation = Required<
  Pick<CategorySelectionOptions, 'lines' | 'selectedIndex' | 'keyLetter'>
> & {
  groupIds: string[] | null;
  position: Exclude<CategorySelectionOptions['position'], undefined>;
};

function App(): React.JSX.Element {
  const auth = useAuth();
  const masterData = useMasterData({
    enabled: auth.authenticated,
    onUnauthorized: auth.handleUnauthorized,
  });
  const navigation = useViewNavigation();
  const toastSystem = useToastSystem();
  function presentCategorySelectionCallback(options: CategorySelectionPresentation): void {
    const position = options.position ? { x: options.position.x ?? 0, y: options.position.y ?? 0 } : null;
    const payload: CategorySelectionOptions = {
      lines: options.lines,
      selectedIndex: options.selectedIndex,
      keyLetter: options.keyLetter,
      groupIds: options.groupIds,
      position,
    };
    toastSystem.showCategorySelection(payload);
  }
  const presentCategorySelection = useCallback(presentCategorySelectionCallback, [toastSystem.showCategorySelection]);
  const { masterList, lists } = masterData.data;
  const masterLookups = useMasterListLookups(masterList);
  const pendingOps = usePendingOperations({
    masterList,
    itemLookup: masterLookups.itemLookup,
    categoryNameLookup: masterLookups.categoryNameLookup,
  });
  const masterFilters = useMasterFilters({
    pendingMoves: pendingOps.pendingMoves,
    pendingDeletes: pendingOps.pendingDeletes,
    addToast: toastSystem.addToast,
  });
  const sortedState = useSortedCategories({
    categories: masterLookups.categories,
    filterCategories: masterFilters.filterCategories,
    pendingMoves: pendingOps.pendingMoves,
    masterSections: masterList?.sections ?? [],
  });
  const categoryListRef = useRef<HTMLUListElement | null>(null);
  useCategoryListAnimation({
    containerRef: categoryListRef,
    dependencies: [sortedState.sortedCategories.map((category) => category.id).join('|')],
  });
  const applyState = useApplyOperations({
    masterList,
    pendingMoves: pendingOps.pendingMoves,
    setPendingMoves: pendingOps.setPendingMoves,
    pendingDeletes: pendingOps.pendingDeletes,
    setPendingDeletes: pendingOps.setPendingDeletes,
    fetchLists: masterData.fetchLists,
    addToast: toastSystem.addToast,
    showPendingOnly: masterFilters.showPendingOnly,
    setShowPendingOnly: masterFilters.setShowPendingOnly,
    syncMasterList: masterData.syncMasterList,
    onUnauthorized: auth.handleUnauthorized,
  });
  const categorySelection = useCategorySelection({
    allCategories: masterLookups.categories,
    sortedCategories: sortedState.sortedCategories,
    categoryNameLookup: masterLookups.categoryNameLookup,
    showCategorySelection: presentCategorySelection,
    isApplying: applyState.isApplying,
  });
  const pendingActionHandlers = usePendingActionHandlers({
    pendingMoves: pendingOps.pendingMoves,
    setPendingMoves: pendingOps.setPendingMoves,
    setPendingDeletes: pendingOps.setPendingDeletes,
    selectedCategoryId: categorySelection.selectedCategoryId,
    categoryNameLookup: masterLookups.categoryNameLookup,
    addToast: toastSystem.addToast,
    isApplying: applyState.isApplying,
  });
  const categoryReorder = useCategoryReordering({
    sortedCategoryList: sortedState.reorderableSections,
    onMasterListOptimisticUpdate: masterData.applyMasterListTransform,
    syncMasterList: masterData.syncMasterList,
    reloadMasterList: masterData.fetchLists,
    addToast: toastSystem.addToast,
    onUnauthorized: auth.handleUnauthorized,
  });
  const createCategoryModal = useCreateCategoryModal({
    addToast: toastSystem.addToast,
    fetchLists: masterData.fetchLists,
    onUnauthorized: auth.handleUnauthorized,
  });
  const renameModal = useRenameModal({
    addToast: toastSystem.addToast,
    onMasterListUpdate: masterData.syncMasterList,
    onUnauthorized: auth.handleUnauthorized,
  });
  const categoryDeletion = useCategoryDeletion({
    addToast: toastSystem.addToast,
    fetchLists: masterData.fetchLists,
    syncMasterList: masterData.syncMasterList,
    isApplying: applyState.isApplying,
    onUnauthorized: auth.handleUnauthorized,
  });
  function handleRenameCategoryCallback(categoryId: string, currentName: string): void {
    renameModal.openRename({ type: 'category', id: categoryId, currentName });
  }
  const handleRenameCategory = useCallback(handleRenameCategoryCallback, [renameModal.openRename]);

  function handleRenameItemCallback(itemId: string, currentName: string): void {
    renameModal.openRename({ type: 'item', id: itemId, currentName });
  }
  const handleRenameItem = useCallback(handleRenameItemCallback, [renameModal.openRename]);

  function handleDeleteCategoryCallback(categoryId: string, categoryName: string): void {
    categoryDeletion.deleteCategory(categoryId, categoryName);
  }
  const handleDeleteCategory = useCallback(handleDeleteCategoryCallback, [categoryDeletion.deleteCategory]);

  function handleToastLayerCategorySelectCallback(toast: CategorySelectionToast, index: number): void {
    categorySelection.handleCategoryToastSelect(
      { groupIds: toast.groupIds ?? undefined, keyLetter: toast.keyLetter, x: toast.x, y: toast.y },
      index
    );
  }
  const handleToastLayerCategorySelect = useCallback(handleToastLayerCategorySelectCallback, [
    categorySelection.handleCategoryToastSelect,
  ]);
  const masterUnavailable = !masterData.loading && !masterList;
  const totalItemCount = masterList?.itemCount ?? 0;
  const masterSectionsState = useMasterSections({
    sections: masterLookups.sections,
    filterCategories: masterFilters.filterCategories,
    showPendingOnly: masterFilters.showPendingOnly,
    pendingMoves: pendingOps.pendingMoves,
    pendingDeletes: pendingOps.pendingDeletes,
    totalItemCount,
  });
  const sidebarProps = createSidebarProps({
    loading: masterData.loading,
    categories: sortedState.sortedCategories,
    categoryColorMap: masterLookups.categoryColorMap,
    selectedCategoryId: categorySelection.selectedCategoryId,
    filterCategories: masterFilters.filterCategories,
    isApplying: applyState.isApplying,
    showPendingOnly: masterFilters.showPendingOnly,
    pendingMoves: pendingOps.pendingMoves,
    pendingDeletes: pendingOps.pendingDeletes,
    draggedCategoryId: categoryReorder.draggedCategoryId,
    dragOverCategoryId: categoryReorder.dragOverCategoryId,
    sidebarRef: categoryListRef,
    onToggleFilter: masterFilters.handleToggleCategoryFilter,
    onSelectCategory: categorySelection.handleSelectCategory,
    onClearFilters: masterFilters.handleClearAllFilters,
    onDragStart: categoryReorder.handleCategoryDragStart,
    onDragEnd: categoryReorder.handleCategoryDragEnd,
    onDragOver: categoryReorder.handleCategoryDragOver,
    onDrop: categoryReorder.handleCategoryDrop,
  });

  const toastHandlers = createToastHandlers({
    onDismiss: toastSystem.dismissToast,
    onCancelAutoDismiss: toastSystem.cancelAutoDismiss,
    onCategorySelect: handleToastLayerCategorySelect,
  });

  const applyModalProps = createApplyModalProps({
    open: applyState.applyModalOpen,
    isApplying: applyState.isApplying,
    pendingMoves: pendingOps.pendingMoves,
    pendingDeletes: pendingOps.pendingDeletes,
    steps: applyState.applySteps,
    onClose: applyState.handleCloseModal,
    onConfirm: applyState.handleConfirmApply,
    onRemoveStep: applyState.handleRemoveStep,
  });

  const renameModalProps = createRenameModalProps({
    open: renameModal.renameModalOpen,
    target: renameModal.renameTarget,
    value: renameModal.renameValue,
    isRenaming: renameModal.isRenaming,
    onChange: renameModal.setRenameValue,
    onCancel: renameModal.closeRename,
    onSubmit: renameModal.submitRename,
  });

  const createCategoryModalProps = createCreateCategoryModalProps({
    open: createCategoryModal.open,
    value: createCategoryModal.name,
    isCreating: createCategoryModal.isCreating,
    onChange: createCategoryModal.setName,
    onCancel: createCategoryModal.handleClose,
    onSubmit: createCategoryModal.handleSubmit,
  });

  function handleLogoutCallback(): void {
    void auth.logout();
  }
  const handleLogout = useCallback(handleLogoutCallback, [auth.logout]);

  if (auth.checking) {
    return <div className="auth-loading">Loading…</div>;
  }

  if (!auth.authenticated) {
    return <LoginView busy={auth.loggingIn} error={auth.error} onSubmit={auth.login} onClearError={auth.clearError} />;
  }

  return (
    <AppLayers
      toasts={toastSystem.toasts}
      toastHandlers={toastHandlers}
      applyModalProps={applyModalProps}
      renameModalProps={renameModalProps}
      createCategoryModalProps={createCategoryModalProps}>
      <main className="container">
        {navigation.view === 'master' ? (
          <MasterViewContainer
            title={masterList?.name || 'Master List'}
            itemCountText={masterSectionsState.itemCountText}
            loading={masterData.loading}
            isApplying={applyState.isApplying}
            showPendingOnly={masterFilters.showPendingOnly}
            pendingControlsDisabled={!pendingOps.hasPendingChanges}
            status={masterData.status}
            masterUnavailable={masterUnavailable}
            filterCategories={masterFilters.filterCategories}
            filteredSections={masterSectionsState.filteredSections}
            categoryColorMap={masterLookups.categoryColorMap}
            pendingMoves={pendingOps.pendingMoves}
            pendingDeletes={pendingOps.pendingDeletes}
            sidebarProps={sidebarProps}
            onTogglePendingFilter={masterFilters.handleTogglePendingFilter}
            onOpenCreateCategory={createCategoryModal.handleOpen}
            onNavigateHome={navigation.handleNavigateHome}
            onToggleMove={pendingActionHandlers.handleToggleMove}
            onToggleDelete={pendingActionHandlers.handleToggleDelete}
            onRenameCategory={handleRenameCategory}
            onRenameItem={handleRenameItem}
            onDeleteCategory={handleDeleteCategory}
          />
        ) : (
          <ListsView
            status={masterData.status}
            lists={lists}
            masterList={masterList}
            onManageMasterClick={navigation.handleNavigateToMaster}
            actions={{
              onLogout: handleLogout,
              disableLogout: auth.loggingIn || auth.checking || applyState.isApplying,
            }}
            email={auth.email}
          />
        )}
        {navigation.view === 'master' && pendingOps.hasPendingChanges && (
          <button
            type="button"
            className="apply-floating-btn"
            onClick={applyState.handleApply}
            disabled={applyState.isApplying}>
            {applyState.isApplying ? 'Applying…' : 'Apply changes'}
          </button>
        )}
      </main>
    </AppLayers>
  );
}

export default App;
