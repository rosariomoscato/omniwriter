import { useState, useEffect } from 'react';
import { apiService, HumanModel, HumanModelSource, CreateHumanModelData } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useToastNotification } from '../components/Toast';
import Breadcrumbs from '../components/Breadcrumbs';

export default function HumanModelPage() {
  const { t } = useTranslation();
  const toast = useToastNotification();
  const [models, setModels] = useState<HumanModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<HumanModel | null>(null);
  const [sources, setSources] = useState<HumanModelSource[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightUpload, setHighlightUpload] = useState(false);

  // Comparison feature states
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparing, setComparing] = useState(false);
  const [testProjectId, setTestProjectId] = useState('');
  const [testChapterId, setTestChapterId] = useState('');

  // Form state for creating a new model
  const [newModel, setNewModel] = useState<CreateHumanModelData>({
    name: '',
    description: '',
    model_type: 'romanziere_advanced',
    style_strength: 50,
  });

  // Form state for editing a model
  const [editModel, setEditModel] = useState<Partial<CreateHumanModelData> & { id: string }>({
    id: '',
    name: '',
    description: '',
    model_type: 'romanziere_advanced',
    style_strength: 50,
  });

  // Form state for uploading a file
  const [uploadFile, setUploadFile] = useState<{
    file_name: string;
    file_type: string;
    content_text: string;
  }>({
    file_name: '',
    file_type: 'txt',
    content_text: '',
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getHumanModels();
      setModels(response.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadModelDetails = async (modelId: string) => {
    try {
      const response = await apiService.getHumanModel(modelId);
      setSelectedModel(response.model);
      setSources(response.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model details');
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await apiService.createHumanModel(newModel);
      setModels([response.model, ...models]);
      setShowCreateDialog(false);
      setNewModel({
        name: '',
        description: '',
        model_type: 'romanziere_advanced',
        style_strength: 50,
      });
      toast.success('Style profile created successfully');
      // Auto-select the new profile to show the upload button
      setSelectedModel(response.model);
      setSources([]);
      // Highlight the upload button temporarily
      setHighlightUpload(true);
      setTimeout(() => setHighlightUpload(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model');
      toast.error(err instanceof Error ? err.message : 'Failed to create model');
    }
  };

  const handleEditClick = (model: HumanModel) => {
    setEditModel({
      id: model.id,
      name: model.name,
      description: model.description,
      model_type: model.model_type,
      style_strength: model.style_strength,
    });
    setShowEditDialog(true);
  };

  const handleEditModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModel.id) return;

    try {
      setError(null);
      const { id, ...updateData } = editModel;
      const response = await apiService.updateHumanModel(id, updateData);
      setModels(models.map(m => m.id === id ? response.model : m));
      if (selectedModel?.id === id) {
        setSelectedModel(response.model);
      }
      setShowEditDialog(false);
      toast.success('Style profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model');
      toast.error(err instanceof Error ? err.message : 'Failed to update model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this style profile?')) {
      return;
    }
    try {
      setError(null);
      await apiService.deleteHumanModel(modelId);
      setModels(models.filter(m => m.id !== modelId));
      if (selectedModel?.id === modelId) {
        setSelectedModel(null);
        setSources([]);
      }
      toast.success('Style profile deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
      toast.error(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    try {
      setError(null);
      const response = await apiService.uploadToHumanModel(
        selectedModel.id,
        uploadFile.file_name,
        uploadFile.file_type,
        uploadFile.content_text
      );
      setSources([response.source, ...sources]);
      // Update model word count
      setSelectedModel({
        ...selectedModel,
        total_word_count: response.total_word_count,
      });
      setShowUploadDialog(false);
      setUploadFile({
        file_name: '',
        file_type: 'txt',
        content_text: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedModel) return;

    try {
      setError(null);
      await apiService.analyzeHumanModel(selectedModel.id);
      // Update model status to analyzing
      setSelectedModel({
        ...selectedModel,
        training_status: 'analyzing',
      });
      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const response = await apiService.getHumanModelAnalysis(selectedModel.id);
          if (response.status !== 'analyzing') {
            clearInterval(pollInterval);
            // Fetch full model details to get updated analysis_result_json
            const modelResponse = await apiService.getHumanModel(selectedModel.id);
            setSelectedModel(modelResponse.model);
          }
        } catch (err) {
          console.error('Error polling analysis status:', err);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
    }
  };

  const handleTestComparison = async () => {
    if (!selectedModel || !testProjectId || !testChapterId) {
      toast.error('Please select a model and enter a project/chapter ID for testing');
      return;
    }

    try {
      setComparing(true);
      setError(null);
      const response = await apiService.generateChapterComparison(
        testChapterId,
        selectedModel.id,
        'Test comparison with current model'
      );
      setComparisonData(response);
      setShowComparison(true);
      toast.success('Comparison generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate comparison');
      toast.error(err instanceof Error ? err.message : 'Failed to generate comparison');
    } finally {
      setComparing(false);
    }
  };

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadFile({
        file_name: file.name,
        file_type: file.name.split('.').pop() || 'txt',
        content_text: content,
      });
    };
    reader.readAsText(file);
  };

  const getMinWords = (modelType: string) => {
    return modelType === 'romanziere_advanced' ? 50000 : 10000;
  };

  return (
    <div className="p-6">
      <Breadcrumbs />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('humanModel.title', 'Human Model')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('humanModel.description', 'Crea profili di stile personali caricando tuoi testi. L\'AI analizzerà il tuo stile di scrittura.')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('humanModel.createNew', 'Create New Profile')}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: List of Models */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('humanModel.yourProfiles', 'Your Profiles')}
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : models.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('humanModel.noProfiles', 'No profiles yet. Create one to get started.')}
                </p>
              ) : (
                models.map(model => (
                  <div
                    key={model.id}
                    onClick={() => loadModelDetails(model.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedModel?.id === model.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{model.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('humanModel.words', 'Words')}: {model.total_word_count.toLocaleString()}
                        </p>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        model.training_status === 'ready'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : model.training_status === 'analyzing'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {t(`humanModel.status.${model.training_status}`, model.training_status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Model Details */}
        <div className="lg:col-span-2">
          {!selectedModel ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('humanModel.selectProfile', 'Select a profile')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('humanModel.selectProfileDesc', 'Choose a profile from the left to view details or upload writings')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Model Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedModel.name}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedModel.description || t('humanModel.noDescription', 'No description')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(selectedModel)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1"
                      title="Edit profile"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteModel(selectedModel.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('humanModel.modelType', 'Model Type')}</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {t(`humanModel.types.${selectedModel.model_type}`, selectedModel.model_type)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('humanModel.wordCount', 'Word Count')}</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {selectedModel.total_word_count.toLocaleString()} / {getMinWords(selectedModel.model_type).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('humanModel.styleStrength', 'Style Strength')}</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">{selectedModel.style_strength}%</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowUploadDialog(true)}
                    disabled={selectedModel.training_status === 'analyzing'}
                    className={`px-4 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all ${
                      highlightUpload
                        ? 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-300 dark:ring-blue-800 animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {t('humanModel.uploadWritings', 'Upload Writings')}
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={selectedModel.training_status === 'analyzing' || selectedModel.total_word_count < getMinWords(selectedModel.model_type)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {selectedModel.training_status === 'analyzing'
                      ? t('humanModel.analyzing', 'Analyzing...')
                      : selectedModel.total_word_count < getMinWords(selectedModel.model_type)
                      ? `${t('humanModel.notEnoughWords', 'Not enough words')} (${getMinWords(selectedModel.model_type).toLocaleString()} ${t('common.required', 'required')})`
                      : t('humanModel.analyze', 'Analyze Style')}
                  </button>
                </div>
              </div>

              {/* Sources List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('humanModel.uploadedFiles', 'Uploaded Files')}
                  </h3>
                </div>
                <div className="p-4">
                  {sources.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="mb-4">
                        <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                        {t('humanModel.noFilesTitle', 'Carica i tuoi testi per iniziare')}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                        {t('humanModel.noFilesDesc', 'Carica file di testo (TXT) contenenti i tuoi scritti. L\'AI analizzerà il tuo stile.')}
                      </p>
                      <button
                        onClick={() => setShowUploadDialog(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('humanModel.uploadFirst', 'Carica primo file')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sources.map(source => (
                        <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{source.file_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {source.word_count.toLocaleString()} {t('humanModel.words', 'words')}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(source.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Results Section */}
              {selectedModel.training_status === 'ready' && selectedModel.analysis_result_json && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t('humanModel.analysisResults', 'Style Analysis Results')}
                    </h3>
                  </div>
                  <div className="p-6">
                    {(() => {
                      try {
                        const analysis = JSON.parse(selectedModel.analysis_result_json || '{}');
                        return (
                          <div className="space-y-6">
                            {/* Tone */}
                            {analysis.tone && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  {t('humanModel.tone', 'Tone')}
                                </h4>
                                <p className="text-gray-900 dark:text-gray-100 pl-4">{analysis.tone}</p>
                              </div>
                            )}

                            {/* Sentence Structure */}
                            {analysis.sentence_structure && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  {t('humanModel.sentenceStructure', 'Sentence Structure')}
                                </h4>
                                <p className="text-gray-900 dark:text-gray-100 pl-4">{analysis.sentence_structure}</p>
                              </div>
                            )}

                            {/* Vocabulary */}
                            {analysis.vocabulary && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  {t('humanModel.vocabulary', 'Vocabulary')}
                                </h4>
                                <p className="text-gray-900 dark:text-gray-100 pl-4">{analysis.vocabulary}</p>
                              </div>
                            )}

                            {/* Patterns */}
                            {analysis.patterns && Array.isArray(analysis.patterns) && analysis.patterns.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                  {t('humanModel.patterns', 'Writing Patterns')}
                                </h4>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                  {analysis.patterns.map((pattern: string, idx: number) => (
                                    <li key={idx} className="text-gray-900 dark:text-gray-100 text-sm">
                                      {pattern}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Analysis Complete Badge */}
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">{t('humanModel.analysisComplete', 'Analysis Complete')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('humanModel.analysisCompleteDesc', 'This style profile can now be applied to AI generation')}
                              </p>
                            </div>
                          </div>
                        );
                      } catch {
                        return (
                          <p className="text-gray-500 dark:text-gray-400">
                            {t('humanModel.noAnalysisData', 'No analysis data available')}
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Style Comparison Test Section */}
              {selectedModel && selectedModel.training_status === 'ready' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t('humanModel.styleComparison', 'Style Comparison Test')}
                    </h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t('humanModel.comparisonDesc', 'Test how this style profile affects AI-generated content. Enter a chapter ID to see a side-by-side comparison.')}
                    </p>

                    {!showComparison ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('humanModel.testProjectId', 'Test Project ID')}
                            </label>
                            <input
                              type="text"
                              value={testProjectId}
                              onChange={e => setTestProjectId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              placeholder="uuid"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('humanModel.testChapterId', 'Test Chapter ID')}
                            </label>
                            <input
                              type="text"
                              value={testChapterId}
                              onChange={e => setTestChapterId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              placeholder="uuid"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleTestComparison}
                          disabled={comparing || !testProjectId || !testChapterId}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {comparing
                            ? t('humanModel.generating', 'Generating Comparison...')
                            : t('humanModel.generateComparison', 'Generate Style Comparison')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Comparison Summary */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {t('humanModel.comparisonSummary', 'Comparison Summary')}
                          </h4>
                          {comparisonData?.differences && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t('humanModel.wordCountChange', 'Word Count Change')}:</span>
                                <span className={`font-medium ${comparisonData.differences.word_count_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {comparisonData.differences.word_count_change > 0 ? '+' : ''}{comparisonData.differences.word_count_change} words
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t('humanModel.percentageChange', 'Percentage Change')}:</span>
                                <span className={`font-medium ${comparisonData.differences.percentage_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {comparisonData.differences.percentage_change > 0 ? '+' : ''}{comparisonData.differences.percentage_change}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Side by Side Comparison */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Baseline (No Human Model) */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 border-b border-gray-200 dark:border-gray-700">
                              <h5 className="font-medium text-gray-700 dark:text-gray-300">
                                {t('humanModel.withoutStyle', 'Without Style Profile')}
                              </h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {comparisonData?.baseline?.word_count} words
                              </p>
                            </div>
                            <div className="p-4">
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {comparisonData?.baseline?.content}
                              </p>
                            </div>
                          </div>

                          {/* Styled (With Human Model) */}
                          <div className="border border-blue-200 dark:border-blue-900 rounded-lg overflow-hidden">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 border-b border-blue-200 dark:border-blue-900">
                              <h5 className="font-medium text-blue-700 dark:text-blue-300">
                                {t('humanModel.withStyle', 'With Style Profile')}
                              </h5>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {comparisonData?.styled?.word_count} words
                              </p>
                            </div>
                            <div className="p-4">
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {comparisonData?.styled?.content}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Style Elements Applied */}
                        {comparisonData?.differences?.style_elements_applied && comparisonData.differences.style_elements_applied.length > 0 && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                            <h5 className="font-medium text-purple-700 dark:text-purple-300 mb-2">
                              {t('humanModel.styleElementsApplied', 'Style Elements Applied')}
                            </h5>
                            <ul className="space-y-1">
                              {comparisonData.differences.style_elements_applied.map((element: any, idx: number) => (
                                <li key={idx} className="text-sm text-purple-600 dark:text-purple-400">
                                  <span className="font-medium">{element.element}:</span> {element.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => {
                              setShowComparison(false);
                              setComparisonData(null);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            {t('common.close', 'Close')}
                          </button>
                          <button
                            onClick={() => setShowComparison(false)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {t('humanModel.newTest', 'New Test')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('humanModel.createProfile', 'Create Style Profile')}
            </h3>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                <span>{t('humanModel.step.create', 'Crea profilo')}</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="flex items-center gap-1 text-gray-400">
                <span className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs">2</span>
                <span>{t('humanModel.step.upload', 'Carica testi')}</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="flex items-center gap-1 text-gray-400">
                <span className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs">3</span>
                <span>{t('humanModel.step.analyze', 'Analizza')}</span>
              </div>
            </div>

            {/* Explanatory text */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('humanModel.createInfo', 'Il profilo verrà creato vuoto. Dopo la creazione, potrai caricare i tuoi testi per l\'analisi dello stile.')}
              </p>
            </div>

            <form onSubmit={handleCreateModel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.profileName', 'Profile Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={newModel.name}
                  onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('humanModel.profileNamePlaceholder', 'My Writing Style')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.description', 'Description')}
                </label>
                <textarea
                  value={newModel.description || ''}
                  onChange={e => setNewModel({ ...newModel, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder={t('humanModel.descriptionPlaceholder', 'Optional description')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.modelType', 'Model Type')} *
                </label>
                <select
                  value={newModel.model_type}
                  onChange={e => setNewModel({ ...newModel, model_type: e.target.value as CreateHumanModelData['model_type'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="romanziere_advanced">{t('humanModel.types.romanziere_advanced', 'Novelist (Advanced)')}</option>
                  <option value="saggista_basic">{t('humanModel.types.saggista_basic', 'Essayist (Basic)')}</option>
                  <option value="redattore_basic">{t('humanModel.types.redattore_basic', 'Editor (Basic)')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.styleStrength', 'Style Strength')}: {newModel.style_strength}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newModel.style_strength || 50}
                  onChange={e => setNewModel({ ...newModel, style_strength: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('humanModel.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('humanModel.editProfile', 'Edit Style Profile')}
            </h3>
            <form onSubmit={handleEditModel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.profileName', 'Profile Name')} *
                </label>
                <input
                  type="text"
                  required
                  value={editModel.name || ''}
                  onChange={e => setEditModel({ ...editModel, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('humanModel.profileNamePlaceholder', 'My Writing Style')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.description', 'Description')}
                </label>
                <textarea
                  value={editModel.description || ''}
                  onChange={e => setEditModel({ ...editModel, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder={t('humanModel.descriptionPlaceholder', 'Optional description')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.modelType', 'Model Type')} *
                </label>
                <select
                  value={editModel.model_type || 'romanziere_advanced'}
                  onChange={e => setEditModel({ ...editModel, model_type: e.target.value as CreateHumanModelData['model_type'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="romanziere_advanced">{t('humanModel.types.romanziere_advanced', 'Novelist (Advanced)')}</option>
                  <option value="saggista_basic">{t('humanModel.types.saggista_basic', 'Essayist (Basic)')}</option>
                  <option value="redattore_basic">{t('humanModel.types.redattore_basic', 'Editor (Basic)')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.styleStrength', 'Style Strength')}: {editModel.style_strength || 50}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editModel.style_strength || 50}
                  onChange={e => setEditModel({ ...editModel, style_strength: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0% ({t('humanModel.minStrength', 'Minimal')})</span>
                  <span>50% ({t('humanModel.balanced', 'Balanced')})</span>
                  <span>100% ({t('humanModel.maxStrength', 'Maximum')})</span>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('humanModel.save', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('humanModel.uploadWritings', 'Upload Writings')}
            </h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('humanModel.selectFile', 'Select File')} (TXT)
                </label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileRead}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {uploadFile.content_text && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('humanModel.preview', 'Preview')}
                  </label>
                  <textarea
                    value={uploadFile.content_text}
                    onChange={e => setUploadFile({ ...uploadFile, content_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                    rows={6}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {uploadFile.content_text.split(/\s+/).filter(w => w.length > 0).length} {t('humanModel.words', 'words')}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile.content_text}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {t('humanModel.upload', 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
