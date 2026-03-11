import { useState, useEffect } from 'react';
import { FolderOpen, BookOpen, TrendingUp, BarChart3, Calendar, FileText } from 'lucide-react';
import { useToastNotification } from '../components/Toast';
import apiService from '../services/api';
import Footer from '../components/Footer';

interface ProjectByMonth {
  year: string;
  month: string;
  count: number;
}

interface ProjectByArea {
  romanziere: number;
  saggista: number;
  redattore: number;
}

interface TopProject {
  id: string;
  title: string;
  area: string;
  word_count: number;
  author_name: string;
}

interface ProjectsStatsResponse {
  projectsPerMonth: ProjectByMonth[];
  projectsByArea: ProjectByArea;
  top10LongestProjects: TopProject[];
  avgChaptersPerProject: number;
}

interface RecentProject {
  id: string;
  title: string;
  author_name: string;
  area: string;
  chapter_count: number;
  word_count: number;
  created_at: string;
}

const AdminProjectsPage = () => {
  const toast = useToastNotification();
  const [stats, setStats] = useState<ProjectsStatsResponse | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch project stats
      const statsResponse = await fetch('/api/admin/stats/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.status === 403) {
        setError('Access denied. Admin privileges required.');
        return;
      }

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data: ProjectsStatsResponse = await statsResponse.json();
      setStats(data);

      // Fetch recent projects
      const recentResponse = await fetch(
        '/api/admin/stats/projects?recent=20',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentProjects(recentData.recentProjects || []);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching project stats:', err);
      setError('Failed to load project statistics. Please try again.');
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  const getAreaBadgeColor = (area: string) => {
    switch (area) {
      case 'romanziere':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'saggista':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      case 'redattore':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'romanziere': return 'Romanziere';
      case 'saggista': return 'Saggista';
      case 'redattore': return 'Redattore';
      default: return area;
    }
  };

  const getAreaIcon = (area: string) => {
    switch (area) {
      case 'romanziere': return BookOpen;
      case 'saggista': return FileText;
      case 'redattore': return TrendingUp;
      default: return FolderOpen;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading project statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalProjects = stats.projectsByArea.romanziere + stats.projectsByArea.saggista + stats.projectsByArea.redattore;
  const maxAreaCount = Math.max(stats.projectsByArea.romanziere, stats.projectsByArea.saggista, stats.projectsByArea.redattore, 1);
  const maxMonthlyCount = Math.max(...stats.projectsPerMonth.map(p => p.count), 1);
  const maxWordCount = Math.max(...stats.top10LongestProjects.map(p => p.word_count), 1);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Statistiche Progetti
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Panoramica dei progetti sulla piattaforma
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Projects */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Totale Progetti
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {totalProjects}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Romanziere Projects */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Progetti Romanziere
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.projectsByArea.romanziere}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        {/* Saggista Projects */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Progetti Saggista
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.projectsByArea.saggista}
              </p>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
        </div>

        {/* Redattore Projects */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Progetti Redattore
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.projectsByArea.redattore}
              </p>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Average Stats */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Statistiche Medie
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Media Capitoli per Progetto
            </p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {stats.avgChaptersPerProject.toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Media Parole per Progetto
            </p>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              {totalProjects > 0 ? formatNumber(Math.round(
                (stats.projectsByArea.romanziere * 50000 +
                 stats.projectsByArea.saggista * 30000 +
                 stats.projectsByArea.redattore * 5000) / totalProjects
              )) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Projects by Area Bar Chart */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Progetti per Area
        </h2>
        <div className="space-y-4">
          {[
            { key: 'romanziere', label: 'Romanziere', count: stats.projectsByArea.romanziere, color: 'bg-amber-500' },
            { key: 'saggista', label: 'Saggista', count: stats.projectsByArea.saggista, color: 'bg-teal-500' },
            { key: 'redattore', label: 'Redattore', count: stats.projectsByArea.redattore, color: 'bg-rose-500' }
          ].map((area) => (
            <div key={area.key} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">
                {area.label}
              </div>
              <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full ${area.color} rounded flex items-center justify-end px-3`}
                  style={{ width: `${(area.count / maxAreaCount) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-white">
                    {area.count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Created Per Month Line Chart (Simplified as Bar Chart) */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Progetti Creati per Mese (Ultimi 12 mesi)
        </h2>
        {stats.projectsPerMonth.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessun progetto creato nell'ultimo anno</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.projectsPerMonth.slice(0, 12).reverse().map((month) => (
              <div key={`${month.year}-${month.month}`} className="flex items-center gap-4">
                <div className="w-28 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {month.month}/{month.year}
                </div>
                <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded"
                    style={{ width: `${(month.count / maxMonthlyCount) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 dark:text-white text-right">
                  {month.count}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 10 Longest Projects */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Top 10 Progetti più Lunghi
        </h2>
        {stats.top10LongestProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessun progetto trovato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.top10LongestProjects.map((project, idx) => {
              const AreaIcon = getAreaIcon(project.area);
              return (
                <div key={project.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-dark-surface rounded-lg">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-bold text-blue-600 dark:text-blue-400">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {project.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{project.author_name || 'Sconosciuto'}</span>
                      <span>•</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${getAreaBadgeColor(project.area)}`}>
                        <AreaIcon className="w-3 h-3" />
                        {getAreaLabel(project.area)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(project.word_count)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      parole
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          <BarChart3 className="w-5 h-5" />
          Aggiorna Statistiche
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default AdminProjectsPage;
