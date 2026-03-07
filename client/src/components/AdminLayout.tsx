import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Activity,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight,
  ShoppingBag
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../contexts/AuthContext';
import { useToastNotification } from './Toast';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard
  },
  {
    id: 'users',
    label: 'Utenti',
    path: '/admin/users',
    icon: Users
  },
  {
    id: 'projects',
    label: 'Progetti',
    path: '/admin/projects',
    icon: FolderOpen
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    path: '/admin/marketplace',
    icon: ShoppingBag
  },
  {
    id: 'activity',
    label: 'Attività',
    path: '/admin/activity',
    icon: Activity
  }
];

const AdminLayout = () => {
  const { isAdmin, requireAdmin } = useAdmin();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!requireAdmin()) {
      toast.error('Accesso negato. Privilegi admin richiesti.');
    }
  }, [isAdmin, requireAdmin, toast]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Errore durante il logout');
    }
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  if (!isAdmin) {
    return null;
  }

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              <span className="font-semibold text-gray-900 dark:text-white">Admin Panel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border
          transition-all duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        `}
        style={{ paddingTop: isMobileMenuOpen ? '0' : '0' }}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-border">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              <span className="font-semibold text-gray-900 dark:text-white">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronRight
              className={`w-5 h-5 text-gray-500 transition-transform ${
                isSidebarCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Admin User Info */}
        {!isSidebarCollapsed && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                      ${isActive
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface'
                      }
                    `}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : ''}`} />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={isSidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`
          transition-all duration-300 bg-white dark:bg-dark-bg min-h-screen
          lg:ml-${isSidebarCollapsed ? '16' : '64'}
          ${isMobileMenuOpen ? 'ml-0' : ''}
        `}
        style={{
          marginLeft: isSidebarCollapsed ? '4rem' : '16rem',
          paddingTop: '0'
        }}
      >
        {/* Top Bar for Admin Info (desktop) */}
        <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pannello di Amministrazione
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestisci la piattaforma OmniWriter
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-8" style={{ paddingTop: '2rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
