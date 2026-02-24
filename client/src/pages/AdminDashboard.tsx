import { useState, useEffect } from 'react';
import {
  Users,
  FolderOpen,
  FileText,
  Activity,
  TrendingUp,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useToastNotification } from '../components/Toast';

interface UserStats {
  total: number;
  byRole: {
    free: number;
    premium: number;
    lifetime: number;
    admin: number;
  };
  activeLast30Days: number;
  newLast30Days: number;
}

interface ProjectStats {
  total: number;
  byArea: {
    romanziere: number;
    saggista: number;
    redattore: number;
  };
}

interface WordStats {
  total: number;
}

interface StatsResponse {
  totalUsers: number;
  usersByRole: {
    free: number;
    premium: number;
    lifetime: number;
    admin: number;
  };
  totalProjects: number;
  projectsByArea: {
    romanziere: number;
    saggista: number;
    redattore: number;
  };
  totalWordsGenerated: number;
  activeUsersLast30Days: number;
  newUsersLast30Days: number;
  totalChapters: number;
}

interface RegistrationByDate {
  date: string;
  count: number;
}

const AdminDashboard = () => {
  const toast = useToastNotification();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [registrationsByDate, setRegistrationsByDate] = useState<RegistrationByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:3001/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Accesso negato. Privilegi admin richiesti.');
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
      setError('Errore nel caricamento delle statistiche.');
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
      month: 'short'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento statistiche...</p>
        </div>
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

  // Calculate percentages for charts
  const totalRoles = stats.usersByRole.free + stats.usersByRole.premium + stats.usersByRole.lifetime + stats.usersByRole.admin;
  const rolePercentages = {
    free: totalRoles > 0 ? (stats.usersByRole.free / totalRoles) * 100 : 0,
    premium: totalRoles > 0 ? (stats.usersByRole.premium / totalRoles) * 100 : 0,
    lifetime: totalRoles > 0 ? (stats.usersByRole.lifetime / totalRoles) * 100 : 0,
    admin: totalRoles > 0 ? (stats.usersByRole.admin / totalRoles) * 100 : 0
  };

  const totalAreas = stats.projectsByArea.romanziere + stats.projectsByArea.saggista + stats.projectsByArea.redattore;
  const areaPercentages = {
    romanziere: totalAreas > 0 ? (stats.projectsByArea.romanziere / totalAreas) * 100 : 0,
    saggista: totalAreas > 0 ? (stats.projectsByArea.saggista / totalAreas) * 100 : 0,
    redattore: totalAreas > 0 ? (stats.projectsByArea.redattore / totalAreas) * 100 : 0
  };

  // Generate mock data for registration trend (last 30 days)
  const generateMockTrend = () => {
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trend.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 5)
      });
    }
    return trend;
  };

  const registrationTrend = generateMockTrend();
  const maxRegistrations = Math.max(...registrationTrend.map(r => r.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Panoramica delle statistiche della piattaforma
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className={`flex items-center text-sm font-medium ${
              stats.newUsersLast30Days > 0 ? 'text-green-600' : 'text-gray-500'
            }`}>
              {stats.newUsersLast30Days > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +{stats.newUsersLast30Days}
                </>
              ) : (
                '0'
              )}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatNumber(stats.totalUsers)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Totale Utenti</p>
        </div>

        {/* Active Users */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              30 giorni
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatNumber(stats.activeUsersLast30Days)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Utenti Attivi</p>
        </div>

        {/* Total Projects */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FolderOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {totalAreas > 0 ? formatNumber(totalAreas) : '0'}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatNumber(stats.totalProjects)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Totale Progetti</p>
        </div>

        {/* Total Words */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats.totalChapters > 0 ? formatNumber(stats.totalChapters) : '0'} capitoli
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {formatNumber(stats.totalWordsGenerated)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Parole Generate</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role - Donut Chart */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Distribuzione Utenti per Ruolo
          </h2>
          <div className="flex items-center gap-8">
            {/* SVG Donut Chart */}
            <div className="relative w-48 h-48 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-gray-200 dark:text-gray-700"
                />
                {/* Free Users - Gray */}
                {rolePercentages.free > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="20"
                    strokeDasharray={`${rolePercentages.free * 2.51} 251`}
                    strokeDashoffset="0"
                  />
                )}
                {/* Premium Users - Blue */}
                {rolePercentages.premium > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="20"
                    strokeDasharray={`${rolePercentages.premium * 2.51} 251`}
                    strokeDashoffset={`-${rolePercentages.free * 2.51}`}
                  />
                )}
                {/* Lifetime Users - Amber */}
                {rolePercentages.lifetime > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="20"
                    strokeDasharray={`${rolePercentages.lifetime * 2.51} 251`}
                    strokeDashoffset={`-${(rolePercentages.free + rolePercentages.premium) * 2.51}`}
                  />
                )}
                {/* Admin Users - Purple */}
                {rolePercentages.admin > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="20"
                    strokeDasharray={`${rolePercentages.admin * 2.51} 251`}
                    strokeDashoffset={`-${(rolePercentages.free + rolePercentages.premium + rolePercentages.lifetime) * 2.51}`}
                  />
                )}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(stats.totalUsers)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">utenti</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Free</span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(stats.usersByRole.free)} ({rolePercentages.free.toFixed(1)}%)
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Premium</span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(stats.usersByRole.premium)} ({rolePercentages.premium.toFixed(1)}%)
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Lifetime</span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(stats.usersByRole.lifetime)} ({rolePercentages.lifetime.toFixed(1)}%)
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Admin</span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(stats.usersByRole.admin)} ({rolePercentages.admin.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects by Area - Bar Chart */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Progetti per Area
          </h2>
          <div className="space-y-6">
            {/* Romanziere */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Romanziere</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.projectsByArea.romanziere)} ({areaPercentages.romanziere.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                  style={{ width: `${areaPercentages.romanziere}%` }}
                >
                  {areaPercentages.romanziere > 10 && (
                    <span className="text-xs font-semibold text-white">{areaPercentages.romanziere.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Saggista */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Saggista</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.projectsByArea.saggista)} ({areaPercentages.saggista.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                  style={{ width: `${areaPercentages.saggista}%` }}
                >
                  {areaPercentages.saggista > 10 && (
                    <span className="text-xs font-semibold text-white">{areaPercentages.saggista.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Redattore */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Redattore</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.projectsByArea.redattore)} ({areaPercentages.redattore.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                  style={{ width: `${areaPercentages.redattore}%` }}
                >
                  {areaPercentages.redattore > 10 && (
                    <span className="text-xs font-semibold text-white">{areaPercentages.redattore.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Totale Progetti</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.totalProjects)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Trend Line Chart */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Nuove Registrazioni (Ultimi 30 giorni)
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 inline mr-1" />
            Ultimo mese
          </div>
        </div>

        <div className="relative h-64">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 py-2">
            <span>{maxRegistrations}</span>
            <span>{Math.round(maxRegistrations / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <svg
            viewBox={`0 0 ${registrationTrend.length * 20} 100`}
            className="w-full h-full ml-12"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
              <line
                key={frac}
                x1="0"
                y1={frac * 100}
                x2={registrationTrend.length * 20}
                y2={frac * 100}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-200 dark:text-gray-700"
              />
            ))}

            {/* Area fill */}
            <path
              d={`M 0 ${100 - (registrationTrend[0].count / maxRegistrations) * 100} ${
                registrationTrend.map((r, i) => `L ${i * 20} ${100 - (r.count / maxRegistrations) * 100}`).join(' ')
              } L ${(registrationTrend.length - 1) * 20} 100 L 0 100 Z`}
              fill="url(#gradient)"
              opacity="0.3"
            />

            {/* Line */}
            <path
              d={`M 0 ${100 - (registrationTrend[0].count / maxRegistrations) * 100} ${
                registrationTrend.map((r, i) => `L ${i * 20} ${100 - (r.count / maxRegistrations) * 100}`).join(' ')
              }`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {registrationTrend.map((r, i) => (
              <circle
                key={i}
                cx={i * 20}
                cy={100 - (r.count / maxRegistrations) * 100}
                r="2"
                fill="#3B82F6"
                className="hover:r-3 transition-all cursor-pointer"
              >
                <title>{formatDate(r.date)}: {r.count} registrazioni</title>
              </circle>
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="ml-12 mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDate(registrationTrend[0].date)}</span>
          <span>{formatDate(registrationTrend[Math.floor(registrationTrend.length / 2)].date)}</span>
          <span>{formatDate(registrationTrend[registrationTrend.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
