import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Home, BookOpen, FileText, Edit3, Settings, User, Clock, FolderOpen, Sparkles, Activity, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const areas = [
    { id: 'romanziere', label: t('nav.romanziere'), icon: BookOpen, color: 'text-amber-500', bgColor: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
    { id: 'saggista', label: t('nav.saggista'), icon: FileText, color: 'text-teal-500', bgColor: 'hover:bg-teal-50 dark:hover:bg-teal-900/20' },
    { id: 'redattore', label: t('nav.redattore'), icon: Edit3, color: 'text-rose-500', bgColor: 'hover:bg-rose-50 dark:hover:bg-rose-900/20' },
  ];

  const mainNav = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home, path: '/dashboard' },
    { id: 'human-model', label: t('nav.humanModel'), icon: User, path: '/human-model' },
    { id: 'sources', label: t('nav.sources'), icon: FileText, path: '/sources' },
    { id: 'sagas', label: t('nav.sagas'), icon: FolderOpen, path: '/sagas' },
    { id: 'analyze-novel', label: t('nav.analyzeNovel'), icon: Sparkles, path: '#analyze-novel', isAction: true },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/settings' },
  ];

  // Admin-only menu - simplified, no user content
  const adminNav = [
    { id: 'admin-dashboard', label: 'Dashboard Admin', icon: LayoutDashboard, path: '/admin' },
    { id: 'admin-users', label: 'Utenti', icon: User, path: '/admin/users' },
    { id: 'admin-projects', label: 'Progetti', icon: FolderOpen, path: '/admin/projects' },
    { id: 'admin-activity', label: 'Attività', icon: Activity, path: '/admin/activity' },
  ];

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl
        border-r border-gray-100 dark:border-dark-border/50
        transition-all duration-300 z-40 flex flex-col
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 dark:border-dark-border/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-accent-400 bg-clip-text text-transparent">
                {t('app.name')}
              </span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated transition-all duration-200 group"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            ) : (
              <ChevronLeft size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6" aria-label="Main navigation">
        {isAdmin ? (
          // Admin-only menu - simplified
          <>
            {/* Admin Navigation */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold text-accent-600 dark:text-accent-400 uppercase tracking-widest mb-3 px-3">
                  Admin Panel
                </p>
              )}
              <ul className="space-y-1">
                {adminNav.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        hover:bg-accent-50 dark:hover:bg-accent-900/20
                        text-gray-600 dark:text-gray-400
                        hover:text-accent-700 dark:hover:text-accent-300
                        transition-all duration-200
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      aria-label={isCollapsed ? item.label : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon size={20} className="text-accent-500 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          // Regular user menu
          <>
            {/* Main Navigation */}
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">
                  {t('nav.dashboard')}
                </p>
              )}
              <ul className="space-y-1">
                {mainNav.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (item.isAction && item.id === 'analyze-novel') {
                          // Dispatch custom event to open analyze novel modal
                          window.dispatchEvent(new CustomEvent('open-analyze-novel-modal'));
                        } else if (!item.isAction) {
                          navigate(item.path);
                        }
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        ${item.id === 'analyze-novel'
                          ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/30'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-elevated hover:text-gray-900 dark:hover:text-white'}
                        transition-all duration-200
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      aria-label={isCollapsed ? item.label : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon size={20} className={`flex-shrink-0 ${item.id === 'analyze-novel' ? '' : 'text-gray-500 dark:text-gray-400'}`} />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">
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
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">
                  Aree
                </p>
              )}
              <ul className="space-y-1">
                {areas.map((area) => (
                  <li key={area.id}>
                    <button
                      onClick={() => navigate(`/projects?area=${area.id}`)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        ${area.bgColor}
                        text-gray-600 dark:text-gray-400
                        hover:text-gray-900 dark:hover:text-white
                        transition-all duration-200
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      aria-label={isCollapsed ? area.label : undefined}
                      title={isCollapsed ? area.label : undefined}
                    >
                      <area.icon size={20} className={`${area.color} flex-shrink-0`} />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">
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
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3 flex items-center gap-2">
                    <Clock size={12} />
                    {t('dashboard.recentProjects')}
                  </p>
                )}
                <ul className="space-y-1">
                  {recentProjects.slice(0, isCollapsed ? 0 : 5).map((project) => (
                    <li key={project.id}>
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated transition-all duration-200"
                        aria-label={isCollapsed ? project.title : undefined}
                        title={isCollapsed ? project.title : undefined}
                      >
                        {!isCollapsed && (
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                project.area === 'romanziere'
                                  ? 'bg-amber-500'
                                  : project.area === 'saggista'
                                  ? 'bg-teal-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
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
          </>
        )}
      </nav>

      {/* Profile Section - Only for non-admin users */}
      {!isAdmin && (
        <div className="p-3 border-t border-gray-100 dark:border-dark-border/50">
          <button
            onClick={() => navigate('/profile')}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-gray-100 dark:hover:bg-dark-elevated
              text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-white
              transition-all duration-200
              ${isCollapsed ? 'justify-center' : ''}
            `}
            aria-label={isCollapsed ? t('nav.profile') : undefined}
            title={isCollapsed ? t('nav.profile') : undefined}
          >
            <User size={20} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
            {!isCollapsed && (
              <span className="text-sm font-medium">
                {t('nav.profile')}
              </span>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
