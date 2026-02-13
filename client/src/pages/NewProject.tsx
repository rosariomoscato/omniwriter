import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, FileText, Zap, AlertCircle } from 'lucide-react';
import { apiService, type CreateProjectData } from '../services/api';
import { useToastNotification } from '../components/Toast';
import Breadcrumbs from '../components/Breadcrumbs';

type AreaType = 'romanziere' | 'saggista' | 'redattore';

interface AreaOption {
  id: AreaType;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  color: string;
}

const AREAS: AreaOption[] = [
  {
    id: 'romanziere',
    nameKey: 'newProject.areas.romanziere.name',
    descriptionKey: 'newProject.areas.romanziere.description',
    icon: BookOpen,
    color: 'bg-amber-500',
  },
  {
    id: 'saggista',
    nameKey: 'newProject.areas.saggista.name',
    descriptionKey: 'newProject.areas.saggista.description',
    icon: FileText,
    color: 'bg-teal-500',
  },
  {
    id: 'redattore',
    nameKey: 'newProject.areas.redattore.name',
    descriptionKey: 'newProject.areas.redattore.description',
    icon: Zap,
    color: 'bg-rose-500',
  },
];

function NewProject() {
  const navigate = useNavigate();
  const toast = useToastNotification();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    area: AreaType | null;
    genre: string;
    // Romanziere-specific fields
    tone: string;
    pov: string;
    targetAudience: string;
    wordCountTarget: number;
    // Redattore-specific fields
    articleType: string;
    seoKeywords: string;
    redattoreWordCount: number;
    // Saggista-specific fields
    topic: string;
    depth: 'deep_dive' | 'panoramic_overview';
    structure: string;
  }>({
    title: '',
    description: '',
    area: null,
    genre: '',
    tone: '',
    pov: '',
    targetAudience: '',
    wordCountTarget: 50000,
    articleType: '',
    seoKeywords: '',
    redattoreWordCount: 500,
    topic: '',
    depth: 'deep_dive',
    structure: 'popular',
  });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const isSubmittingRef = useRef(false);

  // Basic validation for title (always required)
  const validateField = (name: string, value: string) => {
    let error = '';

    if (name === 'title' && !value.trim()) {
      error = t('newProject.validation.titleRequired');
    }

    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    const name = e.target.name;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate on change if already touched
    if (touchedFields[name]) {
      validateField(name, String(value));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const name = e.target.name;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    validateField(name, String(e.target.value));
  };

  const handleAreaSelect = (area: AreaType) => {
    setFormData({ ...formData, area });
    setFieldErrors(prev => ({ ...prev, area: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Prevent double-click submission
    if (isSubmittingRef.current) {
      return;
    }

    // Validate title (always required)
    if (!formData.title.trim()) {
      setFieldErrors(prev => ({ ...prev, title: t('newProject.validation.titleRequired') }));
      setTouchedFields(prev => ({ ...prev, title: true }));
      return;
    }

    // Validate area selection
    if (!formData.area) {
      setFieldErrors(prev => ({ ...prev, area: t('newProject.validation.areaRequired') }));
      return;
    }

    // Mark as submitting immediately to prevent double-clicks
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const projectData: CreateProjectData = {
        title: formData.title,
        description: formData.description || undefined,
        area: formData.area,
        genre: formData.area === 'romanziere' ? formData.genre || undefined : undefined,
        tone: formData.area === 'romanziere' ? formData.tone || undefined : undefined,
        target_audience: formData.area === 'romanziere' ? formData.targetAudience || undefined : undefined,
        pov: formData.area === 'romanziere' ? formData.pov || undefined : undefined,
        word_count_target: formData.area === 'romanziere' ? formData.wordCountTarget : formData.area === 'redattore' ? formData.redattoreWordCount : undefined,
        // Area-specific settings in settings_json
        settings_json: formData.area === 'redattore' ? JSON.stringify({
          articleType: formData.articleType,
          seoKeywords: formData.seoKeywords,
          wordCountTarget: formData.redattoreWordCount,
        }) : formData.area === 'saggista' ? JSON.stringify({
          topic: formData.topic,
          depth: formData.depth,
          targetAudience: formData.targetAudience,
          structure: formData.structure,
        }) : undefined,
      };

      const response = await apiService.createProject(projectData);

      // Reset form to prevent resubmission on back navigation
      setFormData({
        title: '',
        description: '',
        area: null,
        genre: '',
        tone: '',
        pov: '',
        targetAudience: '',
        wordCountTarget: 50000,
        articleType: '',
        seoKeywords: '',
        redattoreWordCount: 500,
        topic: '',
        depth: 'deep_dive',
        structure: 'popular',
      });

      // Set flag to reset dashboard pagination to page 1
      sessionStorage.setItem('justCreatedProject', 'true');

      // Redirect to newly created project (replace history to prevent back navigation to form)
      toast.success(t('newProject.toast.success'));
      navigate(`/projects/${response.project.id}`, { replace: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('newProject.toast.error');
      setServerError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      area: null,
      genre: '',
      tone: '',
      pov: '',
      targetAudience: '',
      wordCountTarget: 50000,
      articleType: '',
      seoKeywords: '',
      redattoreWordCount: 500,
      topic: '',
      depth: 'deep_dive',
      structure: 'popular',
    });
    setServerError('');
    setFieldErrors({});
    setTouchedFields({});
  };

  return (
    <div className="p-6">
      <Breadcrumbs />
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          {t('newProject.backToDashboard')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('newProject.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('newProject.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {serverError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {serverError}
          </div>
        )}

        {/* Area Selection */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('newProject.stepSelectArea')}
          </label>
          {fieldErrors.area && (
            <p className="text-red-600 dark:text-red-400 text-sm mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {fieldErrors.area}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AREAS.map((areaOption) => {
              const Icon = areaOption.icon;
              const isSelected = formData.area === areaOption.id;
              return (
                <button
                  key={areaOption.id}
                  type="button"
                  onClick={() => handleAreaSelect(areaOption.id)}
                  className={`
                    p-6 rounded-lg border-2 transition-all text-left
                    ${isSelected
                      ? `${areaOption.color} text-white border-transparent shadow-lg`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }
                  `}
                >
                  <div className="flex items-center mb-3">
                    <Icon size={28} className={isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'} />
                    <span className="ml-3 text-xl font-bold">{t(areaOption.nameKey)}</span>
                  </div>
                  <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                    {t(areaOption.descriptionKey)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('newProject.stepTitle')}
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t('newProject.titlePlaceholder')}
            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 dark:text-white text-lg ${
              touchedFields.title && fieldErrors.title
                ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500 dark:bg-red-900/10'
                : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800'
            }`}
            aria-invalid={!!(touchedFields.title && fieldErrors.title)}
          />
          {touchedFields.title && fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('newProject.stepDescription')}
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={t('newProject.descriptionPlaceholder')}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white text-lg resize-none"
          />
        </div>

        {/* Romanziere-specific configuration */}
        {formData.area === 'romanziere' && (
          <div className="space-y-6 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('newProject.romanziere.sectionTitle')}
            </h3>

            {/* Genre */}
            <div>
              <label htmlFor="genre" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.romanziere.genreLabel')}
              </label>
              <input
                id="genre"
                name="genre"
                type="text"
                value={formData.genre}
                onChange={handleChange}
                placeholder={t('newProject.romanziere.genrePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-lg"
              />
            </div>

            {/* Tone */}
            <div>
              <label htmlFor="tone" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.romanziere.toneLabel')}
              </label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-lg"
              >
                <option value="">{t('newProject.romanziere.toneSelectPlaceholder')}</option>
                <option value="serio">{t('newProject.romanziere.toneSerious')}</option>
                <option value="leggero">{t('newProject.romanziere.toneLight')}</option>
                <option value="ironico">{t('newProject.romanziere.toneIronic')}</option>
                <option value="romantico">{t('newProject.romanziere.toneRomantic')}</option>
                <option value="thrilling">{t('newProject.romanziere.toneThrilling')}</option>
                <option value="dark">{t('newProject.romanziere.toneDark')}</option>
                <option value="avventuroso">{t('newProject.romanziere.toneAdventurous')}</option>
                <option value="poetico">{t('newProject.romanziere.tonePoetic')}</option>
              </select>
            </div>

            {/* POV (Point of View) */}
            <div>
              <label className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('newProject.romanziere.povLabel')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.pov === 'first_person'
                    ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="pov"
                    value="first_person"
                    checked={formData.pov === 'first_person'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('newProject.romanziere.povFirstPerson')}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t('newProject.romanziere.povFirstPersonDesc')}</div>
                  </div>
                </label>
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.pov === 'third_person_limited'
                    ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="pov"
                    value="third_person_limited"
                    checked={formData.pov === 'third_person_limited'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('newProject.romanziere.povThirdLimited')}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t('newProject.romanziere.povThirdLimitedDesc')}</div>
                  </div>
                </label>
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.pov === 'third_person_omniscient'
                    ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="pov"
                    value="third_person_omniscient"
                    checked={formData.pov === 'third_person_omniscient'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('newProject.romanziere.povThirdOmniscient')}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t('newProject.romanziere.povThirdOmniscientDesc')}</div>
                  </div>
                </label>
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.pov === 'alternate'
                    ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="pov"
                    value="alternate"
                    checked={formData.pov === 'alternate'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('newProject.romanziere.povAlternate')}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{t('newProject.romanziere.povAlternateDesc')}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="targetAudience" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.romanziere.targetAudienceLabel')}
              </label>
              <input
                id="targetAudience"
                name="targetAudience"
                type="text"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder={t('newProject.romanziere.targetAudiencePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-lg"
              />
            </div>

            {/* Word Count Target (Length) */}
            <div>
              <label htmlFor="word_count_target" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.romanziere.wordCountLabel')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="word_count_target"
                  name="word_count_target"
                  type="number"
                  value={formData.wordCountTarget}
                  onChange={(e) => setFormData({ ...formData, wordCountTarget: parseInt(e.target.value) || 0 })}
                  min="1000"
                  step="1000"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-lg"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, wordCountTarget: 50000 })}
                    className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    50K
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, wordCountTarget: 80000 })}
                    className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    80K
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, wordCountTarget: 100000 })}
                    className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    100K
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('newProject.romanziere.wordCountHint')}
              </p>
            </div>
          </div>
        )}

        {/* Saggista-specific configuration */}
        {formData.area === 'saggista' && (
          <div className="space-y-6 p-6 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('newProject.saggista.sectionTitle')}
            </h3>

            {/* Topic */}
            <div>
              <label htmlFor="topic" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.saggista.topicLabel')}
              </label>
              <input
                id="topic"
                name="topic"
                type="text"
                value={formData.topic}
                onChange={handleChange}
                placeholder={t('newProject.saggista.topicPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('newProject.saggista.topicHint')}
              </p>
            </div>

            {/* Depth */}
            <div>
              <label className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('newProject.saggista.depthLabel')}
              </label>
              <div className="space-y-3">
                <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.depth === 'deep_dive'
                    ? 'border-teal-500 bg-teal-100 dark:bg-teal-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="depth"
                    value="deep_dive"
                    checked={formData.depth === 'deep_dive'}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('newProject.saggista.depthDeepDive')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('newProject.saggista.depthDeepDiveDesc')}</div>
                  </div>
                </label>
                <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.depth === 'panoramic_overview'
                    ? 'border-teal-500 bg-teal-100 dark:bg-teal-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="depth"
                    value="panoramic_overview"
                    checked={formData.depth === 'panoramic_overview'}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('newProject.saggista.depthOverview')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('newProject.saggista.depthOverviewDesc')}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="targetAudience" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.saggista.targetAudienceLabel')}
              </label>
              <input
                id="targetAudience"
                name="targetAudience"
                type="text"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder={t('newProject.saggista.targetAudiencePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('newProject.saggista.targetAudienceHint')}
              </p>
            </div>

            {/* Structure */}
            <div>
              <label htmlFor="structure" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.saggista.structureLabel')}
              </label>
              <select
                id="structure"
                name="structure"
                value={formData.structure}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
              >
                <option value="popular">{t('newProject.saggista.structurePopular')}</option>
                <option value="academic">{t('newProject.saggista.structureAcademic')}</option>
                <option value="journalistic">{t('newProject.saggista.structureJournalistic')}</option>
                <option value="technical">{t('newProject.saggista.structureTechnical')}</option>
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('newProject.saggista.structureHint')}
              </p>
            </div>
          </div>
        )}

        {/* Redattore-specific configuration */}
        {formData.area === 'redattore' && (
          <div className="space-y-6 p-6 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('newProject.redattore.sectionTitle')}
            </h3>

            {/* Article Type */}
            <div>
              <label htmlFor="articleType" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.redattore.articleTypeLabel')}
              </label>
              <select
                id="articleType"
                name="articleType"
                value={formData.articleType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
              >
                <option value="">{t('newProject.redattore.articleTypeSelectPlaceholder')}</option>
                <option value="blog_post">{t('newProject.redattore.articleTypeBlogPost')}</option>
                <option value="news_article">{t('newProject.redattore.articleTypeNewsArticle')}</option>
                <option value="press_release">{t('newProject.redattore.articleTypePressRelease')}</option>
                <option value="product_review">{t('newProject.redattore.articleTypeProductReview')}</option>
                <option value="how_to">{t('newProject.redattore.articleTypeHowTo')}</option>
                <option value="listicle">{t('newProject.redattore.articleTypeListicle')}</option>
                <option value="opinion_piece">{t('newProject.redattore.articleTypeOpinionPiece')}</option>
                <option value="interview">{t('newProject.redattore.articleTypeInterview')}</option>
              </select>
            </div>

            {/* SEO Keywords */}
            <div>
              <label htmlFor="seoKeywords" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.redattore.seoKeywordsLabel')}
              </label>
              <input
                id="seoKeywords"
                name="seoKeywords"
                type="text"
                value={formData.seoKeywords}
                onChange={handleChange}
                placeholder={t('newProject.redattore.seoKeywordsPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('newProject.redattore.seoKeywordsHint')}
              </p>
            </div>

            {/* Word Count Target */}
            <div>
              <label htmlFor="redattoreWordCount" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('newProject.redattore.wordCountLabel')}
              </label>
              <input
                id="redattoreWordCount"
                name="redattoreWordCount"
                type="number"
                min="100"
                max="5000"
                step="50"
                value={formData.redattoreWordCount}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('newProject.redattore.wordCountHint')}
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || isSubmittingRef.current || !formData.area || !formData.title}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md transition-colors disabled:cursor-not-allowed text-lg"
          >
            {loading ? t('newProject.buttons.creating') : t('newProject.buttons.create')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('newProject.buttons.reset')}
          </button>
          <Link
            to="/dashboard"
            className="px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
          >
            {t('newProject.buttons.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default NewProject;
