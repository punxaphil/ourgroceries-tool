import React from 'react';
import { PenIcon as PenIconComponent, TrashIcon as TrashIconComponent } from '../../icons';
import { UNCATEGORIZED_ID } from '../../utils/appUtils';
import CategoryItem from './CategoryItem';

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

type CategoryBlockProps = {
  section: Section;
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

const CategoryBlock = (props: CategoryBlockProps) => {
  return (
    <div className="category-block" key={props.section.id || props.section.name}>
      {renderHeader(props)}
      <ul className="category-items">{renderItems(props)}</ul>
    </div>
  );
};

function renderHeader(props: CategoryBlockProps) {
  const { section } = props;
  return (
    <h2 className="category-header">
      <span className="category-name">{section.name}</span>
      {renderRenameCategoryButton(props)}
      {renderDeleteCategoryButton(props)}
    </h2>
  );
}

function renderRenameCategoryButton({ section, isApplying, onRenameCategory }: CategoryBlockProps) {
  return (
    <button
      type="button"
      className="category-rename-btn"
      aria-label="Rename category"
      onClick={(event) => {
        event.stopPropagation();
        onRenameCategory(section.id, section.name);
      }}
      disabled={isApplying}>
      <PenIconComponent />
    </button>
  );
}

function renderDeleteCategoryButton({ section, isApplying, onDeleteCategory }: CategoryBlockProps) {
  if (section.id === UNCATEGORIZED_ID) return null;
  return (
    <button
      type="button"
      className="category-delete-btn"
      aria-label="Delete category"
      onClick={(event) => {
        event.stopPropagation();
        onDeleteCategory(section.id, section.name);
      }}
      disabled={isApplying}>
      <TrashIconComponent />
    </button>
  );
}

function renderItems(props: CategoryBlockProps) {
  return props.section.items.map((item) => renderItem(props, item));
}

function renderItem(props: CategoryBlockProps, item: Item) {
  const move = props.pendingMoves[item.id];
  const moveColor = move ? props.categoryColorMap[move.targetCategoryId] : undefined;
  return (
    <CategoryItem
      key={item.id || item.name}
      item={item}
      pendingMove={move}
      pendingDelete={Boolean(props.pendingDeletes[item.id])}
      moveColor={moveColor}
      isApplying={props.isApplying}
      onToggleMove={props.onToggleMove}
      onToggleDelete={props.onToggleDelete}
      onRename={props.onRenameItem}
    />
  );
}

export default CategoryBlock;
