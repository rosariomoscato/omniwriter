import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Trash2,
  BookOpen,
  FileText,
  Download,
  Star,
  Calendar,
  User,
  Filter,
  X,
  AlertTriangle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import Footer from '../components/Footer';
import { useToastNotification } from '../components/Toast';

interface MarketplaceItem {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  author_name: string;
  author_display_name: string;
  description: string;
  category: string;
  genre: string;
  word_count: number;
  download_count: number;
  average_rating: number;
  review_count: number;
  is_visible: number;
  is_approved: number;
  published_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MarketplaceStats {
  totalListings: number;
  visibleListings: number;
  hiddenListings: number;
  totalDownloads: number;
  totalReviews: number;
  averageRating: number;
  topDownloaded: MarketplaceItem[];
  topRated: MarketplaceItem[];
  listingsByCategory: Array<{ category: string; count: number }>;
}

const AdminMarketplacePage = () => {
  const toast = useToastNotification();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const fetchItems = async (page: number, searchQuery: string, category: string, visibility: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (searchQuery) params.append('search', searchQuery);
      if (category) params.append('category', category);
      if (visibility === 'visible') params.append('is_visible', '1');
      if (visibility === 'hidden') params.append('is_visible', '0');

      const response = await fetch(`/api/marketplace/admin?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Accesso negato. Privilegi admin richiesti.');
        setItems([]);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch marketplace items');
      }

      const data = await response.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      setError('');
    } catch (err) {
      console.error('Error fetching marketplace items:', err);
      setError('Impossibile caricare le opere. Verifica la connessione e riprova.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/marketplace/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchItems(pagination.page, search, categoryFilter, visibilityFilter);
    fetchStats();
  }, [pagination.page, search, categoryFilter, visibilityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCategoryFilterChange = (category: string) => {
    setCategoryFilter(category);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleVisibilityFilterChange = (visibility: string) => {
    setVisibilityFilter(visibility);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryFilter('');
    setVisibilityFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleVisibility = async (itemId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/marketplace/${itemId}/hide`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle visibility');
      }

      // Update local state
      setItems(items.map(item =>
        item.id === itemId
          ? { ...item, is_visible: item.is_visible ? 0 : 1 }
          : item
      ));
      fetchStats(); // Refresh stats
      toast.success('Visibilità aggiornata con successo');
    } catch (err) {
      console.error('Error toggling visibility:', err);
      toast.error('Errore durante l\'aggiornamento della visibilità');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/marketplace/${itemId}/admin`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Remove item from local state
      setItems(items.filter(item => item.id !== itemId));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      setDeleteConfirm(null);
      fetchStats(); // Refresh stats
      toast.success('Opera eliminata con successo');
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Errore durante l\'eliminazione dell\'opera');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.round(count / 1000)}k`;
    }
    return String(count);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          className={i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'romanziere':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            <BookOpen size={12} />
            Romanziere
          </span>
        );
      case 'saggista':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <FileText size={12} />
            Saggista
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            {category}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento opere...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestione Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci le opere pubblicate nel marketplace
          </p>
        </div>
        <button
          onClick={() => {
            fetchItems(pagination.page, search, categoryFilter, visibilityFilter);
            fetchStats();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.totalListings}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Totale Opere</p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.visibleListings}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visibili</p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <EyeOff className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.hiddenListings}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Nascoste</p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.totalDownloads}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Download Totali</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cerca per titolo, autore o descrizione..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Cerca
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtri:
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Categoria:</label>
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutte</option>
            <option value="romanziere">Romanziere</option>
            <option value="saggista">Saggista</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Stato:</label>
          <select
            value={visibilityFilter}
            onChange={(e) => handleVisibilityFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti</option>
            <option value="visible">Visibili</option>
            <option value="hidden">Nascoste</option>
          </select>
        </div>

        {(search || categoryFilter || visibilityFilter) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Cancella filtri
          </button>
        )}
      </div>

      {/* Results Info */}
      {pagination.total > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {items.length} di {pagination.total} opere
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Opera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Autore
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statistiche
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pubblicato il
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Nessuna opera trovata
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {item.title}
                        </div>
                        {item.genre && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Genere: {item.genre}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                          {item.author_display_name?.charAt(0).toUpperCase() || item.author_name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.author_display_name || item.author_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCategoryBadge(item.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Download size={12} />
                          <span>{item.download_count} download</span>
                        </div>
                        {item.review_count > 0 && (
                          <div className="flex items-center gap-2">
                            {renderStars(item.average_rating)}
                            <span>({item.review_count})</span>
                          </div>
                        )}
                        {item.word_count > 0 && (
                          <div className="text-xs">
                            {formatWordCount(item.word_count)} parole
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.published_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        item.is_visible
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      }`}>
                        {item.is_visible ? (
                          <>
                            <Eye size={12} />
                            Visibile
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} />
                            Nascosto
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors"
                      title={item.is_visible ? 'Nascondi' : 'Mostra'}
                    >
                      {item.is_visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: item.id, title: item.title })}
                      className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200 transition-colors"
                      title="Elimina opera"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pagina {pagination.page} di {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Precedente
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Successiva
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Conferma Eliminazione
              </h3>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Sei sicuro di voler eliminare l'opera <strong>"{deleteConfirm.title}"</strong>?
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Questa azione eliminerà permanentemente l'opera dal marketplace, inclusi tutti i download e le recensioni associate. Questa azione non può essere annullata.
              </span>
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDeleteItem(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Elimina Opera
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminMarketplacePage;
