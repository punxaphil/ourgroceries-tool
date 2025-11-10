import React, { useState } from 'react';
import { FilterIcon as FilterIconComponent, DragHandleIcon as DragHandleIconComponent } from '../../icons';

type CategorySidebarEntry = { id: string; name: string };
type CategoryStatus = {
  isFiltered: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  showGapBefore: boolean;
  showGapAfter: boolean;
};

type CategorySidebarProps = {
  loading: boolean;
  categories: CategorySidebarEntry[];
  categoryColorMap: Record<string, string>;
  selectedCategoryId: string | null;
  filterCategories: Set<string>;
  isApplying: boolean;
  showPendingOnly: boolean;
  canReorderCategories: boolean;
  draggedCategoryId: string | null;
  dragOverCategoryId: string | null;
  sidebarRef: React.RefObject<HTMLUListElement>;
  onToggleFilter: (categoryId: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onClearFilters: () => void;
  onDragStart: (event: React.DragEvent<HTMLLIElement>, categoryId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLLIElement>, categoryId: string) => void;
  onDrop: (event: React.DragEvent<HTMLLIElement>, categoryId: string) => void;
};

const CategorySidebar = (props: CategorySidebarProps) => {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <aside className="category-sidebar">
      {renderHeaderSection(props, showHelp, setShowHelp)}
      <ul className="category-list" ref={props.sidebarRef}>
        {props.categories.map((category, index) => renderCategoryItem(props, category, index))}
      </ul>
    </aside>
  );
};

function renderHeaderSection(
  props: CategorySidebarProps,
  showHelp: boolean,
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (props.loading) return null;
  return (
    <>
      {renderTitleRow(showHelp, setShowHelp)}
      {showHelp && renderHelpText()}
      {props.showPendingOnly && renderPendingNotice()}
      {props.filterCategories.size > 0 && renderClearFiltersButton(props.onClearFilters)}
    </>
  );
}

function renderTitleRow(showHelp: boolean, setShowHelp: React.Dispatch<React.SetStateAction<boolean>>) {
  const label = showHelp ? 'Hide help' : 'Show help';
  const title = showHelp ? 'Hide help text' : 'Show help text';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <h3 style={{ margin: 0 }}>Select Target Category</h3>
      <button
        type="button"
        className="info-btn"
        aria-label={label}
        title={title}
        onClick={() => setShowHelp((value) => !value)}>
        ⓘ
      </button>
    </div>
  );
}

function renderHelpText() {
  return (
    <p className="category-sidebar-description">
      Click an item on the left, then click a category to tag it for moving. Use the filter icon to show only that
      category. Number + letter shortcuts select categories quickly.
    </p>
  );
}

function renderPendingNotice() {
  return (
    <p className="category-filters-disabled-notice">Filtering by category is disabled while showing pending changes</p>
  );
}

function renderClearFiltersButton(onClearFilters: () => void) {
  return (
    <button type="button" className="clear-filters-btn" onClick={onClearFilters}>
      Clear all filters
    </button>
  );
}

function renderCategoryItem(props: CategorySidebarProps, category: CategorySidebarEntry, index: number) {
  const status = buildStatus(props, category.id, index);
  return (
    <li
      key={category.id}
      className={buildClassName(status)}
      data-category-id={category.id}
      draggable={props.canReorderCategories}
      onDragStart={(event) => props.onDragStart(event, category.id)}
      onDragEnd={props.onDragEnd}
      onDragOver={(event) => props.onDragOver(event, category.id)}
      onDrop={(event) => props.onDrop(event, category.id)}>
      {renderDragHandle(props.canReorderCategories)}
      {renderCategoryChip(props, category)}
      {renderFilterButton(props, category.id, status.isFiltered)}
    </li>
  );
}

function buildStatus(props: CategorySidebarProps, categoryId: string, index: number): CategoryStatus {
  const isFiltered = props.filterCategories.has(categoryId);
  const isDragging = props.draggedCategoryId === categoryId;
  const isDragOver = props.dragOverCategoryId === categoryId && !isDragging;
  const draggedIndex = props.draggedCategoryId
    ? props.categories.findIndex((cat) => cat.id === props.draggedCategoryId)
    : -1;
  const showGapBefore = isDragOver && draggedIndex > index;
  const showGapAfter = isDragOver && draggedIndex >= 0 && draggedIndex < index;
  return { isFiltered, isDragging, isDragOver, showGapBefore, showGapAfter };
}

function buildClassName(status: CategoryStatus) {
  const names = ['category-list-item'];
  if (status.isFiltered) names.push('filtered');
  if (status.isDragging) names.push('dragging');
  if (status.isDragOver) names.push('drag-over');
  if (status.showGapBefore) names.push('gap-before');
  if (status.showGapAfter) names.push('gap-after');
  return names.join(' ');
}

function renderDragHandle(canReorderCategories: boolean) {
  return (
    <button
      type="button"
      className="drag-handle"
      aria-label="Drag to reorder"
      disabled={!canReorderCategories}
      tabIndex={-1}>
      <DragHandleIconComponent />
    </button>
  );
}

function renderCategoryChip(props: CategorySidebarProps, category: CategorySidebarEntry) {
  const color = props.categoryColorMap[category.id];
  const className = `category-chip${category.id === props.selectedCategoryId ? ' selected' : ''}`;
  return (
    <button
      type="button"
      className={className}
      style={color ? { backgroundColor: color } : undefined}
      onClick={() => props.onSelectCategory(category.id)}
      disabled={props.isApplying}>
      {category.name}
    </button>
  );
}

function renderFilterButton(props: CategorySidebarProps, categoryId: string, isFiltered: boolean) {
  const label = isFiltered ? 'Remove filter' : 'Filter by this category';
  const className = `category-filter-btn${isFiltered ? ' active' : ''}`;
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={(event) => handleFilterClick(event, props.onToggleFilter, categoryId)}
      disabled={props.isApplying || props.showPendingOnly}>
      <FilterIconComponent />
    </button>
  );
}

function handleFilterClick(
  event: React.MouseEvent<HTMLButtonElement>,
  toggle: (categoryId: string) => void,
  categoryId: string
) {
  event.stopPropagation();
  toggle(categoryId);
}

export default CategorySidebar;
