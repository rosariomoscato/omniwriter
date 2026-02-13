import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, Edit3, ArrowRight } from 'lucide-react';
import { Project } from '../services/api';

interface DashboardAreasProps {
  projects: Project[];
}

interface AreaCard {
  key: string;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  path: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
}

export default function DashboardAreas({ projects }: DashboardAreasProps) {
  const { t } = useTranslation();

  const areaCounts = useMemo(() => {
    const romanziere = projects.filter(p => p.area === 'romanziere').length;
    const saggista = projects.filter(p => p.area === 'saggista').length;
    const redattore = projects.filter(p => p.area === 'redattore').length;

    return { romanziere, saggista, redattore };
  }, [projects]);

  const areaCards: AreaCard[] = [
    {
      key: 'romanziere',
      icon: <BookOpen className="w-8 h-8" />,
      titleKey: 'dashboard.areas.romanziere.title',
      descKey: 'dashboard.areas.romanziere.description',
      path: '/projects?area=romanziere',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    },
    {
      key: 'saggista',
      icon: <FileText className="w-8 h-8" />,
      titleKey: 'dashboard.areas.saggista.title',
      descKey: 'dashboard.areas.saggista.description',
      path: '/projects?area=saggista',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      borderColor: 'border-teal-200 dark:border-teal-800',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      iconColor: 'text-teal-600 dark:text-teal-400',
      hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-600',
    },
    {
      key: 'redattore',
      icon: <Edit3 className="w-8 h-8" />,
      titleKey: 'dashboard.areas.redattore.title',
      descKey: 'dashboard.areas.redattore.description',
      path: '/projects?area=redattore',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30',
      borderColor: 'border-rose-200 dark:border-rose-800',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
      hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
    },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('dashboard.areas.title')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {areaCards.map((card) => (
          <Link
            key={card.key}
            to={card.path}
            className={`${card.bgColor} border-2 ${card.borderColor} ${card.hoverBorder} rounded-xl p-5 transition-all hover:shadow-lg group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-3 rounded-lg ${card.iconBg}`}>
                <span className={card.iconColor}>{card.icon}</span>
              </div>
              <ArrowRight className={`w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors ${card.iconColor.replace('text-', 'group-hover:text-')}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t(card.titleKey)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {t(card.descKey)}
            </p>
            <p className={`text-sm font-medium ${card.iconColor}`}>
              {areaCounts[card.key as keyof typeof areaCounts]} {t('dashboard.areas.projects')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
