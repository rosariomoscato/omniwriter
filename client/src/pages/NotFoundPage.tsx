import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  /**
   * Whether this page is rendered within the main app layout (with sidebar/header)
   * or standalone (for public routes)
   */
  isInLayout?: boolean;
}

/**
 * 404 Not Found Page
 * Displays when a user navigates to a non-existent route.
 * Provides navigation options back to known locations.
 */
export default function NotFoundPage({ isInLayout = false }: NotFoundPageProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Go back in history if possible, otherwise go to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Large Text */}
        <div className="mb-4">
          <h1 className="text-9xl font-bold text-primary-600 dark:text-primary-400">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Pagina non trovata
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
        </div>

        {/* Navigation Options */}
        <div className="space-y-3">
          {/* Go Back Button */}
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-2 px-6 py-3
              bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600
              rounded-lg text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-dark-card
              transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Torna indietro</span>
          </button>

          {/* Dashboard Link (only for authenticated users in layout) */}
          {isInLayout && (
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 px-6 py-3
                bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600
                text-white rounded-lg
                transition-colors duration-200"
            >
              <Home className="w-5 h-5" />
              <span>Vai alla Dashboard</span>
            </Link>
          )}

          {/* Home Link (for public routes) */}
          {!isInLayout && (
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 px-6 py-3
                bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600
                text-white rounded-lg
                transition-colors duration-200"
            >
              <Home className="w-5 h-5" />
              <span>Vai alla Home</span>
            </Link>
          )}
        </div>

        {/* Additional Help Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Hai bisogno di aiuto?{' '}
            {isInLayout ? (
              <Link to="/settings" className="text-primary-600 dark:text-primary-400 hover:underline">
                Vai alle Impostazioni
              </Link>
            ) : (
              <a href="mailto:support@omniwriter.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                Contatta il supporto
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
