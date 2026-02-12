import { useState, useEffect } from 'react';
import { BookOpen, Layers, Users, Save, X, Target } from 'lucide-react';
import { apiService, Project } from '../services/api';

interface SaggistaConfigProps {
  project: Project;
  onUpdate: () => void;
}

interface SaggistaSettings {
  topic: string;
  depth: 'deep_dive' | 'panoramic_overview';
  targetAudience: string;
  structure: string;
}

const DEPTH_OPTIONS = [
  {
    value: 'deep_dive',
    label: 'Approfondimento (Deep Dive)',
    description: 'Analisi dettagliata e approfondita di un argomento specifico',
  },
  {
    value: 'panoramic_overview',
    label: 'Panoramica (Overview)',
    description: 'Visione d\'insieme ampia con più temi correlati',
  },
];

const STRUCTURE_OPTIONS = [
  { value: 'academic', label: 'Accademico' },
  { value: 'journalistic', label: 'Giornalistico' },
  { value: 'popular', label: 'Divulgativo' },
  { value: 'technical', label: 'Tecnico' },
];

export default function SaggistaConfig({ project, onUpdate }: SaggistaConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<SaggistaSettings>({
    topic: '',
    depth: 'deep_dive',
    targetAudience: '',
    structure: 'popular',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load settings from project
  useEffect(() => {
    try {
      const parsed = JSON.parse(project.settings_json || '{}');
      setSettings({
        topic: parsed.topic || '',
        depth: parsed.depth || 'deep_dive',
        targetAudience: parsed.targetAudience || '',
        structure: parsed.structure || 'popular',
      });
    } catch {
      setSettings({
        topic: '',
        depth: 'deep_dive',
        targetAudience: '',
        structure: 'popular',
      });
    }
  }, [project.settings_json]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const newSettingsJson = JSON.stringify({
        topic: settings.topic,
        depth: settings.depth,
        targetAudience: settings.targetAudience,
        structure: settings.structure,
      });

      await apiService.updateProject(project.id, {
        settings_json: newSettingsJson,
      });

      setIsOpen(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getDepthLabel = () => {
    const option = DEPTH_OPTIONS.find(d => d.value === settings.depth);
    return option?.label || 'Non impostato';
  };

  const getStructureLabel = () => {
    const option = STRUCTURE_OPTIONS.find(s => s.value === settings.structure);
    return option?.label || 'Non impostato';
  };

  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Configurazione Saggista
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Modifica
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Topic */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">Argomento:</span>
            </div>
            <p className="text-gray-900 dark:text-gray-100 ml-6">
              {settings.topic || <span className="text-gray-500 italic">Non impostato</span>}
            </p>
          </div>

          {/* Depth */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Layers className="w-4 h-4" />
              <span className="font-medium">Profondità:</span>
            </div>
            <p className="text-gray-900 dark:text-gray-100 ml-6">{getDepthLabel()}</p>
          </div>

          {/* Target Audience */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="font-medium">Pubblico target:</span>
            </div>
            <p className="text-gray-900 dark:text-gray-100 ml-6">
              {settings.targetAudience || <span className="text-gray-500 italic">Non impostato</span>}
            </p>
          </div>

          {/* Structure */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="font-medium">Struttura:</span>
            </div>
            <p className="text-gray-900 dark:text-gray-100 ml-6">{getStructureLabel()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Modifica configurazione Saggista
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
        {/* Topic */}
        <div>
          <label htmlFor="topic" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Argomento del saggio
          </label>
          <input
            id="topic"
            type="text"
            value={settings.topic}
            onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
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
            Tipo di approfondimento
          </label>
          <div className="space-y-3">
            {DEPTH_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  settings.depth === option.value
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="depth"
                  value={option.value}
                  checked={settings.depth === option.value}
                  onChange={(e) => setSettings({ ...settings, depth: e.target.value as 'deep_dive' | 'panoramic_overview' })}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label htmlFor="targetAudience" className="block text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Pubblico target
          </label>
          <input
            id="targetAudience"
            type="text"
            value={settings.targetAudience}
            onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })}
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
            Struttura del saggio
          </label>
          <select
            id="structure"
            value={settings.structure}
            onChange={(e) => setSettings({ ...settings, structure: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-800 dark:text-white text-lg"
          >
            {STRUCTURE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Scegli lo stile e la struttura del saggio
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
