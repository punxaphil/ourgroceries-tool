import React from 'react';
import MasterView from './MasterView';
import MasterContent from './MasterContent';
import { NormalizedSection } from '../hooks/useMasterListLookups';
import { PendingMoveEntry, PendingDeleteEntry } from '../types';

type SidebarProps = React.ComponentProps<typeof MasterView>['sidebarProps'];
type Item = { id: string; name: string; categoryId?: string | null };

type MasterViewContainerProps = {
  title: string;
  itemCountText: string;
  loading: boolean;
  isApplying: boolean;
  showPendingOnly: boolean;
  pendingControlsDisabled: boolean;
  status: string | null;
  masterUnavailable: boolean;
  filterCategories: Set<string>;
  filteredSections: NormalizedSection[];
  categoryColorMap: Record<string, string>;
  pendingMoves: Record<string, PendingMoveEntry>;
  pendingDeletes: Record<string, PendingDeleteEntry>;
  sidebarProps: SidebarProps;
  onTogglePendingFilter: () => void;
  onOpenCreateCategory: () => void;
  onNavigateHome: () => void;
  onToggleMove: (item: Item) => void;
  onToggleDelete: (item: Item) => void;
  onRenameCategory: (categoryId: string, currentName: string) => void;
  onRenameItem: (itemId: string, currentName: string) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
};

const MasterViewContainer = (props: MasterViewContainerProps) => {
  const filterActive = props.filterCategories.size > 0;
  return (
    <MasterView
      title={props.title}
      itemCountText={props.itemCountText}
      loading={props.loading}
      isApplying={props.isApplying}
      showPendingOnly={props.showPendingOnly}
      pendingControlsDisabled={props.pendingControlsDisabled}
      onTogglePendingFilter={props.onTogglePendingFilter}
      onOpenCreateCategory={props.onOpenCreateCategory}
      onNavigateHome={props.onNavigateHome}
      sidebarProps={props.sidebarProps}>
      <MasterContent
        loading={props.loading}
        masterUnavailable={props.masterUnavailable}
        filteredSections={props.filteredSections}
        filterActive={filterActive}
        showPendingOnly={props.showPendingOnly}
        status={props.status}
        isApplying={props.isApplying}
        categoryColorMap={props.categoryColorMap}
        pendingMoves={props.pendingMoves}
        pendingDeletes={props.pendingDeletes}
        onToggleMove={props.onToggleMove}
        onToggleDelete={props.onToggleDelete}
        onRenameCategory={props.onRenameCategory}
        onRenameItem={props.onRenameItem}
        onDeleteCategory={props.onDeleteCategory}
      />
    </MasterView>
  );
};

export default MasterViewContainer;
