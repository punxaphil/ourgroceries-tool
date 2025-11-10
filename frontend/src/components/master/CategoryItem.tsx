import React, { KeyboardEvent } from 'react';
import { PenIcon as PenIconComponent, TrashIcon as TrashIconComponent } from '../../icons';

type Item = {
  id: string;
  name: string;
  categoryId?: string | null;
};

type PendingMove = {
  itemId: string;
  targetCategoryId: string;
  targetCategoryName: string;
};

type CategoryItemProps = {
  item: Item;
  pendingMove?: PendingMove;
  pendingDelete?: boolean;
  moveColor?: string;
  isApplying: boolean;
  onToggleMove: (item: Item) => void;
  onToggleDelete: (item: Item) => void;
  onRename: (itemId: string, itemName: string) => void;
};

type PendingStyle = React.CSSProperties & { '--pending-color': string };

const CategoryItem = (props: CategoryItemProps) => {
  const { pendingMove, pendingDelete, moveColor } = props;
  const className = getClassName(pendingMove, pendingDelete);
  const style = pendingMove ? getPendingStyle(moveColor) : undefined;
  return (
    <li
      className={className}
      style={style}
      onClick={() => handleToggle(props)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => handleKey(event, props)}>
      {renderMain(props)}
      {renderRenameButton(props)}
      {renderDeleteButton(props)}
    </li>
  );
};

function getClassName(pendingMove?: PendingMove, pendingDelete?: boolean) {
  const names = ['category-item'];
  if (pendingMove) names.push('pending-move');
  if (pendingDelete) names.push('pending-delete');
  return names.join(' ');
}

function getPendingStyle(color?: string): PendingStyle | undefined {
  if (!color) return undefined;
  return { '--pending-color': color } as PendingStyle;
}

function handleToggle(props: CategoryItemProps) {
  if (props.isApplying) return;
  props.onToggleMove(props.item);
}

function handleKey(event: KeyboardEvent<HTMLLIElement>, props: CategoryItemProps) {
  if (props.isApplying) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    props.onToggleMove(props.item);
  }
}

function renderMain(props: CategoryItemProps) {
  const { item, pendingMove, pendingDelete, moveColor, isApplying } = props;
  return (
    <div className="item-main" aria-disabled={isApplying ? 'true' : 'false'}>
      <span className="item-name">{item.name}</span>
      {renderMoveTag(pendingMove, moveColor)}
      {pendingDelete && <span className="item-tag delete">Delete</span>}
    </div>
  );
}

function renderRenameButton(props: CategoryItemProps) {
  const { item, isApplying, onRename } = props;
  return (
    <button
      type="button"
      className="item-rename"
      aria-label="Rename item"
      onClick={(event) => handleRename(event, onRename, item)}
      disabled={isApplying}>
      <PenIconComponent />
    </button>
  );
}

function renderDeleteButton(props: CategoryItemProps) {
  const { item, pendingDelete, isApplying, onToggleDelete } = props;
  const label = pendingDelete ? 'Undo delete' : 'Mark for deletion';
  return (
    <button
      type="button"
      className="item-trash"
      aria-label={label}
      onClick={(event) => handleDelete(event, onToggleDelete, item)}
      disabled={isApplying}>
      <TrashIconComponent />
    </button>
  );
}

function handleRename(event: React.MouseEvent<HTMLButtonElement>, onRename: CategoryItemProps['onRename'], item: Item) {
  event.stopPropagation();
  onRename(item.id, item.name);
}

function handleDelete(
  event: React.MouseEvent<HTMLButtonElement>,
  onToggleDelete: CategoryItemProps['onToggleDelete'],
  item: Item
) {
  event.stopPropagation();
  onToggleDelete(item);
}

function renderMoveTag(pendingMove?: PendingMove, moveColor?: string) {
  if (!pendingMove) return null;
  return (
    <span className="item-tag" style={{ backgroundColor: moveColor || '#e5e7eb' }}>
      {`Move to ${pendingMove.targetCategoryName}`}
    </span>
  );
}

export default CategoryItem;
