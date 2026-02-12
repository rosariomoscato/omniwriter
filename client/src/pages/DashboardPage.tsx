import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService, ApiService } from '../services/api';

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated
    const { user: storedUser, token } = ApiService.getAuth();
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    setUser(storedUser);

    // Verify token is still valid
    apiService.getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        ApiService.clearAuth();
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    apiService.logout().then(() => {
      ApiService.clearAuth();
      navigate('/');
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('common.loading') || 'Caricamento...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">OmniWriter</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {t('nav.logout') || 'Esci'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title') || 'Dashboard'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('dashboard.welcome') || `Benvenuto, ${user.name}!`}
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('dashboard.noProjects') || 'Non hai ancora nessun progetto.'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('dashboard.createFirst') || 'Inizia creando il tuo primo progetto.'}
          </p>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            {t('dashboard.createProject') || 'Nuovo progetto'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
