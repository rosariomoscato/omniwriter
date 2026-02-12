import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface Breadcrumb {
  label: string;
  path?: string;
}

export default function Breadcrumbs() {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Breadcrumb[] = [];

    // Always add Dashboard as first item if not on landing page
    if (pathSegments.length > 0) {
      crumbs.push({ label: 'Dashboard', path: '/dashboard' });
    }

    // Build breadcrumbs based on route
    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');

      // Handle dynamic routes
      if (segment === 'projects' && index < pathSegments.length - 1) {
        crumbs.push({ label: 'Progetti', path: '/projects' });
      } else if (segment.match(/^[a-f0-9-]{36}$/)) {
        // UUID for project ID
        crumbs.push({ label: 'Progetto', path });
      } else if (segment === 'human-model') {
        crumbs.push({ label: 'Human Model', path });
      } else if (segment === 'sources') {
        crumbs.push({ label: 'Fonti', path });
      } else if (segment === 'settings') {
        crumbs.push({ label: 'Impostazioni', path });
      } else if (segment === 'profile') {
        crumbs.push({ label: 'Profilo', path });
      } else if (segment === 'login') {
        crumbs.push({ label: 'Accedi' });
      } else if (segment === 'register') {
        crumbs.push({ label: 'Registrati' });
      }
    });

    return crumbs;
  }, [location.pathname]);

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
            <Link
              to={crumb.path}
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium">{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
