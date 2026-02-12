import { useEffect, useState } from 'react';
import { X, RefreshCw, WifiOff } from 'lucide-react';

// Track open modals for Escape key handling
const openModals = new Set<string>();

export function registerModal(id: string) {
  openModals.add(id);
}

export function unregisterModal(id: string) {
  openModals.delete(id);
}

export function closeTopModal() {
  const modalArray = Array.from(openModals);
  if (modalArray.length > 0) {
    const topModal = modalArray[modalArray.length - 1];
    const event = new CustomEvent('close-modal', { detail: { id: topModal } });
    window.dispatchEvent(event);
  }
}

export function closeAllModals() {
  openModals.forEach(id => {
    const event = new CustomEvent('close-modal', { detail: { id } });
    window.dispatchEvent(event);
  });
  openModals.clear();
}

// Listen for global close-all-modals event
if (typeof window !== 'undefined') {
  window.addEventListener('close-all-modals', () => {
    closeAllModals();
  });
}

interface NetworkErrorDialogProps {
  error: Error & {
    isNetworkError?: boolean;
    isAuthError?: boolean;
    retryable?: boolean;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function NetworkErrorDialog({ error, onRetry, onDismiss }: NetworkErrorDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const modalId = useState(() => `network-error-${Math.random().toString(36).substring(2, 9)}`)[0];

  const isNetworkError = error.isNetworkError;
  const isAuthError = error.isAuthError;
  const canRetry = error.retryable || onRetry;

  // Register modal on mount
  useEffect(() => {
    registerModal(modalId);
    return () => unregisterModal(modalId);
  }, [modalId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals.has(modalId)) {
        // Only close if this is the top-most modal
        const modalArray = Array.from(openModals);
        if (modalArray[modalArray.length - 1] === modalId) {
          onDismiss?.();
        }
      }
    };

    const handleCloseModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id === modalId) {
        onDismiss?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('close-modal', handleCloseModal);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('close-modal', handleCloseModal);
    };
  }, [modalId, onDismiss]);

  // Don't show for auth errors (they're handled by redirect)
  if (isAuthError) {
    return null;
  }

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            {isNetworkError ? (
              <WifiOff className="w-6 h-6 text-red-600 dark:text-red-400" />
            ) : (
              <X className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {isNetworkError ? 'Network Error' : 'Error'}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {isNetworkError
            ? 'Unable to connect to server. Please check your internet connection and try again.'
            : error.message || 'An unexpected error occurred.'}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            disabled={isRetrying}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            Close
          </button>
          {canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to handle API errors with retry dialog
 */
export function useApiError() {
  const [error, setError] = useState<Error & { isNetworkError?: boolean; isAuthError?: boolean; retryable?: boolean } | null>(null);
  const [retryCallback, setRetryCallback] = useState<(() => Promise<void>) | null>(null);

  const showError = (err: any, retryFn?: () => Promise<void>) => {
    setError(err);
    setRetryCallback(retryFn || null);
  };

  const clearError = () => {
    setError(null);
    setRetryCallback(null);
  };

  const Dialog = error ? (
    <NetworkErrorDialog
      error={error}
      onRetry={retryCallback || undefined}
      onDismiss={clearError}
    />
  ) : null;

  return {
    showError,
    clearError,
    ErrorDialog: Dialog,
    hasError: !!error,
  };
}
