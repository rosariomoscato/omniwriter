import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <Breadcrumbs />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back! Here's an overview of your projects.
        </p>
      </div>

      {/* Quick Create Button */}
      <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium mb-8">
        <Plus size={20} />
        {t('dashboard.createProject')}
      </button>

      {/* Empty State */}
      <div className="text-center py-16">
        <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
          {t('dashboard.noProjects')}
        </h3>
      </div>
    </div>
  );
}
