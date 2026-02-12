import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { apiService } from '../services/api';
import { useFocusTrapSimple } from '../hooks/useFocusTrap';

export type ViewMode = 'grid' | 'list' | 'compact';
export type CardSize = 'small' | 'medium' | 'large';

export interface DashboardLayout {
  viewMode: ViewMode;
  cardSize: CardSize;
  showMetadata: boolean;
  showWordCount: boolean;
  showLastModified: boolean;
}

const DEFAULT_LAYOUT: DashboardLayout = {
  viewMode: 'grid',
  cardSize: 'medium',
  showMetadata: true,
  showWordCount: true,
  showLastModified: true,
};

interface DashboardLayoutSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (layout: DashboardLayout) => void;
  currentLayout: DashboardLayout;
}

export function DashboardLayoutSettings({
  isOpen,
  onClose,
  onApply,
  currentLayout,
}: DashboardLayoutSettingsProps) {
  const [layout, setLayout] = useState<DashboardLayout>(currentLayout);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const modalRef = useFocusTrapSimple(isOpen);

  useEffect(() => {
    setLayout(currentLayout);
  }, [currentLayout]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await apiService.updateUserPreferences({
        dashboard_layout_json: JSON.stringify(layout),
      });
      onApply(layout);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save layout preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-layout-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2
                id="dashboard-layout-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100"
              >
                Personalizza Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configura la visualizzazione dei tuoi progetti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* View Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Modalità di visualizzazione
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['grid', 'list', 'compact'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout({ ...layout, viewMode: mode })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    layout.viewMode === mode
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded ${
                      layout.viewMode === mode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {mode === 'grid' && (
                        <div className="grid grid-cols-2 gap-0.5 p-1.5">
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                        </div>
                      )}
                      {mode === 'list' && (
                        <div className="flex flex-col gap-0.5 p-1.5">
                          <div className="w-5 h-1 bg-white rounded-sm"></div>
                          <div className="w-5 h-1 bg-white rounded-sm"></div>
                          <div className="w-5 h-1 bg-white rounded-sm"></div>
                        </div>
                      )}
                      {mode === 'compact' && (
                        <div className="flex flex-col gap-0.5 p-1.5">
                          <div className="w-6 h-0.5 bg-white rounded-sm"></div>
                          <div className="w-6 h-0.5 bg-white rounded-sm"></div>
                          <div className="w-6 h-0.5 bg-white rounded-sm"></div>
                        </div>
                      )}
                    </div>
                    <span className={`font-medium ${
                      layout.viewMode === mode ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {mode === 'grid' && 'Griglia'}
                      {mode === 'list' && 'Lista'}
                      {mode === 'compact' && 'Compatta'}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    layout.viewMode === mode ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {mode === 'grid' && 'Card quadrate con anteprima'}
                    {mode === 'list' && 'Elenco dettagliato orizzontale'}
                    {mode === 'compact' && 'Lista densa per molti progetti'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Card Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Dimensione card (solo griglia)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['small', 'medium', 'large'] as CardSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setLayout({ ...layout, cardSize: size })}
                  disabled={layout.viewMode !== 'grid'}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    layout.cardSize === size && layout.viewMode === 'grid'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${layout.viewMode !== 'grid' ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <div className={`w-12 h-12 mx-auto mb-2 rounded border-2 border-dashed ${
                    layout.cardSize === size && layout.viewMode === 'grid'
                      ? 'border-primary-500 bg-primary-100 dark:bg-primary-900'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <div className={`w-full h-full rounded bg-current ${
                      size === 'small' ? 'opacity-40' : size === 'medium' ? 'opacity-60' : 'opacity-80'
                    }`}></div>
                  </div>
                  <span className={`text-sm font-medium ${
                    layout.cardSize === size && layout.viewMode === 'grid'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {size === 'small' && 'Piccola'}
                    {size === 'medium' && 'Media'}
                    {size === 'large' && 'Grande'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Show/Hide Metadata */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Informazioni da mostrare
            </label>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={layout.showMetadata}
                    onChange={(e) => setLayout({ ...layout, showMetadata: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Mostra metadati progetto</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Genere, tono, pubblico target</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={layout.showWordCount}
                    onChange={(e) => setLayout({ ...layout, showWordCount: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Mostra conteggio parole</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Numero di parole nel progetto</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={layout.showLastModified}
                    onChange={(e) => setLayout({ ...layout, showLastModified: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Mostra ultima modifica</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data dell'ultimo aggiornamento</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Ripristina predefiniti
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvataggio...
                </>
              ) : saveSuccess ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvato!
                </>
              ) : (
                'Applica modifiche'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayoutSettings;
