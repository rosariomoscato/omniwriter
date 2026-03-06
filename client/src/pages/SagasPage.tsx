import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService, Saga, CreateSagaData, Project } from '../services/api';
import { useToastNotification } from '../components/Toast';
import Breadcrumbs from '../components/Breadcrumbs';
import { Plus, BookOpen, FileText, Edit3, Trash2, X, FolderOpen, ArrowRight, Sparkles } from 'lucide-react';
import SagaTimeline from '../components/SagaTimeline';
import CreateSagaSequelModal from '../components/CreateSagaSequelModal';
import FeatureGate from '../components/FeatureGate';

export default function SagasPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToastNotification();

  const [sagas, setSagas] = useState<Saga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create saga modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSaga, setNewSaga] = useState<CreateSagaData>({
    title: '',
    description: '',
    area: 'romanziere',
  });

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sagaToDelete, setSagaToDelete] = useState<Saga | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create sequel modal state (Feature #303)
  const [showCreateSequelModal, setShowCreateSequelModal] = useState(false);

  // Selected saga for detail view
  const [selectedSaga, setSelectedSaga] = useState<Saga | null>(null);
  const [sagaProjects, setSagaProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    loadSagas();
  }, []);

  const loadSagas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getSagas();
      setSagas(response.sagas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sagas';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadSagaProjects = async (sagaId: string) => {
    try {
      setLoadingProjects(true);
      const response = await apiService.getSagaProjects(sagaId);
      setSagaProjects(response.projects);
    } catch (err) {
      console.error('Failed to load saga projects:', err);
      setSagaProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateSaga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaga.title.trim()) {
      toast.error(t('sagas.titleRequired', 'Title is required'));
      return;
    }

    try {
      setCreating(true);
      const response = await apiService.createSaga(newSaga);
      setSagas([response.saga, ...sagas]);
      setShowCreateModal(false);
      setNewSaga({ title: '', description: '', area: 'romanziere' });
      toast.success(t('sagas.createSuccess', 'Saga created successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create saga';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSaga = async () => {
    if (!sagaToDelete) return;

    try {
      setDeleting(true);
      await apiService.deleteSaga(sagaToDelete.id);
      setSagas(sagas.filter(s => s.id !== sagaToDelete.id));
      if (selectedSaga?.id === sagaToDelete.id) {
        setSelectedSaga(null);
        setSagaProjects([]);
      }
      setShowDeleteModal(false);
      setSagaToDelete(null);
      toast.success(t('sagas.deleteSuccess', 'Saga deleted successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete saga';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectSaga = (saga: Saga) => {
    setSelectedSaga(saga);
    loadSagaProjects(saga.id);
  };

  const getAreaIcon = (area: string) => {
    switch (area) {
      case 'romanziere': return BookOpen;
      case 'saggista': return FileText;
      case 'redattore': return Edit3;
      default: return FolderOpen;
    }
  };

  const getAreaColor = (area: string) => {
    switch (area) {
      case 'romanziere': return 'text-romanziere';
      case 'saggista': return 'text-saggista';
      case 'redattore': return 'text-redattore';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('sagas.title', 'Sagas')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('sagas.description', 'Manage your novel series and shared sources across related projects.')}
          </p>
        </div>
        <FeatureGate feature="sagas">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            {t('sagas.createNew', 'Create Saga')}
          </button>
        </FeatureGate>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: List of Sagas */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('sagas.yourSagas', 'Your Sagas')}
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {sagas.length === 0 ? (
                <div className="text-center py-6">
                  <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                    {t('sagas.noSagas', 'No sagas yet')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                    {t('sagas.noSagasDesc', 'Create a saga to group related novels and share sources.')}
                  </p>
                  <FeatureGate feature="sagas">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t('sagas.createFirst', 'Create your first saga')}
                    </button>
                  </FeatureGate>
                </div>
              ) : (
                sagas.map(saga => {
                  const AreaIcon = getAreaIcon(saga.area);
                  const areaColor = getAreaColor(saga.area);
                  return (
                    <div
                      key={saga.id}
                      onClick={() => handleSelectSaga(saga)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedSaga?.id === saga.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AreaIcon size={20} className={areaColor} />
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{saga.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t(`areas.${saga.area}`, saga.area)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Saga Details */}
        <div className="lg:col-span-2">
          {!selectedSaga ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('sagas.selectSaga', 'Select a Saga')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('sagas.selectSagaDesc', 'Choose a saga from the left to view details and projects')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Saga Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSaga.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedSaga.description || t('sagas.noDescription', 'No description')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSagaToDelete(selectedSaga);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 p-1"
                      title={t('sagas.deleteSaga', 'Delete saga')}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('sagas.area', 'Area')}</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1 capitalize">
                      {t(`areas.${selectedSaga.area}`, selectedSaga.area)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('sagas.created', 'Created')}</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(selectedSaga.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => navigate(`/projects/new?sagaId=${selectedSaga.id}&area=${selectedSaga.area}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} />
                    {t('sagas.addProject', 'Add Project to Saga')}
                  </button>
                  {/* Feature #303: Create Sequel with Continuity button */}
                  {sagaProjects.length > 0 && (
                    <FeatureGate feature="novelAnalysis">
                      <button
                        onClick={() => setShowCreateSequelModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Sparkles size={18} />
                        {t('sagas.createSequel', 'Create Sequel')}
                      </button>
                    </FeatureGate>
                  )}
                </div>
              </div>

              {/* Projects in Saga */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('sagas.projectsInSaga', 'Projects in this Saga')}
                  </h3>
                </div>
                <div className="p-4">
                  {loadingProjects ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : sagaProjects.length === 0 ? (
                    <div className="text-center py-6">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                        {t('sagas.noProjects', 'No projects yet')}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                        {t('sagas.noProjectsDesc', 'Add your first project to this saga to get started.')}
                      </p>
                      <button
                        onClick={() => navigate(`/projects/new?sagaId=${selectedSaga.id}&area=${selectedSaga.area}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('sagas.addFirstProject', 'Add first project')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sagaProjects.map(project => (
                        <div
                          key={project.id}
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{project.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {project.word_count?.toLocaleString() || 0} {t('common.words', 'words')} • {t(`projectPage.statusLabels.${project.status}`, project.status)}
                            </p>
                          </div>
                          <ArrowRight size={16} className="text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Feature #302: Saga Timeline */}
              <SagaTimeline sagaId={selectedSaga.id} />
            </div>
          )}
        </div>
      </div>

      {/* Create Saga Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('sagas.createSaga', 'Create Saga')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('sagas.createInfo', 'A saga allows you to group related novels together and share sources across them. Sagas can only contain projects of the same area.')}
            </p>

            <form onSubmit={handleCreateSaga} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sagas.sagaTitle', 'Title')} *
                </label>
                <input
                  type="text"
                  required
                  value={newSaga.title}
                  onChange={e => setNewSaga({ ...newSaga, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('sagas.titlePlaceholder', 'e.g., The Fantasy Trilogy')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sagas.description', 'Description')}
                </label>
                <textarea
                  value={newSaga.description || ''}
                  onChange={e => setNewSaga({ ...newSaga, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder={t('sagas.descriptionPlaceholder', 'Optional description of the saga...')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sagas.area', 'Area')} *
                </label>
                <select
                  value={newSaga.area}
                  onChange={e => setNewSaga({ ...newSaga, area: e.target.value as 'romanziere' | 'saggista' | 'redattore' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="romanziere">{t('areas.romanziere', 'Romanziere')}</option>
                  <option value="saggista">{t('areas.saggista', 'Saggista')}</option>
                  <option value="redattore">{t('areas.redattore', 'Redattore')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? t('sagas.creating', 'Creating...') : t('sagas.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && sagaToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('sagas.deleteTitle', 'Delete Saga')}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {t('sagas.deleteConfirm', 'Are you sure you want to delete this saga?')}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg mb-4">
              {sagaToDelete.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('sagas.deleteWarning', 'This will not delete the projects in this saga, but they will no longer be grouped together.')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSagaToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteSaga}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {deleting ? t('sagas.deleting', 'Deleting...') : t('sagas.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature #303: Create Saga Sequel Modal */}
      {showCreateSequelModal && selectedSaga && (
        <CreateSagaSequelModal
          sagaId={selectedSaga.id}
          sagaTitle={selectedSaga.title}
          sagaProjects={sagaProjects}
          onClose={() => setShowCreateSequelModal(false)}
          onSuccess={() => {
            // Reload saga projects to show the new sequel
            if (selectedSaga) {
              loadSagaProjects(selectedSaga.id);
            }
          }}
        />
      )}

      {/* Upgrade Modal (Feature #377) */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
