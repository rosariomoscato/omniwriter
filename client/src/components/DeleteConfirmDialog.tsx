import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useFocusTrapSimple } from '../hooks/useFocusTrap';
import { registerModal, unregisterModal } from './NetworkErrorDialog';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

/**
 * A reusable confirmation dialog for delete operations.
 * Supports both light and dark themes through Tailwind CSS classes.
 */
export default function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  confirmText,
  cancelText
}: DeleteConfirmDialogProps) {
  const modalId = useState(() => `delete-confirm-${Math.random().toString(36).substring(2, 9)}`)[0];
  const modalRef = useFocusTrapSimple(isOpen);

  // Register modal on mount
  useEffect(() => {
    if (isOpen) {
      registerModal(modalId);
    }
    return () => {
      if (isOpen) {
        unregisterModal(modalId);
      }
    };
  }, [modalId, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3
              id="delete-dialog-title"
              className="font-semibold text-lg text-gray-900 dark:text-gray-100"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Description */}
        <p
          id="delete-dialog-description"
          className="text-sm text-gray-600 dark:text-gray-400 mb-2"
        >
          {message}
        </p>

        {itemName && (
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-6 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
            {itemName}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {confirmText || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
