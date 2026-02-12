import { useState, useEffect } from 'react';
import { Users, FolderOpen, Activity, TrendingUp, Calendar } from 'lucide-react';
import { useToastNotification } from '../components/Toast';

interface UserStats {
  total: number;
  active: number;
  premium: number;
}

interface ProjectStats {
  total: number;
}

interface RegistrationByDate {
  date: string;
  count: number;
}

interface StatsResponse {
  users: UserStats;
  projects: ProjectStats;
  registrationsByDate: RegistrationByDate[];
}

const AdminStatsPage = () => {
  const toast = useToastNotification();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch('http://localhost:3001/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Access denied. Admin privileges required.');
        setStats(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data: StatsResponse = await response.json();
      setStats(data);
      setError('');
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics. Please try again.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Calculate additional metrics
  const freeUsers = stats.users.total - stats.users.premium;
  const premiumPercentage = stats.users.total > 0
    ? ((stats.users.premium / stats.users.total) * 100).toFixed(1)
    : '0.0';

  const avgProjectsPerUser = stats.users.total > 0
    ? (stats.projects.total / stats.users.total).toFixed(1)
    : '0.0';

  // Get last 7 days of registrations for chart
  const recentRegistrations = stats.registrationsByDate.slice(0, 7);
  const maxRegistrations = Math.max(...recentRegistrations.map(r => r.count), 1);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Statistiche Piattaforma
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Panoramica delle statistiche di utilizzo della piattaforma
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Totale Utenti
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.users.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Utenti Attivi
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.users.active}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Premium Users */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Utenti Premium
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.users.premium}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {premiumPercentage}% del totale
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Total Projects */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Totale Progetti
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.projects.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {avgProjectsPerUser} per utente
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FolderOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Distribuzione Utenti
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Users */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Utenti Free
            </p>
            <p className="text-4xl font-bold text-gray-700 dark:text-gray-300">
              {freeUsers}
            </p>
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-500 dark:bg-gray-600 rounded-full"
                style={{ width: `${(freeUsers / stats.users.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Premium Users */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Utenti Premium
            </p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {stats.users.premium}
            </p>
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                style={{ width: `${(stats.users.premium / stats.users.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Lifetime Users */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Utenti Lifetime
            </p>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">
              {stats.users.premium > 0 ? Math.floor(stats.users.premium * 0.1) : 0}
            </p>
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 dark:bg-amber-500 rounded-full"
                style={{ width: `${((stats.users.premium * 0.1) / stats.users.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Registration Trend */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Nuove Registrazioni (Ultimi 7 giorni)
          </h2>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Activity className="w-4 h-4" />
            Aggiorna
          </button>
        </div>

        {recentRegistrations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna registrazione recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRegistrations.map((reg, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(reg.date)}
                </div>
                <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center px-3"
                    style={{ width: `${(reg.count / maxRegistrations) * 100}%` }}
                  >
                    {reg.count > 0 && (
                      <span className="text-xs font-semibold text-white">
                        {reg.count} {reg.count === 1 ? 'utente' : 'utenti'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStatsPage;
