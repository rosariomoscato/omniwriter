import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Home, BookOpen, FileText, Edit3, Settings, User, Clock } from 'lucide-react';

interface Project {
  id: number;
  title: string;
  area: 'romanziere' | 'saggista' | 'redattore';
  updated_at: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  recentProjects?: Project[];
}

export default function Sidebar({ isCollapsed, onToggle, recentProjects = [] }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const areas = [
    { id: 'romanziere', label: t('nav.romanziere'), icon: BookOpen, color: 'text-romanziere' },
    { id: 'saggista', label: t('nav.saggista'), icon: FileText, color: 'text-saggista' },
    { id: 'redattore', label: t('nav.redattore'), icon: Edit3, color: 'text-redattore' },
  ];

  const mainNav = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home, path: '/dashboard' },
    { id: 'human-model', label: t('nav.humanModel'), icon: User, path: '/human-model' },
    { id: 'sources', label: t('nav.sources'), icon: FileText, path: '/sources' },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/settings' },
  ];

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 z-40 flex flex-col
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-500">
              {t('app.name')}
            </h1>
          )}
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Main Navigation */}
        <div>
          {!isCollapsed && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
              {t('nav.dashboard')}
            </p>
          )}
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-200
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon size={20} className="text-gray-600 dark:text-gray-300 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Area Sections */}
        <div>
          {!isCollapsed && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
              Aree
            </p>
          )}
          <ul className="space-y-1">
            {areas.map((area) => (
              <li key={area.id}>
                <button
                  onClick={() => navigate(`/projects?area=${area.id}`)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-200
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? area.label : undefined}
                >
                  <area.icon size={20} className={`${area.color} flex-shrink-0`} />
                  {!isCollapsed && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {area.label}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div>
            {!isCollapsed && (
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                <Clock size={14} />
                {t('dashboard.recentProjects')}
              </p>
            )}
            <ul className="space-y-1">
              {recentProjects.slice(0, isCollapsed ? 0 : 5).map((project) => (
                <li key={project.id}>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={isCollapsed ? project.title : undefined}
                  >
                    {!isCollapsed && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            project.area === 'romanziere'
                              ? 'bg-romanziere'
                              : project.area === 'saggista'
                              ? 'bg-saggista'
                              : 'bg-redattore'
                          }`}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                          {project.title}
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Profile Section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate('/profile')}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? t('nav.profile') : undefined}
        >
          <User size={20} className="text-gray-600 dark:text-gray-300 flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('nav.profile')}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
