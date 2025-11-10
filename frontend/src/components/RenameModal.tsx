import React from 'react';
import { RenameTarget } from '../types';

interface RenameModalProps {
  open: boolean;
  target: RenameTarget | null;
  value: string;
  isRenaming: boolean;
  onChange: (nextValue: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const titleFor = (target: RenameTarget): string => (target.type === 'category' ? 'Rename Category' : 'Rename Item');

const submitLabel = (isRenaming: boolean): string => (isRenaming ? 'Renaming…' : 'Rename');

const isSubmitDisabled = (value: string, target: RenameTarget, isRenaming: boolean): boolean => {
  const trimmed = value.trim();
  if (isRenaming) return true;
  if (trimmed.length === 0) return true;
  return trimmed === target.currentName;
};

export function RenameModal({
  open,
  target,
  value,
  isRenaming,
  onChange,
  onCancel,
  onSubmit,
}: RenameModalProps): React.ReactElement | null {
  if (!open || !target) return null;
  const disabled = isSubmitDisabled(value, target, isRenaming);
  return (
    <div className="apply-modal-backdrop">
      <div className="rename-modal">
        <h2>{titleFor(target)}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) onSubmit();
          }}>
          <div className="rename-form-group">
            <label htmlFor="rename-input">New name:</label>
            <input
              id="rename-input"
              type="text"
              className="rename-input"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              autoFocus
              required
              disabled={isRenaming}
            />
          </div>
          <div className="rename-modal-actions">
            <button type="button" className="secondary-btn" onClick={onCancel} disabled={isRenaming}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={disabled}>
              {submitLabel(isRenaming)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RenameModal;
