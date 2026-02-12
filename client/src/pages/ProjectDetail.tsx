import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

export default function ProjectDetail() {
  const { id } = useParams();

  return (
    <div className="p-6">
      <Breadcrumbs />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Progetto Dettaglio
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Project ID: {id}
        </p>
      </div>

      {/* Project Content */}
      <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          Project workspace will be implemented here.
        </p>
      </div>
    </div>
  );
}
