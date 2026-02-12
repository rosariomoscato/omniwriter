import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, X, BookOpen, FileText, Newspaper } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { apiService, Project } from '../services/api';

type FilterArea = 'all' | 'romanziere' | 'saggista' | 'redattore';
type FilterStatus = 'all' | 'draft' | 'in_progress' | 'completed' | 'archived';
type SortOption = 'recent' | 'alphabetical' | 'oldest';

interface FilterState {
  area: FilterArea;
  status: FilterStatus;
  search: string;
  sort: SortOption;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state - sync with URL params
  const [filters, setFilters] = useState<FilterState>(() => {
    // Try to restore from sessionStorage first (for navigation back)
    const stored = sessionStorage.getItem('dashboardFilters');
    if (stored) {
      try {
        const saved = JSON.parse(stored) as FilterState;
        // Clear from sessionStorage so it doesn't persist across refresh
        sessionStorage.removeItem('dashboardFilters');
        return saved;
      } catch {
        // Fall through to URL params
      }
    }

    // Otherwise use URL params
    return {
      area: (searchParams.get('area') as FilterArea) || 'all',
      status: (searchParams.get('status') as FilterStatus) || 'all',
      search: searchParams.get('search') || '',
      sort: (searchParams.get('sort') as SortOption) || 'recent',
    };
  });

  const [showFilters, setShowFilters] = useState(false);

  // Load projects with filters
  useEffect(() => {
    loadProjects();
  }, [filters]);

  // Load projects function
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        area?: string;
        status?: string;
        search?: string;
        sort?: string;
      } = {};

      if (filters.area !== 'all') {
        params.area = filters.area;
      }
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.sort !== 'recent') {
        params.sort = filters.sort;
      }

      const response = await apiService.getProjects(params);
      setProjects(response.projects);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update URL when filters change (for persistence)
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    // Update URL params for persistence
    const params: Record<string, string> = {};
    if (updated.area !== 'all') params.area = updated.area;
    if (updated.status !== 'all') params.status = updated.status;
    if (updated.search) params.search = updated.search;
    if (updated.sort !== 'recent') params.sort = updated.sort;

    setSearchParams(params);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      area: 'all',
      status: 'all',
      search: '',
      sort: 'recent',
    };
    setFilters(defaultFilters);
    setSearchParams({});
  };

  const hasActiveFilters = filters.area !== 'all' || filters.status !== 'all' || filters.search;

  const getAreaIcon = (area: string) => {
    switch (area) {
      case 'romanziere':
        return <BookOpen className="w-5 h-5" />;
      case 'saggista':
        return <FileText className="w-5 h-5" />;
      case 'redattore':
        return <Newspaper className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getAreaColor = (area: string) => {
    switch (area) {
      case 'romanziere':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'saggista':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      case 'redattore':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'romanziere':
        return 'Romanziere';
      case 'saggista':
        return 'Saggista';
      case 'redattore':
        return 'Redattore';
      default:
        return area;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Bozza';
      case 'in_progress':
        return 'In corso';
      case 'completed':
        return 'Completato';
      case 'archived':
        return 'Archiviato';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Oggi';
    } else if (diffDays === 1) {
      return 'Ieri';
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else {
      return date.toLocaleDateString('it-IT');
    }
  };

  return (
    <div className="p-6">
      <Breadcrumbs />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bentornato! Ecco una panoramica dei tuoi progetti.
        </p>
      </div>

      {/* Quick Create Button */}
      <Link
        to="/projects/new"
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium mb-6 w-fit"
      >
        <Plus size={20} />
        {t('dashboard.createProject')}
      </Link>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cerca progetti..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            <Filter size={18} />
            Filtri
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary-600 rounded-full" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <X size={18} />
              Cancella filtri
            </button>
          )}

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500"
          >
            <option value="recent">Più recenti</option>
            <option value="oldest">Più vecchi</option>
            <option value="alphabetical">Alfabetico</option>
          </select>

          {/* Results count */}
          <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
            {projects.length} {projects.length === 1 ? 'progetto' : 'progetti'}
          </span>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            {/* Area Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Area
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tutte' },
                  { value: 'romanziere', label: 'Romanziere' },
                  { value: 'saggista', label: 'Saggista' },
                  { value: 'redattore', label: 'Redattore' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFilters({ area: option.value as FilterArea })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filters.area === option.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stato
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tutti' },
                  { value: 'draft', label: 'Bozza' },
                  { value: 'in_progress', label: 'In corso' },
                  { value: 'completed', label: 'Completato' },
                  { value: 'archived', label: 'Archiviato' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFilters({ status: option.value as FilterStatus })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filters.status === option.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento progetti...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {hasActiveFilters ? 'Nessun progetto trovato' : 'Nessun progetto'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {hasActiveFilters
              ? 'Prova a cambiare i filtri di ricerca'
              : 'Crea il tuo primo progetto per iniziare'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Cancella filtri
            </button>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              onClick={() => {
                // Store filters in sessionStorage before navigating
                sessionStorage.setItem('dashboardFilters', JSON.stringify(filters));
              }}
              className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="p-5">
                {/* Area Badge */}
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getAreaColor(
                      project.area
                    )}`}
                  >
                    {getAreaIcon(project.area)}
                    {getAreaLabel(project.area)}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {getStatusLabel(project.status)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                  {project.title}
                </h3>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Genre */}
                {project.genre && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                    <span className="font-medium">Genere:</span> {project.genre}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span>Aggiornato {formatDate(project.updated_at)}</span>
                  {project.word_count > 0 && (
                    <span>{project.word_count.toLocaleString()} parole</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
