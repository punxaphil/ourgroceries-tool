import React from 'react';
import { ApplyStep } from '../types';

interface ApplyModalProps {
  open: boolean;
  isApplying: boolean;
  pendingMoveCount: number;
  pendingDeleteCount: number;
  steps: ApplyStep[];
  onClose: () => void;
  onConfirm: () => void;
  onRemoveStep: (step: ApplyStep) => void;
}

function statusLabel(step: ApplyStep): string {
  if (step.status === 'pending') return 'Pending';
  if (step.status === 'running') return 'In progress';
  if (step.status === 'success') return 'Done';
  const message = step.errorMessage ? `: ${step.errorMessage}` : '';
  return `Failed${message}`;
}

function summaryText(moveCount: number, deleteCount: number): string | null {
  if (moveCount === 0 && deleteCount === 0) return null;
  const moveSuffix = moveCount === 1 ? '' : 's';
  const deleteSuffix = deleteCount === 1 ? '' : 's';
  return `${moveCount} move${moveSuffix}, ${deleteCount} delete${deleteSuffix}`;
}

export function ApplyModal({
  open,
  isApplying,
  pendingMoveCount,
  pendingDeleteCount,
  steps,
  onClose,
  onConfirm,
  onRemoveStep,
}: ApplyModalProps): React.ReactElement | null {
  if (!open) return null;
  const summary = summaryText(pendingMoveCount, pendingDeleteCount);
  const showInitialActions = !isApplying && steps.every((step) => step.status === 'pending');
  const showCloseButton =
    (isApplying || steps.some((step) => step.status !== 'pending')) &&
    steps.every((step) => step.status === 'success' || step.status === 'error');

  return (
    <div className="apply-modal-backdrop">
      <div className="apply-modal">
        <h2>{isApplying ? 'Applying changes…' : 'Changes summary'}</h2>
        {!isApplying && summary && <div className="apply-summary-counts">{summary}</div>}
        <ul className="apply-progress-list">
          {steps.map((step) => (
            <li key={step.key} className={`status-${step.status}`}>
              <div className="apply-progress-content">
                <span className="apply-progress-text">
                  {step.type === 'move'
                    ? `Move "${step.itemName}" to ${step.targetCategoryName}`
                    : `Delete "${step.itemName}"`}
                </span>
                <span className="apply-status-label">{statusLabel(step)}</span>
              </div>
              {!isApplying && step.status === 'pending' && (
                <button
                  type="button"
                  className="remove-step-btn"
                  onClick={() => onRemoveStep(step)}
                  aria-label="Remove">
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="apply-modal-actions">
          {showInitialActions && (
            <>
              <button type="button" className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={onConfirm}>
                Confirm &amp; Apply
              </button>
            </>
          )}
          {showCloseButton && (
            <button type="button" className="primary-btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplyModal;
