import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast, Toast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const toastIcons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
};

const toastStyles = {
  success: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onMouseEnter={() => setHoveredId(toast.id)}
          onMouseLeave={() => setHoveredId(null)}
          className={clsx(
            'pointer-events-auto min-w-[320px] max-w-md',
            'border-l-4 rounded-lg shadow-lg p-4',
            'flex items-start gap-3',
            'transform transition-all duration-300 ease-out',
            'animate-slide-in-right',
            toastStyles[toast.type]
          )}
          role="alert"
          aria-label={`${toast.type}: ${toast.message}`}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {toastIcons[toast.type]}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
              {toast.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Hook for easy toast usage in components
export function useToastNotification() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
  };
}
