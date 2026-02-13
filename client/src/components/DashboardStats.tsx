import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FileEdit, Clock, CheckCircle } from 'lucide-react';
import { Project } from '../services/api';

interface DashboardStatsProps {
  projects: Project[];
}

interface StatCard {
  key: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  value: number;
  labelKey: string;
}

export default function DashboardStats({ projects }: DashboardStatsProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const total = projects.length;
    const draft = projects.filter(p => p.status === 'draft').length;
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;

    return { total, draft, inProgress, completed };
  }, [projects]);

  const statCards: StatCard[] = [
    {
      key: 'total',
      icon: <FolderOpen className="w-6 h-6" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
      value: stats.total,
      labelKey: 'dashboard.stats.total',
    },
    {
      key: 'draft',
      icon: <FileEdit className="w-6 h-6" />,
      iconBg: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-600 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-600',
      value: stats.draft,
      labelKey: 'dashboard.stats.draft',
    },
    {
      key: 'inProgress',
      icon: <Clock className="w-6 h-6" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-800',
      value: stats.inProgress,
      labelKey: 'dashboard.stats.inProgress',
    },
    {
      key: 'completed',
      icon: <CheckCircle className="w-6 h-6" />,
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
      value: stats.completed,
      labelKey: 'dashboard.stats.completed',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statCards.map((card) => (
        <div
          key={card.key}
          className={`bg-white dark:bg-gray-800 rounded-xl border ${card.borderColor} p-4 shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.iconBg}`}>
              <span className={card.iconColor}>{card.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {card.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(card.labelKey)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
