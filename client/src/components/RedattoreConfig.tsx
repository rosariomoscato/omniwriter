import { useState, useEffect } from 'react';
import { Search, Target, Type, Save, X } from 'lucide-react';
import { apiService, Project } from '../services/api';

interface RedattoreConfigProps {
  project: Project;
  onUpdate: () => void;
}

interface RedattoreSettings {
  articleType: string;
  seoKeywords: string;
  wordCountTarget: number;
}

const ARTICLE_TYPES = [
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'news_article', label: 'Articolo giornalistico' },
  { value: 'press_release', label: 'Comunicato stampa' },
  { value: 'product_review', label: 'Recensione prodotto' },
  { value: 'how_to', label: 'Guida tutorial (How-to)' },
  { value: 'listicle', label: 'Listicle (elenco puntato)' },
  { value: 'opinion_piece', label: 'Articolo di opinione' },
  { value: 'interview', label: 'Intervista' },
];

export default function RedattoreConfig({ project, onUpdate }: RedattoreConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<RedattoreSettings>({
    articleType: '',
    seoKeywords: '',
    wordCountTarget: 500,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load settings from project
  useEffect(() => {
    try {
      const parsed = JSON.parse(project.settings_json || '{}');
      setSettings({
        articleType: parsed.articleType || '',
        seoKeywords: parsed.seoKeywords || '',
        wordCountTarget: parsed.wordCountTarget || project.word_count_target || 500,
      });
    } catch {
      setSettings({
        articleType: '',
        seoKeywords: '',
        wordCountTarget: project.word_count_target || 500,
      });
    }
  }, [project.settings_json, project.word_count_target]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const newSettingsJson = JSON.stringify({
        articleType: settings.articleType,
        seoKeywords: settings.seoKeywords,
        wordCountTarget: settings.wordCountTarget,
      });

      await apiService.updateProject(project.id, {
        settings_json: newSettingsJson,
        word_count_target: settings.wordCountTarget,
      });

      setIsOpen(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getArticleTypeLabel = () => {
    const type = ARTICLE_TYPES.find(t => t.value === settings.articleType);
    return type?.label || 'Non impostato';
  };

  const getKeywordsList = () => {
    if (!settings.seoKeywords) return [];
    return settings.seoKeywords.split(',').map(k => k.trim()).filter(k => k);
  };

  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Configurazione Redattore
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Modifica
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Article Type */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Type className="w-4 h-4" />
              <span className="font-medium">Tipo di articolo:</span>
            </div>
            <p className="text-gray-900 dark:text-gray-100 ml-6">{getArticleTypeLabel()}</p>
          </div>

          {/* SEO Keywords */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Search className="w-4 h-4" />
              <span className="font-medium">Parole chiave SEO:</span>
            </div>
            <div className="ml-6 flex flex-wrap gap-2">
              {getKeywordsList().length > 0 ? (
                getKeywordsList().map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded text-sm"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400 italic">Nessuna parola chiave impostata</span>
              )}
            </div>
          </div>

          {/* Word Count Target */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="font-medium">Lunghezza target:</span>
            </div>
            <p className="text-gray-900 dark:text-gray-100 ml-6">{settings.wordCountTarget} parole</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Modifica configurazione Redattore
          </h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm mx-4 mt-4">
          {error}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Article Type */}
        <div>
          <label htmlFor="articleType" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Tipo di articolo
          </label>
          <select
            id="articleType"
            value={settings.articleType}
            onChange={(e) => setSettings({ ...settings, articleType: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
          >
            <option value="">Seleziona tipo di articolo</option>
            {ARTICLE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* SEO Keywords */}
        <div>
          <label htmlFor="seoKeywords" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Parole chiave SEO
          </label>
          <input
            id="seoKeywords"
            type="text"
            value={settings.seoKeywords}
            onChange={(e) => setSettings({ ...settings, seoKeywords: e.target.value })}
            placeholder="es: tecnologia, innovazione, intelligenza artificiale"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Inserisci fino a 5 parole chiave separate da virgola
          </p>
          {getKeywordsList().length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {getKeywordsList().map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Word Count Target */}
        <div>
          <label htmlFor="wordCountTarget" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Lunghezza target (parole)
          </label>
          <input
            id="wordCountTarget"
            type="number"
            min="100"
            max="5000"
            step="50"
            value={settings.wordCountTarget}
            onChange={(e) => setSettings({ ...settings, wordCountTarget: parseInt(e.target.value) || 500 })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Numero di parole target per l'articolo (100-5000)
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salva configurazione
              </>
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
