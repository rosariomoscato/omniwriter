import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000): string => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => {
      // Keep only the 3 most recent toasts
      const filtered = prev.length >= 3 ? prev.slice(-3) : prev;
      return [...filtered, newToast];
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  // Escape key to dismiss all toasts
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToasts([]);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, showSuccess, showError, showInfo, showWarning, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
