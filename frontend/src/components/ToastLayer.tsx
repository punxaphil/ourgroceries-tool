import React from 'react';
import { CategorySelectionToast, Toast, ToastId } from '../types';

type ToastLayerProps = {
  toasts: Toast[];
  onDismiss: (id: ToastId) => void;
  onCancelAutoDismiss: (id: ToastId) => void;
  onCategorySelect: (toast: CategorySelectionToast, index: number) => void;
};

const ToastLayer = ({ toasts, onDismiss, onCancelAutoDismiss, onCategorySelect }: ToastLayerProps) => {
  if (toasts.length === 0) return null;
  return (
    <>
      {toasts.map((toast) =>
        toast.type === 'category-selection' ? (
          <CategorySelectionToastView
            key={toast.id}
            toast={toast}
            onCancelAutoDismiss={onCancelAutoDismiss}
            onDismiss={onDismiss}
            onCategorySelect={onCategorySelect}
          />
        ) : (
          <MessageToastView
            key={toast.id}
            toast={toast}
            onCancelAutoDismiss={onCancelAutoDismiss}
            onDismiss={onDismiss}
          />
        )
      )}
    </>
  );
};

type ViewProps<T extends Toast> = {
  toast: T;
  onDismiss: (id: ToastId) => void;
  onCancelAutoDismiss: (id: ToastId) => void;
};

const baseStyle = (toast: Toast) => ({
  position: 'fixed' as const,
  left: `${toast.x + 12}px`,
  top: `${toast.y + 12}px`,
  zIndex: 200,
  pointerEvents: 'auto' as const,
  transform: 'translate(-50%, 0)',
});

const MessageToastView = ({ toast, onDismiss, onCancelAutoDismiss }: ViewProps<Toast>) => (
  <div
    className="toast"
    style={baseStyle(toast)}
    onMouseEnter={() => toast.hoverCancelable && onCancelAutoDismiss(toast.id)}
    onMouseLeave={() => toast.hoverCancelable && onDismiss(toast.id)}>
    {'message' in toast ? toast.message : null}
  </div>
);

type CategoryProps = ViewProps<CategorySelectionToast> & {
  onCategorySelect: (toast: CategorySelectionToast, index: number) => void;
};

const CategorySelectionToastView = ({ toast, onCancelAutoDismiss, onDismiss, onCategorySelect }: CategoryProps) => (
  <div
    className="toast"
    style={baseStyle(toast)}
    onMouseEnter={() => onCancelAutoDismiss(toast.id)}
    onMouseLeave={() => onDismiss(toast.id)}>
    {toast.lines.map((line, index) => (
      <div
        key={index}
        style={
          index === toast.selectedIndex
            ? { fontWeight: 600, cursor: 'pointer' }
            : { color: '#9ca3af', fontSize: '0.85em', cursor: 'pointer' }
        }
        onClick={() => onCategorySelect(toast, index)}>
        {line}
      </div>
    ))}
  </div>
);

export default ToastLayer;
