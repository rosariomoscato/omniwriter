import { useState, useEffect, useMemo } from 'react';
import { Search, Target, Type, Save, X, TrendingUp, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
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

  // Calculate SEO score and suggestions
  const seoAnalysis = useMemo(() => {
    const keywords = getKeywordsList();
    let score = 0;
    const suggestions: string[] = [];

    // Check article type (20 points)
    if (settings.articleType) {
      score += 20;
    } else {
      suggestions.push('Seleziona un tipo di articolo per migliorare la SEO');
    }

    // Check keywords (40 points - 8 per keyword up to 5)
    if (keywords.length >= 5) {
      score += 40;
    } else if (keywords.length > 0) {
      score += keywords.length * 8;
      suggestions.push(`Aggiungi altre parole chiave (${5 - keywords.length} rimanenti) per ottimizzare la SEO`);
    } else {
      suggestions.push('Aggiungi almeno 5 parole chiave SEO per ottimizzare l\'articolo');
    }

    // Check keyword quality (20 points)
    const hasLongKeywords = keywords.some(k => k.length > 5);
    if (hasLongKeywords) {
      score += 10;
    } else if (keywords.length > 0) {
      suggestions.push('Usa parole chiave più specifiche (almeno 6 caratteri)');
    }

    const hasVariety = keywords.length >= 3 && new Set(keywords.map(k => k.toLowerCase())).size === keywords.length;
    if (hasVariety) {
      score += 10;
    } else if (keywords.length > 2) {
      suggestions.push('Evita parole chiave duplicate');
    }

    // Check word count target (20 points)
    if (settings.wordCountTarget >= 300 && settings.wordCountTarget <= 2000) {
      score += 20;
    } else if (settings.wordCountTarget < 300) {
      suggestions.push('Aumenta la lunghezza target ad almeno 300 parole per una migliore indicizzazione');
    } else {
      score += 10;
      suggestions.push('Considera una lunghezza tra 300-2000 parole per ottimizzare la SEO');
    }

    let rating = 'Poor';
    let color = 'red';
    if (score >= 80) {
      rating = 'Excellent';
      color = 'green';
    } else if (score >= 60) {
      rating = 'Good';
      color = 'yellow';
    } else if (score >= 40) {
      rating = 'Fair';
      color = 'orange';
    }

    return {
      score,
      maxScore: 100,
      rating,
      color,
      suggestions,
      keywordCount: keywords.length,
    };
  }, [settings.articleType, settings.seoKeywords, settings.wordCountTarget]);

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

        {/* SEO Score Section */}
        <div className="p-4 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">SEO Score</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${
                    seoAnalysis.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    seoAnalysis.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                    seoAnalysis.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {seoAnalysis.score}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">/ 100</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    seoAnalysis.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    seoAnalysis.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    seoAnalysis.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {seoAnalysis.rating}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 dark:text-gray-400">Parole chiave</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{seoAnalysis.keywordCount}/5</p>
            </div>
          </div>

          {/* SEO Suggestions */}
          {seoAnalysis.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Suggerimenti SEO:</p>
                  <ul className="space-y-1">
                    {seoAnalysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span>•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
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

      {/* SEO Score Preview in Edit Mode */}
      <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Anteprima SEO Score</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${
              seoAnalysis.color === 'green' ? 'text-green-600 dark:text-green-400' :
              seoAnalysis.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
              seoAnalysis.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {seoAnalysis.score}
            </span>
            <span className="text-gray-600 dark:text-gray-400">/100</span>
          </div>
        </div>
        {seoAnalysis.suggestions.length > 0 && (
          <div className="space-y-1">
            {seoAnalysis.suggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
              </div>
            ))}
            {seoAnalysis.suggestions.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                +{seoAnalysis.suggestions.length - 3} altri suggerimenti
              </p>
            )}
          </div>
        )}
        {seoAnalysis.suggestions.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Ottima configurazione SEO!</span>
          </div>
        )}
      </div>

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
