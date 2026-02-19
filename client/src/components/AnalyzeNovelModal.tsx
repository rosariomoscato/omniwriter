import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, X, Loader2, BookOpen, Plus, FolderOpen } from 'lucide-react';
import { apiService } from '../services/api';
import { useToastNotification } from './Toast';

interface AnalyzeNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Saga {
  id: string;
  title: string;
  area: string;
}

export default function AnalyzeNovelModal({ isOpen, onClose }: AnalyzeNovelModalProps) {
  const { t } = useTranslation();

  // Helper function to use correct translation path
  const tm = (key: string, options?: any) => t(`projectPage.analyzeNovelModal.${key}`, options);
  const navigate = useNavigate();
  const toast = useToastNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File and form state
  const [novelFile, setNovelFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [language, setLanguage] = useState<'it' | 'en'>('it');

  // Saga selection state
  const [sagas, setSagas] = useState<Saga[]>([]);
  const [selectedSagaId, setSelectedSagaId] = useState<string>('');
  const [createNewSaga, setCreateNewSaga] = useState(false);
  const [newSagaTitle, setNewSagaTitle] = useState('');
  const [loadingSagas, setLoadingSagas] = useState(false);

  // Processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load sagas when modal opens
  const loadSagas = async () => {
    setLoadingSagas(true);
    try {
      const response = await apiService.getSagas();
      // Only show Romanziere sagas since this is for novels
      const romanziereSagas = response.sagas.filter((s: Saga) => s.area === 'romanziere');
      console.log('Loaded romanziere sagas:', romanziereSagas);
      setSagas(romanziereSagas);
    } catch (err) {
      console.error('Failed to load sagas:', err);
    } finally {
      setLoadingSagas(false);
    }
  };

  // Load sagas when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSagas();
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validExtensions = ['.txt', '.docx', '.doc', '.pdf', '.rtf'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(fileExtension)) {
        setError(tm('errorFileType'));
        return;
      }
      setNovelFile(file);
      setError(null);

      // Auto-suggest project title from filename
      if (!projectTitle) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setProjectTitle(baseName);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!novelFile) {
      setError(tm('errorSelectFile'));
      return;
    }

    if (!projectTitle.trim()) {
      setError(tm('errorTitleRequired'));
      return;
    }

    if (createNewSaga && !newSagaTitle.trim()) {
      setError(tm('errorSagaTitleRequired'));
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisProgress(tm('progress.uploading'));

      // Call the standalone analyze-novel endpoint
      const response = await apiService.analyzeNovelStandalone({
        file: novelFile,
        title: projectTitle.trim(),
        language,
        sagaId: createNewSaga ? undefined : (selectedSagaId || undefined),
        createNewSaga: createNewSaga ? newSagaTitle.trim() : undefined,
      }, (progress) => {
        setAnalysisProgress(progress);
      });

      toast.success(tm('successMessage', {
        characters: response.extracted.characters,
        locations: response.extracted.locations,
        plotEvents: response.extracted.plotEvents
      }));

      // Close modal and reset form
      onClose();
      resetForm();

      // Navigate to the newly created project
      navigate(`/projects/${response.projectId}`);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || tm('errorMessage'));
      toast.error(err.message || tm('errorMessage'));
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // Reset form
  const resetForm = () => {
    setNovelFile(null);
    setProjectTitle('');
    setLanguage('it');
    setSelectedSagaId('');
    setCreateNewSaga(false);
    setNewSagaTitle('');
    setError(null);
    setAnalysisProgress('');
  };

  // Handle close with reset
  const handleClose = () => {
    if (!isAnalyzing) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && !isAnalyzing && handleClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            {tm('title')}
          </h2>
          <button
            onClick={handleClose}
            disabled={isAnalyzing}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tm('description')}
          </p>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tm('selectFile')} *
            </label>
            <div
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-500 dark:hover:border-purple-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.doc,.pdf,.rtf"
                onChange={handleFileSelect}
                disabled={isAnalyzing}
                className="hidden"
              />
              {novelFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-8 h-8 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{novelFile.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {tm('uploadText')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tm('formatHint')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tm('projectTitle')} *
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              disabled={isAnalyzing}
              placeholder={tm('projectTitlePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tm('language')}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'it' | 'en')}
              disabled={isAnalyzing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Saga Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tm('sagaSelection')}
            </label>

            {/* Create new saga option */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="createNewSaga"
                checked={createNewSaga}
                onChange={(e) => {
                  setCreateNewSaga(e.target.checked);
                  if (e.target.checked) setSelectedSagaId('');
                }}
                disabled={isAnalyzing}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="createNewSaga" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {tm('createNewSaga')}
              </label>
            </div>

            {createNewSaga ? (
              <input
                type="text"
                value={newSagaTitle}
                onChange={(e) => setNewSagaTitle(e.target.value)}
                disabled={isAnalyzing}
                placeholder={tm('newSagaTitlePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              />
            ) : (
              <select
                value={selectedSagaId}
                onChange={(e) => setSelectedSagaId(e.target.value)}
                disabled={isAnalyzing || loadingSagas}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">{tm('noSaga')}</option>
                {loadingSagas ? (
                  <option disabled>{tm('loadingSagas')}</option>
                ) : sagas.length === 0 ? (
                  <option disabled>{tm('noSagasAvailable')}</option>
                ) : (
                  sagas.map((saga) => (
                    <option key={saga.id} value={saga.id}>
                      {saga.title}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Progress message */}
          {isAnalyzing && analysisProgress && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-purple-800 dark:text-purple-200">{analysisProgress}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || !novelFile || !projectTitle.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {tm('analyzing')}
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                {tm('analyzeButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
