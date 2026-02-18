import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FolderPlus, BookOpen, FileText, Edit3, Loader2 } from 'lucide-react';
import { apiService, Saga } from '../services/api';

interface AssignToSagaModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectArea: 'romanziere' | 'saggista' | 'redattore';
  currentSagaId: string | null;
  onAssigned: (sagaId: string | null) => void;
}

export default function AssignToSagaModal({
  isOpen,
  onClose,
  projectId,
  projectArea,
  currentSagaId,
  onAssigned
}: AssignToSagaModalProps) {
  const { t } = useTranslation();
  const [sagas, setSagas] = useState<Saga[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSagaId, setSelectedSagaId] = useState<string | null>(currentSagaId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSagas();
      setSelectedSagaId(currentSagaId);
    }
  }, [isOpen, currentSagaId]);

  const loadSagas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getSagas();
      // Filter sagas by the project's area
      const filteredSagas = response.sagas.filter(saga => saga.area === projectArea);
      setSagas(filteredSagas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sagas';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    try {
      setSaving(true);
      setError(null);

      await apiService.updateProject(projectId, { saga_id: selectedSagaId });
      onAssigned(selectedSagaId);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign to saga';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromSaga = async () => {
    try {
      setSaving(true);
      setError(null);

      await apiService.updateProject(projectId, { saga_id: null });
      onAssigned(null);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from saga';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getAreaIcon = (area: string) => {
    switch (area) {
      case 'romanziere': return BookOpen;
      case 'saggista': return FileText;
      case 'redattore': return Edit3;
      default: return FolderPlus;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('sagas.assignToSaga', 'Assign to Saga')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('sagas.assignInfo', 'Select a saga to assign this project to. Only sagas in the same area ({{area}}) are shown.', { area: t(`areas.${projectArea}`, projectArea) })}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : sagas.length === 0 ? (
          <div className="py-8 text-center">
            <FolderPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              {t('sagas.noSagasForArea', 'No sagas available')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {t('sagas.noSagasForAreaDesc', 'Create a saga in the {{area}} area first to assign projects to it.', { area: t(`areas.${projectArea}`, projectArea) })}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {/* Option to remove from saga */}
            {currentSagaId && (
              <button
                onClick={() => setSelectedSagaId(null)}
                className={`w-full p-3 rounded-lg text-left transition-colors border-2 ${
                  selectedSagaId === null
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <X size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t('sagas.removeFromSaga', 'Remove from Saga')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('sagas.removeFromSagaDesc', 'This project will not be part of any saga')}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {sagas.map(saga => {
              const AreaIcon = getAreaIcon(saga.area);
              const isSelected = selectedSagaId === saga.id;
              return (
                <button
                  key={saga.id}
                  onClick={() => setSelectedSagaId(saga.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors border-2 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <AreaIcon size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{saga.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {saga.description || t('sagas.noDescription', 'No description')}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          {!loading && sagas.length > 0 && (
            <button
              onClick={handleAssign}
              disabled={saving || selectedSagaId === currentSagaId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('sagas.assigning', 'Assigning...')}
                </>
              ) : (
                t('sagas.assign', 'Assign')
              )}
            </button>
          )}
          {!loading && sagas.length === 0 && currentSagaId && (
            <button
              onClick={handleRemoveFromSaga}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('sagas.removing', 'Removing...')}
                </>
              ) : (
                t('sagas.removeFromSaga', 'Remove from Saga')
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
