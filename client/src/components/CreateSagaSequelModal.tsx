// Feature #303: Create Sequel with Saga Continuity
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { apiService, Project } from '../services/api';
import { useToastNotification } from './Toast';
import { X, BookOpen, MapPin, Users, Sparkles } from 'lucide-react';

interface CreateSagaSequelModalProps {
  sagaId: string;
  sagaTitle: string;
  sagaProjects: Project[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateSagaSequelModal({
  sagaId,
  sagaTitle,
  sagaProjects,
  onClose,
  onSuccess
}: CreateSagaSequelModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToastNotification();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceProjectId, setSelectedSourceProject] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Auto-select the most recent project if available
  useEffect(() => {
    if (sagaProjects.length > 0 && !sourceProjectId) {
      // Projects are already sorted by created_at DESC from the API
      setSelectedSourceProject(sagaProjects[0].id);
    }
  }, [sagaProjects, sourceProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('sagas.titleRequired', 'Title is required'));
      return;
    }

    if (sagaProjects.length === 0) {
      toast.error(t('sagas.noProjectsForSequel', 'No projects in this saga yet'));
      return;
    }

    try {
      setCreating(true);

      const response = await apiService.createSagaSequel(sagaId, {
        title: title.trim(),
        description: description.trim() || undefined,
        source_project_id: sourceProjectId || undefined
      });

      // Show success message with details
      if (response.sequel_info.continuity_id) {
        toast.success(
          t('sagas.sequelCreated', 'The sequel \'{{title}}\' has been created with {{characters}} characters and {{locations}} locations.', {
            title: response.project.title,
            characters: response.sequel_info.characters_copied,
            locations: response.sequel_info.locations_copied
          })
        );
      } else {
        toast.success(
          t('sagas.sequelCreatedNoContinuity', 'The sequel \'{{title}}\' has been created. No continuity data exists yet.', {
            title: response.project.title
          })
        );
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();

      // Navigate to the new project
      navigate(`/projects/${response.project.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('sagas.createSequelError', 'Error creating sequel');
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const selectedProject = sagaProjects.find(p => p.id === sourceProjectId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('sagas.createSequelTitle', 'Create New Sequel')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sagaTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={creating}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            {t('sagas.createSequelDesc', 'Create a new sequel project with characters and locations from previous episodes, using the saga continuity.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Sequel Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sagas.sequelTitle', 'Sequel Title')} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('sagas.sequelTitlePlaceholder', 'e.g., The Hero Returns')}
              disabled={creating}
            />
          </div>

          {/* Sequel Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sagas.sequelDescription', 'Description (optional)')}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder={t('sagas.sequelDescriptionPlaceholder', 'Optional description of the sequel...')}
              disabled={creating}
            />
          </div>

          {/* Source Project Selection */}
          {sagaProjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('sagas.sourceProject', 'Source Project')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t('sagas.sourceProjectHint', 'The project to copy characters and locations from. The most recent will be used if not selected.')}
              </p>
              <select
                value={sourceProjectId}
                onChange={e => setSelectedSourceProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                disabled={creating}
              >
                {sagaProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({new Date(project.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview of what will be imported */}
          {selectedProject && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('sagas.whatWillBeImported', 'What will be imported:')}
              </p>

              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Users size={16} className="text-purple-600 dark:text-purple-400" />
                <span>
                  {t('sagas.charactersWillImport', '{{count}} characters will be imported (excluding dead ones)', {
                    count: selectedProject.character_count || 0
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <MapPin size={16} className="text-purple-600 dark:text-purple-400" />
                <span>
                  {t('sagas.locationsWillImport', '{{count}} locations will be imported', {
                    count: selectedProject.location_count || 0
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />
                <span>
                  {t('sagas.sourcesAndSettings', 'Sources and settings will be preserved')}
                </span>
              </div>
            </div>
          )}

          {/* No projects warning */}
          {sagaProjects.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {t('sagas.noProjectsForSequel', 'There are no projects in this saga yet. Add a project before creating a sequel.')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={creating || sagaProjects.length === 0}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('sagas.creatingSequel', 'Creating sequel...')}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {t('sagas.createSequel', 'Create Sequel')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
