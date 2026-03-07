import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Globe, Moon, Sun, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

interface HeaderProps {
  isSidebarCollapsed: boolean;
}

export default function Header({ isSidebarCollapsed }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'it' ? 'en' : 'it';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);

    // Save to backend if user is logged in
    if (user) {
      try {
        await apiService.updateProfile({ preferred_language: newLang });
        updateUser({ preferred_language: newLang });
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const handleThemeToggle = async () => {
    toggleTheme();

    // Save to backend if user is logged in
    if (user) {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      try {
        await apiService.updateProfile({ theme_preference: newTheme });
        updateUser({ theme_preference: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/projects?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header
      className={`
        fixed top-0 right-0 h-16 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-xl
        border-b border-gray-100 dark:border-dark-border/50
        transition-all duration-300 z-30 flex items-center justify-between px-6
        ${isSidebarCollapsed ? 'left-16' : 'left-64'}
      `}
    >
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative group">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('dashboard.search')}
            aria-label="Search projects"
            className="
              w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-elevated
              border border-gray-100 dark:border-dark-border rounded-xl
              text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:bg-white dark:focus:bg-dark-card
              focus:border-primary-400 dark:focus:border-primary-500
              focus:ring-2 focus:ring-primary-500/10
              transition-all duration-200
            "
          />
        </div>
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-1 ml-4">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="
            px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated
            transition-all duration-200
            flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white
          "
          aria-label={`Switch to ${i18n.language === 'it' ? 'English' : 'Italiano'}`}
          title={`Switch to ${i18n.language === 'it' ? 'English' : 'Italiano'}`}
        >
          <Globe size={18} />
          <span className="hidden sm:inline">{i18n.language.toUpperCase()}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          className="
            p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated
            transition-all duration-200
            text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white
          "
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Menu */}
        <div className="relative ml-2" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="
              flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl
              hover:bg-gray-100 dark:hover:bg-dark-elevated
              transition-all duration-200
            "
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-primary-500/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.name || 'User'}
            </span>
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl shadow-xl shadow-black/5 dark:shadow-black/20 py-1.5 animate-scale-in origin-top-right">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1.5">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    window.location.href = '/profile';
                  }}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    hover:bg-gray-50 dark:hover:bg-dark-elevated
                    transition-colors duration-150
                    text-gray-700 dark:text-gray-200
                  "
                >
                  <User size={16} className="text-gray-400" />
                  <span className="text-sm">{t('nav.profile')}</span>
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    window.location.href = '/settings';
                  }}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    hover:bg-gray-50 dark:hover:bg-dark-elevated
                    transition-colors duration-150
                    text-gray-700 dark:text-gray-200
                  "
                >
                  <Settings size={16} className="text-gray-400" />
                  <span className="text-sm">{t('nav.settings')}</span>
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-dark-border pt-1.5">
                <button
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    await logout();
                    window.location.href = '/';
                  }}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    hover:bg-red-50 dark:hover:bg-red-900/20
                    transition-colors duration-150
                    text-red-600 dark:text-red-400
                  "
                >
                  <LogOut size={16} />
                  <span className="text-sm">{t('nav.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
