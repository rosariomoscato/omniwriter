import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, X, BookOpen, FileText, Newspaper, Upload, FileUp, Tag, Tag as TagIcon, Settings, Share2 } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { apiService, Project } from '../services/api';
import { useToastNotification } from '../components/Toast';
import OnboardingGuide from '../components/OnboardingGuide';
import DashboardLayoutSettings, { DashboardLayout } from '../components/DashboardLayoutSettings';
import { ProjectCardSkeleton } from '../components/Skeleton';

type FilterArea = 'all' | 'romanziere' | 'saggista' | 'redattore';
type FilterStatus = 'all' | 'draft' | 'in_progress' | 'completed' | 'archived';
type SortOption = 'recent' | 'alphabetical' | 'oldest';

interface FilterState {
  area: FilterArea;
  status: FilterStatus;
  search: string;
  sort: SortOption;
  tag: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToastNotification();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Abort controller ref for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    // Reset to page 1 if just created a project
    const justCreated = sessionStorage.getItem('justCreatedProject');
    if (justCreated === 'true') {
      sessionStorage.removeItem('justCreatedProject');
      return 1;
    }
    return 1;
  });
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null>(null);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importArea, setImportArea] = useState<'romanziere' | 'saggista' | 'redattore'>('romanziere');
  const [importGenre, setImportGenre] = useState('');
  const [importDescription, setImportDescription] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag editing state
  const [editingTagsProjectId, setEditingTagsProjectId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagInputProjectId, setTagInputProjectId] = useState<string | null>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Layout customization state
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>({
    viewMode: 'grid',
    cardSize: 'medium',
    showMetadata: true,
    showWordCount: true,
    showLastModified: true,
  });

  // Check if user has seen onboarding
  useEffect(() => {
    const seen = localStorage.getItem('hasSeenOnboarding');
    setHasSeenOnboarding(!!seen);
  }, []);

  // Load dashboard layout preferences
  useEffect(() => {
    const loadLayoutPreferences = async () => {
      try {
        const response = await apiService.getUserPreferences();
        if (response.preferences?.dashboard_layout_json) {
          const savedLayout = JSON.parse(response.preferences.dashboard_layout_json) as DashboardLayout;
          setDashboardLayout(savedLayout);
        }
      } catch (error) {
        console.error('Failed to load layout preferences:', error);
      }
    };
    loadLayoutPreferences();
  }, []);

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
      tag: searchParams.get('tag') || '',
    };
  });

  const [showFilters, setShowFilters] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Calculate if filters are active
  const hasActiveFilters = useMemo(
    () => filters.area !== 'all' || filters.status !== 'all' || filters.search || filters.tag,
    [filters]
  );

  // Show onboarding for new users (no projects and hasn't seen guide)
  useEffect(() => {
    if (!loading && projects.length === 0 && !hasSeenOnboarding && !hasActiveFilters) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [loading, projects.length, hasSeenOnboarding, hasActiveFilters]);

  // Listen for import modal open event
  useEffect(() => {
    const handleOpenImportModal = () => {
      openImportModal();
    };

    window.addEventListener('open-import-modal', handleOpenImportModal);
    return () => {
      window.removeEventListener('open-import-modal', handleOpenImportModal);
    };
  }, []);

  // Load projects with filters
  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    loadProjects();
  }, [filters]);

  // Reload when page changes
  useEffect(() => {
    loadProjects();
  }, [currentPage]);

  // Cleanup on unmount - abort any pending requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load projects function
  const loadProjects = async () => {
    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);

      const params: {
        area?: string;
        status?: string;
        search?: string;
        sort?: string;
        tag?: string;
        page?: number;
        limit?: number;
      } = {
        page: currentPage,
        limit: 20 // Default to 20 projects per page for performance
      };

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
      if (filters.tag) {
        params.tag = filters.tag;
      }

      const response = await apiService.getProjects(params, abortController.signal);
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setProjects(response.projects);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      // Don't update state if request was aborted due to navigation
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      // Only update error state if component is still mounted
      if (!abortController.signal.aborted) {
        setError(err.message || 'Failed to load projects');
        console.error('Dashboard error:', err);
      }
    } finally {
      // Only clear loading if request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Update URL when filters change (for persistence)
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };

    // Sanitize search input: trim and limit length
    if (updated.search !== undefined) {
      updated.search = updated.search.trim().slice(0, 500); // Limit to 500 chars
    }

    // Sanitize tag input
    if (updated.tag !== undefined) {
      updated.tag = updated.tag.trim().slice(0, 50);
    }

    setFilters(updated);

    // Update URL params for persistence
    const params: Record<string, string> = {};
    if (updated.area !== 'all') params.area = updated.area;
    if (updated.status !== 'all') params.status = updated.status;
    if (updated.search) params.search = updated.search;
    if (updated.sort !== 'recent') params.sort = updated.sort;
    if (updated.tag) params.tag = updated.tag;

    setSearchParams(params);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      area: 'all',
      status: 'all',
      search: '',
      sort: 'recent',
      tag: '',
    };
    setFilters(defaultFilters);
    setSearchParams({});
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success('URL copiato negli appunti!');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      toast.error('Impossibile copiare l\'URL');
    }
  };

  // Import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validExtensions = ['.txt', '.docx', '.doc'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(fileExtension)) {
        setImportError('Solo file DOCX, DOC e TXT sono consentiti');
        setImportFile(null);
        return;
      }
      setImportFile(file);
      setImportError(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Seleziona un file da importare');
      return;
    }

    try {
      setImportLoading(true);
      setImportError(null);

      const result = await apiService.importProject(importFile, {
        area: importArea,
        genre: importGenre,
        description: importDescription,
      });

      // Close modal and reset form
      setShowImportModal(false);
      setImportFile(null);
      setImportGenre('');
      setImportDescription('');

      // Reset pagination to page 1 to show the newly imported project
      setCurrentPage(1);
      // Reload projects to show the imported one
      await loadProjects();

      // Show success toast with rename info if applicable
      if (result.renamed) {
        toast.success(`Progetto importato come "${result.finalTitle}" (esisteva già un progetto con questo nome) - ${result.chaptersCreated} capitoli creati`);
      } else {
        toast.success(`Progetto importato con successo! ${result.chaptersCreated} capitoli creati, ${result.totalWordCount} parole totali`);
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import project');
      toast.error(err.message || 'Failed to import project');
    } finally {
      setImportLoading(false);
    }
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setImportFile(null);
    setImportGenre('');
    setImportDescription('');
    setImportError(null);
  };

  // Tag handlers
  const handleAddTag = async (projectId: string, tagName: string) => {
    if (!tagName.trim()) return;

    try {
      await apiService.addProjectTag(projectId, tagName.trim());
      // Reload projects to get updated tags
      loadProjects();
      toast.success('Tag aggiunto con successo');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (projectId: string, tagName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiService.removeProjectTag(projectId, tagName);
      // Reload projects to get updated tags
      loadProjects();
      toast.success('Tag rimosso con successo');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove tag');
    }
  };

  const handleTagFilterClick = (tagName: string) => {
    if (filters.tag === tagName) {
      // Toggle off if clicking the same tag
      updateFilters({ tag: '' });
    } else {
      updateFilters({ tag: tagName });
    }
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    projects.forEach(p => {
      p.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

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
      <div className="flex gap-3 mb-6">
        <Link
          to="/projects/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Plus size={20} />
          {t('dashboard.createProject')}
        </Link>
        <button
          onClick={openImportModal}
          className="flex items-center gap-2 px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors font-medium"
        >
          <Upload size={20} />
          Importa progetto
        </button>
        <button
          onClick={() => setShowLayoutSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium"
          title="Personalizza dashboard"
        >
          <Settings size={20} />
          Personalizza
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Importa progetto
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seleziona file *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.docx,.doc"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Formati supportati: TXT, DOCX, DOC (max 10MB)
                </p>
              </div>

              {/* Area selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Area *
                </label>
                <select
                  value={importArea}
                  onChange={(e) => setImportArea(e.target.value as 'romanziere' | 'saggista' | 'redattore')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="romanziere">Romanziere</option>
                  <option value="saggista">Saggista</option>
                  <option value="redattore">Redattore</option>
                </select>
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genere (opzionale)
                </label>
                <input
                  type="text"
                  value={importGenre}
                  onChange={(e) => setImportGenre(e.target.value)}
                  placeholder="es. Fantasy, Thriller, Saggio storico"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  placeholder="Breve descrizione del progetto..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Error message */}
              {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{importError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleImport}
                  disabled={importLoading || !importFile}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importazione...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Importa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Settings Modal */}
      <DashboardLayoutSettings
        isOpen={showLayoutSettings}
        onClose={() => setShowLayoutSettings(false)}
        onApply={(layout) => setDashboardLayout(layout)}
        currentLayout={dashboardLayout}
      />

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

          {/* Copy URL Button - always visible to share current view */}
          <button
            onClick={handleCopyUrl}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              copiedUrl
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            title={copiedUrl ? 'Copiato!' : 'Copia URL con filtri'}
          >
            <Share2 size={18} />
            {copiedUrl ? 'Copiato!' : 'Copia URL'}
          </button>

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

            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tag
              </label>
              <div className="flex flex-wrap gap-2">
                {getAllTags().length > 0 ? (
                  <>
                    <button
                      onClick={() => updateFilters({ tag: '' })}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        !filters.tag
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      Tutti
                    </button>
                    {getAllTags().map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagFilterClick(tag)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          filters.tag === tag
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <TagIcon size={14} className="inline mr-1" />
                        {tag}
                      </button>
                    ))}
                  </>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Nessun tag disponibile
                  </span>
                )}
              </div>
              {filters.tag && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Filtrando per tag: <strong>{filters.tag}</strong>
                  </span>
                  <button
                    onClick={() => updateFilters({ tag: '' })}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Cancella
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading State - Skeleton Screens */}
      {loading && <ProjectCardSkeleton count={6} />}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <>
          {/* Onboarding Guide for new users */}
          {showOnboarding && !hasActiveFilters && (
            <OnboardingGuide
              onClose={() => {
                setShowOnboarding(false);
                localStorage.setItem('hasSeenOnboarding', 'true');
                setHasSeenOnboarding(true);
              }}
            />
          )}

          {/* Empty state message */}
          <div className="text-center py-16">
            <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {hasActiveFilters
                ? (filters.search ? 'Nessun risultato di ricerca' : 'Nessun progetto trovato')
                : 'Nessun progetto'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {hasActiveFilters
                ? (filters.search
                    ? `Nessun progetto corrisponde a "${filters.search.slice(0, 50)}${filters.search.length > 50 ? '...' : ''}". Prova con termini diversi o controlla l'ortografia.`
                    : 'Prova a cambiare i filtri di ricerca')
                : !showOnboarding
                  ? 'Crea il tuo primo progetto per iniziare'
                  : ''}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Cancella filtri
              </button>
            )}
            {!hasActiveFilters && !showOnboarding && hasSeenOnboarding && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="mx-2 px-6 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900 rounded-lg transition-colors"
              >
                Mostra guida inizi
              </button>
            )}
          </div>
        </>
      )}

      {/* Projects Grid */}
      {!loading && projects.length > 0 && (
        <>
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
                <div className="flex items-start justify-between mb-3 gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getAreaColor(
                      project.area
                    )} flex-shrink-0`}
                  >
                    {getAreaIcon(project.area)}
                    {getAreaLabel(project.area)}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      project.status
                    )} flex-shrink-0`}
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
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-3 truncate" title={project.genre}>
                    <span className="font-medium">Genere:</span> {project.genre}
                  </p>
                )}

                {/* Tags */}
                <div className="mb-3">
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTagFilterClick(tag);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900 cursor-pointer transition-colors group"
                        >
                          <TagIcon size={10} />
                          {tag}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveTag(project.id, tag, e);
                            }}
                            className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                            title="Rimuovi tag"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Add Tag Input */}
                  {tagInputProjectId === project.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nuovo tag..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagInput.trim()) {
                            handleAddTag(project.id, newTagInput);
                            setNewTagInput('');
                            setTagInputProjectId(null);
                          } else if (e.key === 'Escape') {
                            setTagInputProjectId(null);
                            setNewTagInput('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTagInputProjectId(null);
                          setNewTagInput('');
                        }}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTagInputProjectId(project.id);
                        setNewTagInput('');
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                    >
                      <TagIcon size={12} />
                      Aggiungi tag
                    </button>
                  )}
                </div>

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

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {projects.length} of {pagination.total} projects
            </div>

            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('previous', 'Previous')}
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[40px] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasMore}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('next', 'Next')}
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
