import { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Filter,
  User,
  Bot,
  Download,
  FolderPlus,
  LogIn,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useToastNotification } from '../components/Toast';

interface ActivityItem {
  id: string;
  action_type: string;
  action: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  target_user_id: string | null;
  target_user_email: string | null;
  details: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActivityResponse {
  activities: ActivityItem[];
  pagination: Pagination;
}

const ACTION_TYPES = [
  { value: '', label: 'Tutte le attività' },
  { value: 'admin', label: 'Azioni Admin' },
  { value: 'generation', label: 'Generazioni AI' },
  { value: 'export', label: 'Export' },
  { value: 'project', label: 'Progetti' },
  { value: 'login', label: 'Login' }
];

const AdminActivityPage = () => {
  const toast = useToastNotification();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionType, setActionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchActivities = async (page: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = new URL('http://localhost:3001/api/admin/activity');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '50');
      if (actionType) {
        url.searchParams.append('actionType', actionType);
      }
      if (startDate) {
        url.searchParams.append('startDate', startDate);
      }
      if (endDate) {
        url.searchParams.append('endDate', endDate);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Accesso negato. Privilegi admin richiesti.');
        setActivities([]);
        return;
      }

      if (!response.ok) {
        throw new Error('Impossibile caricare le attività');
      }

      const data: ActivityResponse = await response.json();
      setActivities(data.activities);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      console.error('Errore caricamento attività:', err);
      setError('Impossibile caricare le attività. Riprova.');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
  }, [actionType, startDate, endDate]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchActivities(newPage);
    }
  };

  const handleRefresh = () => {
    fetchActivities(pagination.page);
    toast.success('Attività aggiornate');
  };

  const clearFilters = () => {
    setActionType('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = actionType || startDate || endDate;

  // Helper functions
  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'generation':
        return <Bot className="w-4 h-4" />;
      case 'export':
        return <Download className="w-4 h-4" />;
      case 'project':
        return <FolderPlus className="w-4 h-4" />;
      case 'login':
        return <LogIn className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700';
      case 'generation':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      case 'export':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'project':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700';
      case 'login':
        return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getActionTypeLabel = (type: string) => {
    const found = ACTION_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  const formatActionDetails = (activity: ActivityItem) => {
    const details = parseDetails(activity.details);

    switch (activity.action_type) {
      case 'admin':
        if (activity.action === 'role_changed') {
          return `Ruolo cambiato da ${details.oldRole || '?'} a ${details.newRole || '?'}`;
        }
        if (activity.action === 'user_disabled') {
          return 'Utente sospeso';
        }
        if (activity.action === 'user_enabled') {
          return 'Utente riattivato';
        }
        if (activity.action === 'delete_user') {
          return `Utente eliminato (${details.projectsDeleted || 0} progetti, ${details.humanModelsDeleted || 0} modelli umani)`;
        }
        return activity.action;

      case 'generation':
        return `Fase: ${details.phase || '?'}, Modello: ${details.model || 'N/A'}${details.tokens ? `, Token: ${details.tokens}` : ''}`;

      case 'export':
        return `Formato: ${details.format?.toUpperCase() || '?'}`;

      case 'project':
        return `"${details.title || 'Senza titolo'}" (${details.area || '?'})`;

      case 'login':
        return 'Accesso effettuato';

      default:
        return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-purple-600" />
            Log Attività
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visualizza tutte le attività della piattaforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-surface'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtri
            {hasActiveFilters && (
              <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-0.5">
                {[actionType, startDate, endDate].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo attività
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {ACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data inizio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data fine
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancella filtri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && !error && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nessuna attività trovata</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {hasActiveFilters
              ? 'Prova a modificare i filtri per vedere più risultati'
              : 'Le attività appariranno qui quando verranno eseguite'}
          </p>
        </div>
      )}

      {/* Activity Table */}
      {!loading && activities.length > 0 && (
        <>
          <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Data/Ora
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Utente
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Azione
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Dettagli
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                  {activities.map((activity) => (
                    <tr
                      key={`${activity.id}-${activity.created_at}`}
                      className="hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDateTime(activity.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getActionTypeColor(activity.action_type)}`}>
                          {getActionTypeIcon(activity.action_type)}
                          {getActionTypeLabel(activity.action_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activity.user_name || activity.user_email ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                              {(activity.user_name || activity.user_email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.user_name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {activity.user_email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {activity.action}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                        <div className="truncate" title={formatActionDetails(activity)}>
                          {formatActionDetails(activity)}
                        </div>
                        {activity.target_user_email && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Target: {activity.target_user_email}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} attività
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Pagina {pagination.page} di {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminActivityPage;
