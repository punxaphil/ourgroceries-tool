import React from 'react';
import CategoryBlock from './master/CategoryBlock';

type Item = {
  id: string;
  name: string;
  categoryId?: string | null;
};

type Section = {
  id: string;
  name: string;
  items: Item[];
};

type PendingMove = {
  itemId: string;
  targetCategoryId: string;
  targetCategoryName: string;
};

type PendingDelete = {
  itemId: string;
};

type MasterContentProps = {
  loading: boolean;
  masterUnavailable: boolean;
  filteredSections: Section[];
  filterActive: boolean;
  showPendingOnly: boolean;
  status: string | null;
  isApplying: boolean;
  categoryColorMap: Record<string, string>;
  pendingMoves: Record<string, PendingMove>;
  pendingDeletes: Record<string, PendingDelete>;
  onToggleMove: (item: Item) => void;
  onToggleDelete: (item: Item) => void;
  onRenameCategory: (categoryId: string, currentName: string) => void;
  onRenameItem: (itemId: string, currentName: string) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
};

const renderStatus = (message: string) => <p className="status">{message}</p>;

function getEmptyMessage(props: MasterContentProps) {
  if (props.showPendingOnly) return 'No items selected for move or deletion.';
  if (props.filterActive) return 'No items match the selected filters.';
  return 'No items in master list.';
}

function renderSections(props: MasterContentProps) {
  return props.filteredSections.map((section) => (
    <CategoryBlock
      key={section.id || section.name}
      section={section}
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
  ));
}

const MasterContent = (props: MasterContentProps) => {
  if (props.loading) return renderStatus('Loading master list…');
  if (props.masterUnavailable) return renderStatus(props.status || 'Master list unavailable.');
  if (props.filteredSections.length === 0) return renderStatus(getEmptyMessage(props));
  return <>{renderSections(props)}</>;
};

export default MasterContent;
