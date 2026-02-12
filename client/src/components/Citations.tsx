import { useState, useEffect, useRef } from 'react';
import { Quote, Plus, Trash2, Edit2, FileText, BookOpen } from 'lucide-react';
import { apiService } from '../services/api';
import { useToastNotification } from './Toast';
import { useFocusTrapSimple } from '../hooks/useFocusTrap';

interface Citation {
  id: string;
  title: string;
  authors: string;
  publication_year: string;
  publisher: string;
  url: string;
  page_numbers: string;
  citation_type: 'book' | 'journal' | 'website' | 'report' | 'other';
  notes: string;
  order_index: number;
}

interface CitationsProps {
  projectId: string;
}

const CITATION_TYPES = [
  { value: 'book', label: 'Libro' },
  { value: 'journal', label: 'Rivista' },
  { value: 'website', label: 'Sito web' },
  { value: 'report', label: 'Rapporto' },
  { value: 'other', label: 'Altro' },
];

export default function Citations({ projectId }: CitationsProps) {
  const toast = useToastNotification();
  const [citations, setCitations] = useState<Citation[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCitation, setEditingCitation] = useState<Citation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bibliography, setBibliography] = useState<string[]>([]);
  const [showBibliography, setShowBibliography] = useState(false);
  const bibliographyModalRef = useFocusTrapSimple(showBibliography);

  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    publication_year: '',
    publisher: '',
    url: '',
    page_numbers: '',
    citation_type: 'book' as 'book' | 'journal' | 'website' | 'report' | 'other',
    notes: '',
  });

  useEffect(() => {
    loadCitations();
  }, [projectId]);

  const loadCitations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProjectCitations(projectId);
      setCitations(response.citations);
    } catch (err: any) {
      setError(err.message || 'Failed to load citations');
    } finally {
      setLoading(false);
    }
  };

  const loadBibliography = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/projects/${projectId}/bibliography`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate bibliography');
      }
      const data = await response.json();
      setBibliography(data.citations);
      setShowBibliography(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate bibliography');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingCitation) {
        // Update existing citation
        await apiService.updateCitation(editingCitation.id, formData);
        setCitations(citations.map(c =>
          c.id === editingCitation.id ? { ...c, ...formData } : c
        ));
        setEditingCitation(null);
      } else {
        // Create new citation
        const response = await apiService.createCitation(projectId, formData);
        setCitations([...citations, response.citation]);
        setShowAddForm(false);
      }

      // Reset form
      setFormData({
        title: '',
        authors: '',
        publication_year: '',
        publisher: '',
        url: '',
        page_numbers: '',
        citation_type: 'book',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save citation');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (citation: Citation) => {
    setEditingCitation(citation);
    setFormData({
      title: citation.title,
      authors: citation.authors,
      publication_year: citation.publication_year || '',
      publisher: citation.publisher,
      url: citation.url || '',
      page_numbers: citation.page_numbers || '',
      citation_type: citation.citation_type,
      notes: citation.notes || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (citationId: string) => {
    if (!confirm('Are you sure you want to delete this citation?')) {
      return;
    }

    try {
      await apiService.deleteCitation(citationId);
      setCitations(citations.filter(c => c.id !== citationId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete citation');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingCitation(null);
    setFormData({
      title: '',
      authors: '',
      publication_year: '',
      publisher: '',
      url: '',
      page_numbers: '',
      citation_type: 'book',
      notes: '',
    });
    setError('');
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Citazioni
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({citations.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadBibliography}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Genera Bibliografia
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {editingCitation ? 'Modifica' : 'Aggiungi'} Citazione
          </button>
        </div>
      </div>

      {/* Bibliography Modal */}
      {showBibliography && (
        <div
          ref={bibliographyModalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bibliography-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3
                id="bibliography-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100"
              >
                Bibliografia Generata
              </h3>
              <button
                onClick={() => setShowBibliography(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {bibliography.length > 0 ? (
                <ol className="space-y-4">
                  {bibliography.map((citation, index) => (
                    <li key={index} value={index + 1} className="text-gray-900 dark:text-gray-100">
                      {citation}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-lg font-medium mb-1">Nessuna citazione</p>
                  <p className="text-sm">Aggiungi citazioni per generare la bibliografia</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bibliography.map((c, i) => `${i + 1}. ${c}`).join('\n'));
                  toast.success('Bibliografia copiata negli appunti!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Copia negli appunti
              </button>
              <button
                onClick={() => setShowBibliography(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Citation Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Titolo *
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Titolo dell'opera"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={saving}
                />
              </div>

              {/* Authors */}
              <div>
                <label htmlFor="authors" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Autori
                </label>
                <input
                  id="authors"
                  type="text"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  placeholder="Cognome, Nome"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={saving}
                />
              </div>

              {/* Citation Type */}
              <div>
                <label htmlFor="citation_type" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Tipo di citazione
                </label>
                <select
                  id="citation_type"
                  value={formData.citation_type}
                  onChange={(e) => setFormData({ ...formData, citation_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={saving}
                >
                  {CITATION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Publication Year */}
              <div>
                <label htmlFor="publication_year" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Anno di pubblicazione
                </label>
                <input
                  id="publication_year"
                  type="text"
                  value={formData.publication_year}
                  onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
                  placeholder="2024"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={saving}
                />
              </div>

              {/* Publisher */}
              <div>
                <label htmlFor="publisher" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Editore / Rivista
                </label>
                <input
                  id="publisher"
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Nome dell'editore"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={saving}
                />
              </div>

              {/* URL (for websites) */}
              {formData.citation_type === 'website' && (
                <div>
                  <label htmlFor="url" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    URL
                  </label>
                  <input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    disabled={saving}
                  />
                </div>
              )}

              {/* Page Numbers */}
              <div>
                <label htmlFor="page_numbers" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Numeri di pagina
                </label>
                <input
                  id="page_numbers"
                  type="text"
                  value={formData.page_numbers}
                  onChange={(e) => setFormData({ ...formData, page_numbers: e.target.value })}
                  placeholder="pp. 123-145"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Note
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive su questa citazione..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                disabled={saving}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
                disabled={saving}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving || !formData.title.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    {editingCitation ? 'Aggiorna' : 'Aggiungi'} Citazione
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Citations List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Caricamento citazioni...
          </div>
        ) : citations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Quote className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-medium mb-1">Nessuna citazione</p>
            <p className="text-sm">Aggiungi citazioni per tracciare le fonti del tuo saggio</p>
          </div>
        ) : (
          citations.map((citation, index) => (
            <div key={citation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-gray-400 dark:text-gray-500">
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      citation.citation_type === 'book' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                      citation.citation_type === 'journal' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      citation.citation_type === 'website' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {CITATION_TYPES.find(t => t.value === citation.citation_type)?.label || 'Altro'}
                    </span>
                  </div>
                  <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-1">
                    {citation.title}
                  </h3>
                  {citation.authors && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span className="font-medium">Autori:</span> {citation.authors}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {citation.publication_year && (
                      <span><span className="font-medium">Anno:</span> {citation.publication_year}</span>
                    )}
                    {citation.publisher && (
                      <span><span className="font-medium">Editore:</span> {citation.publisher}</span>
                    )}
                    {citation.page_numbers && (
                      <span><span className="font-medium">Pagine:</span> {citation.page_numbers}</span>
                    )}
                  </div>
                  {citation.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">Note:</span> {citation.notes}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(citation)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Modifica citazione"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(citation.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Elimina citazione"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
