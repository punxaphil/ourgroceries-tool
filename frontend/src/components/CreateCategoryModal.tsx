import React from 'react';

interface CreateCategoryModalProps {
  open: boolean;
  value: string;
  isCreating: boolean;
  onChange: (nextValue: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const isSubmitDisabled = (value: string, isCreating: boolean): boolean => {
  if (isCreating) return true;
  return value.trim().length === 0;
};

const submitLabel = (isCreating: boolean): string => (isCreating ? 'Creating…' : 'Create');

export default function CreateCategoryModal({
  open,
  value,
  isCreating,
  onChange,
  onCancel,
  onSubmit,
}: CreateCategoryModalProps): React.ReactElement | null {
  if (!open) return null;
  const disabled = isSubmitDisabled(value, isCreating);
  return (
    <div className="apply-modal-backdrop">
      <div className="rename-modal">
        <h2>Create Category</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) onSubmit();
          }}>
          <div className="rename-form-group">
            <label htmlFor="create-category-input">Category name:</label>
            <input
              id="create-category-input"
              type="text"
              className="rename-input"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              autoFocus
              required
              disabled={isCreating}
            />
          </div>
          <div className="rename-modal-actions">
            <button type="button" className="secondary-btn" onClick={onCancel} disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={disabled}>
              {submitLabel(isCreating)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
