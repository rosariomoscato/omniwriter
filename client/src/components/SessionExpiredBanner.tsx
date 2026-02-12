import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SessionExpiredBanner
 *
 * Shows a banner when the user's session has expired.
 * Displays after a redirect from an API call that failed with 401/403.
 */
export default function SessionExpiredBanner() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if session expired flag is set
    const sessionExpired = sessionStorage.getItem('sessionExpired');
    if (sessionExpired === 'true') {
      setShow(true);
      // Clear the flag so it doesn't show again
      sessionStorage.removeItem('sessionExpired');
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 dark:bg-amber-900 border-b border-amber-200 dark:border-amber-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Sessione scaduta
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              La tua sessione è scaduta. Accedi di nuovo per continuare.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          aria-label="Chiudi"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
