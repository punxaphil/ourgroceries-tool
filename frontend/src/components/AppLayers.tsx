import React from 'react';
import ApplyModal from './ApplyModal';
import CreateCategoryModal from './CreateCategoryModal';
import RenameModal from './RenameModal';
import ToastLayer from './ToastLayer';
import { Toast, CategorySelectionToast } from '../types';

type ToastHandlers = {
  onDismiss: (id: string) => void;
  onCancelAutoDismiss: (id: string) => void;
  onCategorySelect: (toast: CategorySelectionToast, index: number) => void;
};

type AppLayersProps = {
  toasts: Toast[];
  toastHandlers: ToastHandlers;
  applyModalProps: React.ComponentProps<typeof ApplyModal>;
  renameModalProps: React.ComponentProps<typeof RenameModal>;
  createCategoryModalProps: React.ComponentProps<typeof CreateCategoryModal>;
  children: React.ReactNode;
};

const AppLayers = (props: AppLayersProps) => (
  <>
    <ToastLayer
      toasts={props.toasts}
      onDismiss={props.toastHandlers.onDismiss}
      onCancelAutoDismiss={props.toastHandlers.onCancelAutoDismiss}
      onCategorySelect={props.toastHandlers.onCategorySelect}
    />
    <ApplyModal {...props.applyModalProps} />
    <RenameModal {...props.renameModalProps} />
    <CreateCategoryModal {...props.createCategoryModalProps} />
    {props.children}
  </>
);

export default AppLayers;
