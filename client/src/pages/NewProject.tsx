import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Zap } from 'lucide-react';
import { apiService, type CreateProjectData } from '../services/api';
import { useToastNotification } from '../components/Toast';

type AreaType = 'romanziere' | 'saggista' | 'redattore';

interface AreaOption {
  id: AreaType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const AREAS: AreaOption[] = [
  {
    id: 'romanziere',
    name: 'Romanziere',
    description: 'Scrivi romanzi con personaggi complessi, trame articolate e mondi immaginari',
    icon: BookOpen,
    color: 'bg-amber-500',
  },
  {
    id: 'saggista',
    name: 'Saggista',
    description: 'Approfondisci temi con analisi dettagliate, fonti e citazioni',
    icon: FileText,
    color: 'bg-teal-500',
  },
  {
    id: 'redattore',
    name: 'Redattore',
    description: 'Crea articoli veloci, ottimizzati per la lettura e il web',
    icon: Zap,
    color: 'bg-rose-500',
  },
];

function NewProject() {
  const navigate = useNavigate();
  const toast = useToastNotification();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    area: AreaType | null;
    genre: string;
    // Redattore-specific fields
    articleType: string;
    seoKeywords: string;
    redattoreWordCount: number;
    // Saggista-specific fields
    topic: string;
    depth: 'deep_dive' | 'panoramic_overview';
    targetAudience: string;
    structure: string;
  }>({
    title: '',
    description: '',
    area: null,
    genre: '',
    articleType: '',
    seoKeywords: '',
    redattoreWordCount: 500,
    topic: '',
    depth: 'deep_dive',
    targetAudience: '',
    structure: 'popular',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleAreaSelect = (area: AreaType) => {
    setFormData({ ...formData, area });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.area) {
      setError('Seleziona un\'area per il progetto');
      return;
    }

    setLoading(true);

    try {
      const projectData: CreateProjectData = {
        title: formData.title,
        description: formData.description || undefined,
        area: formData.area,
        genre: formData.genre || undefined,
        // Redattore-specific settings in settings_json
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
        word_count_target: formData.area === 'redattore' ? formData.redattoreWordCount : undefined,
      };

      const response = await apiService.createProject(projectData);

      // Reset form to prevent resubmission on back navigation
      setFormData({
        title: '',
        description: '',
        area: null,
        genre: '',
        articleType: '',
        seoKeywords: '',
        redattoreWordCount: 500,
        topic: '',
        depth: 'deep_dive',
        targetAudience: '',
        structure: 'popular',
      });

      // Redirect to newly created project (replace history to prevent back navigation to form)
      toast.success('Progetto creato con successo!');
      navigate(`/projects/${response.project.id}`, { replace: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore durante la creazione del progetto';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      area: null,
      genre: '',
      articleType: '',
      seoKeywords: '',
      redattoreWordCount: 500,
      topic: '',
      depth: 'deep_dive',
      targetAudience: '',
      structure: 'popular',
    });
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Torna alla Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Crea un nuovo progetto
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scegli l'area e configura il tuo progetto di scrittura
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Area Selection */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            1. Seleziona l'area del progetto *
          </label>
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
                    <span className="ml-3 text-xl font-bold">{areaOption.name}</span>
                  </div>
                  <p className={`text-sm ${isSelected ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                    {areaOption.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            2. Titolo del progetto *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="Il mio romanzo, Il mio saggio, Il mio articolo..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white text-lg"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            3. Descrizione (opzionale)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descrivi brevemente di cosa tratta il progetto..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white text-lg resize-none"
          />
        </div>

        {/* Genre (for Romanziere) */}
        {formData.area === 'romanziere' && (
          <div>
            <label htmlFor="genre" className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              4. Genere letterario (opzionale)
            </label>
            <input
              id="genre"
              name="genre"
              type="text"
              value={formData.genre}
              onChange={handleChange}
              placeholder="Fantasy, Thriller, Romance, Sci-Fi..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white text-lg"
            />
          </div>
        )}

        {/* Saggista-specific configuration */}
        {formData.area === 'saggista' && (
          <div className="space-y-6 p-6 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Configurazione Saggista
            </h3>

            {/* Topic */}
            <div>
              <label htmlFor="topic" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                4. Argomento del saggio
              </label>
              <input
                id="topic"
                name="topic"
                type="text"
                value={formData.topic}
                onChange={handleChange}
                placeholder="es: Il cambiamento climatico, La storia di Roma..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Descrivi l'argomento principale del saggio
              </p>
            </div>

            {/* Depth */}
            <div>
              <label className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
                5. Tipo di approfondimento
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
                    <div className="font-medium text-gray-900 dark:text-gray-100">Approfondimento (Deep Dive)</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Analisi dettagliata e approfondita di un argomento specifico</div>
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
                    <div className="font-medium text-gray-900 dark:text-gray-100">Panoramica (Overview)</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Visione d'insieme ampia con più temi correlati</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="targetAudience" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                6. Pubblico target
              </label>
              <input
                id="targetAudience"
                name="targetAudience"
                type="text"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder="es: Studenti universitari, Generale, Esperti del settore..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Chi è il pubblico previsto per questo saggio?
              </p>
            </div>

            {/* Structure */}
            <div>
              <label htmlFor="structure" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                7. Struttura del saggio
              </label>
              <select
                id="structure"
                name="structure"
                value={formData.structure}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
              >
                <option value="popular">Divulgativo</option>
                <option value="academic">Accademico</option>
                <option value="journalistic">Giornalistico</option>
                <option value="technical">Tecnico</option>
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Scegli lo stile e la struttura del saggio
              </p>
            </div>
          </div>
        )}

        {/* Redattore-specific configuration */}
        {formData.area === 'redattore' && (
          <div className="space-y-6 p-6 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Configurazione Redattore
            </h3>

            {/* Article Type */}
            <div>
              <label htmlFor="articleType" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                4. Tipo di articolo
              </label>
              <select
                id="articleType"
                name="articleType"
                value={formData.articleType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
              >
                <option value="">Seleziona tipo di articolo</option>
                <option value="blog_post">Blog Post</option>
                <option value="news_article">Articolo giornalistico</option>
                <option value="press_release">Comunicato stampa</option>
                <option value="product_review">Recensione prodotto</option>
                <option value="how_to">Guida tutorial (How-to)</option>
                <option value="listicle">Listicle (elenco puntato)</option>
                <option value="opinion_piece">Articolo di opinione</option>
                <option value="interview">Intervista</option>
              </select>
            </div>

            {/* SEO Keywords */}
            <div>
              <label htmlFor="seoKeywords" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                5. Parole chiave SEO (separate da virgola)
              </label>
              <input
                id="seoKeywords"
                name="seoKeywords"
                type="text"
                value={formData.seoKeywords}
                onChange={handleChange}
                placeholder="es: tecnologia, innovazione, intelligenza artificiale"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-800 dark:text-white text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Inserisci fino a 5 parole chiave per ottimizzare l'articolo per i motori di ricerca
              </p>
            </div>

            {/* Word Count Target */}
            <div>
              <label htmlFor="redattoreWordCount" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                6. Lunghezza target (parole)
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
                Numero di parole target per l'articolo (100-5000)
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || !formData.area || !formData.title}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md transition-colors disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Creazione in corso...' : 'Crea Progetto'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
          <Link
            to="/dashboard"
            className="px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}

export default NewProject;
