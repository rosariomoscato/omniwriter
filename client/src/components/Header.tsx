import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Globe, Moon, Sun, User, LogOut, ChevronDown } from 'lucide-react';
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
        fixed top-0 right-0 h-16 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-700
        transition-all duration-300 z-30 flex items-center justify-between px-6
        ${isSidebarCollapsed ? 'left-16' : 'left-64'}
      `}
    >
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('dashboard.search')}
            className="
              w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800
              border border-gray-200 dark:border-gray-700 rounded-lg
              text-gray-900 dark:text-gray-100 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              transition-all
            "
          />
        </div>
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="
            p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors duration-200
            flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200
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
            p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors duration-200
            text-gray-700 dark:text-gray-200
          "
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors duration-200
            "
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.name || 'User'}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  window.location.href = '/profile';
                }}
                className="
                  w-full flex items-center gap-2 px-4 py-2 text-left
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                "
              >
                <User size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-200">{t('nav.profile')}</span>
              </button>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  window.location.href = '/settings';
                }}
                className="
                  w-full flex items-center gap-2 px-4 py-2 text-left
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                "
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">{t('nav.settings')}</span>
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                onClick={async () => {
                  setIsUserMenuOpen(false);
                  await logout();
                  window.location.href = '/';
                }}
                className="
                  w-full flex items-center gap-2 px-4 py-2 text-left
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors text-red-600 dark:text-red-400
                "
              >
                <LogOut size={16} />
                <span className="text-sm">{t('nav.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
