import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Breadcrumb {
  label: string;
  path?: string;
  isDashboard?: boolean;
}

interface BreadcrumbsProps {
  /** Optional overrides for dynamic route labels (key: path segment, value: label) */
  labelOverrides?: Record<string, string>;
}

export default function Breadcrumbs({ labelOverrides }: BreadcrumbsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleDashboardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Restore filters from sessionStorage if available
    const stored = sessionStorage.getItem('dashboardFilters');
    if (stored) {
      // Navigate with filters already in sessionStorage
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Breadcrumb[] = [];

    // Always add Dashboard as first item if not on landing page
    if (pathSegments.length > 0) {
      crumbs.push({ label: t('breadcrumbs.dashboard'), path: '/dashboard', isDashboard: true });
    }

    // Build breadcrumbs based on route
    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const nextSegment = pathSegments[index + 1];

      // Handle dynamic routes
      if (segment === 'projects' && nextSegment === 'new') {
        // Don't add a crumb for 'projects' when going to new project form
      } else if (segment === 'projects' && index < pathSegments.length - 1) {
        crumbs.push({ label: t('breadcrumbs.projects'), path: '/projects' });
      } else if (segment === 'new') {
        crumbs.push({ label: t('breadcrumbs.newProject'), path });
      } else if (segment === 'chapters') {
        // Skip 'chapters' segment, handled by following UUID
      } else if (segment.match(/^[a-f0-9-]{36}$/)) {
        // UUID - could be project ID or chapter ID
        // Check if the PREVIOUS segment is 'chapters' to determine if this is a chapter ID
        const prevSegment = pathSegments[index - 1];
        if (prevSegment === 'chapters') {
          // This is a chapter ID - use override if available
          const chapterLabel = labelOverrides?.[segment] || t('breadcrumbs.chapter');
          crumbs.push({ label: chapterLabel }); // No path, it's current page
        } else {
          // This is a project ID - use override if available
          const projectLabel = labelOverrides?.[segment] || t('breadcrumbs.project');
          crumbs.push({ label: projectLabel, path });
        }
      } else if (segment === 'human-model') {
        crumbs.push({ label: t('breadcrumbs.humanModel'), path });
      } else if (segment === 'sources') {
        crumbs.push({ label: t('breadcrumbs.sources'), path });
      } else if (segment === 'settings') {
        crumbs.push({ label: t('breadcrumbs.settings'), path });
      } else if (segment === 'profile') {
        crumbs.push({ label: t('breadcrumbs.profile'), path });
      } else if (segment === 'login') {
        crumbs.push({ label: t('breadcrumbs.login') });
      } else if (segment === 'register') {
        crumbs.push({ label: t('breadcrumbs.register') });
      }
    });

    return crumbs;
  }, [location.pathname, t, labelOverrides]);

  // Don't show breadcrumbs on landing page or login/register
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {crumb.path ? (
            crumb.isDashboard ? (
              <Link
                to={crumb.path}
                onClick={handleDashboardClick}
                className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors"
              >
                {crumb.label}
              </Link>
            )
          ) : (
            <span className="text-gray-900 dark:text-white font-medium">{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
