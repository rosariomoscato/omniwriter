import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Search,
  Filter,
  BookOpen,
  FileText,
  Download,
  Star,
  ChevronLeft,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  User,
  Calendar,
  SortAsc,
  X,
  Pen,
  Sparkles,
  Github,
  Mail,
} from 'lucide-react';

interface MarketplaceItem {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  author_name: string;
  author_display_name: string;
  description: string;
  category: string;
  genre: string;
  tags_json: string;
  word_count: number;
  download_count: number;
  average_rating: number;
  review_count: number;
  published_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MarketplacePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  const currentLang = i18n.language || 'it';

  const toggleLanguage = async () => {
    const newLang = currentLang === 'it' ? 'en' : 'it';
    await i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      if (searchQuery) params.set('search', searchQuery);
      if (category) params.set('category', category);
      if (genre) params.set('genre', genre);
      if (sortBy) params.set('sort', sortBy);

      const response = await fetch(`/api/marketplace?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace items');
      }
      const data = await response.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('[Marketplace] Error:', err);
      setError(t('marketplace.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, genre, sortBy, t]);

  useEffect(() => {
    fetchItems(parseInt(searchParams.get('page') || '1'));
  }, [searchParams, fetchItems]);

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchQuery });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategory('');
    setGenre('');
    setSortBy('newest');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || category || genre || sortBy !== 'newest';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.round(count / 1000)}k`;
    }
    return String(count);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'romanziere':
        return <BookOpen size={14} />;
      case 'saggista':
        return <FileText size={14} />;
      default:
        return <Pen size={14} />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'romanziere':
        return t('marketplace.categoryRomanziere');
      case 'saggista':
        return t('marketplace.categorySaggista');
      default:
        return cat;
    }
  };

  const renderStars = (rating: number, size = 14) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-cosmic">
      {/* Decorative background orbs for dark mode */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-accent-400 bg-clip-text text-transparent">
                  OmniWriter
                </span>
              </Link>
              <span className="text-gray-300 dark:text-dark-border">|</span>
              <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {t('marketplace.title')}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="
                  px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated
                  transition-all duration-200
                  flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400
                  hover:text-gray-900 dark:hover:text-white
                "
                title={`Switch to ${currentLang === 'it' ? 'English' : 'Italiano'}`}
              >
                <Globe size={18} />
                <span className="hidden sm:inline">{currentLang.toUpperCase()}</span>
              </button>

              <button
                onClick={toggleTheme}
                className="
                  p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated
                  transition-all duration-200
                  text-gray-600 dark:text-gray-400
                  hover:text-gray-900 dark:hover:text-white
                "
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user ? (
                <Link
                  to="/dashboard"
                  className="btn-primary text-sm ml-2"
                >
                  {t('nav.dashboard')}
                </Link>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Link
                    to="/login"
                    className="btn-secondary text-sm"
                  >
                    {t('auth.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm"
                  >
                    {t('auth.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="heading-1 mb-3">
            <span className="gradient-text-hero">{t('marketplace.heroTitle')}</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            {t('marketplace.heroSubtitle')}
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative group">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  placeholder={t('marketplace.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      updateFilters({ search: '' });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </form>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium
                ${showFilters || hasActiveFilters
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                  : 'bg-white dark:bg-dark-elevated border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card hover:border-primary-300 dark:hover:border-primary-700'
                }
              `}
            >
              <Filter size={16} />
              {t('marketplace.filters')}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary-500 glow-dot" />
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.filterCategory')}
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    updateFilters({ category: e.target.value });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-200"
                >
                  <option value="">{t('marketplace.allCategories')}</option>
                  <option value="romanziere">{t('marketplace.categoryRomanziere')}</option>
                  <option value="saggista">{t('marketplace.categorySaggista')}</option>
                </select>
              </div>

              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.filterGenre')}
                </label>
                <input
                  type="text"
                  placeholder={t('marketplace.genrePlaceholder')}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  onBlur={() => updateFilters({ genre })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateFilters({ genre });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-200"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.sortBy')}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    updateFilters({ sort: e.target.value });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-200"
                >
                  <option value="newest">{t('marketplace.sortNewest')}</option>
                  <option value="oldest">{t('marketplace.sortOldest')}</option>
                  <option value="most_downloaded">{t('marketplace.sortMostDownloaded')}</option>
                  <option value="highest_rated">{t('marketplace.sortHighestRated')}</option>
                  <option value="title_asc">{t('marketplace.sortTitleAsc')}</option>
                  <option value="title_desc">{t('marketplace.sortTitleDesc')}</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    {t('marketplace.clearFilters')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {loading
              ? t('marketplace.loading')
              : t('marketplace.resultsCount', { count: pagination.total })}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchItems(pagination.page)}
              className="btn-primary"
            >
              {t('marketplace.retry')}
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="card overflow-hidden animate-pulse"
              >
                <div className="h-40 bg-gray-200 dark:bg-dark-elevated rounded-t-xl -mx-6 -mt-6 w-[calc(100%+3rem)]" />
                <div className="space-y-3 mt-4">
                  <div className="h-5 bg-gray-200 dark:bg-dark-elevated rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-dark-elevated rounded w-1/2" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-elevated rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-dark-elevated rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
              <BookOpen size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('marketplace.noResults')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {hasActiveFilters
                ? t('marketplace.noResultsWithFilters')
                : t('marketplace.noResultsEmpty')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn-primary"
              >
                {t('marketplace.clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <MarketItemCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/marketplace/${item.id}`)}
                formatDate={formatDate}
                formatWordCount={formatWordCount}
                getCategoryIcon={getCategoryIcon}
                getCategoryLabel={getCategoryLabel}
                renderStars={renderStars}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-elevated hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: Math.min(pagination.totalPages, 7) }).map((_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 7) {
                pageNum = i + 1;
              } else if (pagination.page <= 4) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 3) {
                pageNum = pagination.totalPages - 6 + i;
              } else {
                pageNum = pagination.page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pagination.page === pageNum
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : 'border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-elevated hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-elevated hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-dark-border pt-6">
          <p className="mb-3">
            {t('footer.builtWith')}{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {t('footer.author')}
            </span>{' '}
            {t('footer.allRightsReserved')}
          </p>
          <div className="flex items-center justify-center gap-6">
            <a
              href="mailto:ros.moscato@gmail.com"
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              title={t('footer.email')}
            >
              <Mail size={14} />
              <span>{t('footer.email')}</span>
            </a>
            <a
              href="https://github.com/rosariomoscato/omniwriter"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              title={t('footer.viewOnGitHub')}
            >
              <Github size={14} />
              <span>{t('footer.github')}</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

// MarketItemCard component
interface MarketItemCardProps {
  item: MarketplaceItem;
  onClick: () => void;
  formatDate: (date: string) => string;
  formatWordCount: (count: number) => string;
  getCategoryIcon: (cat: string) => React.ReactNode;
  getCategoryLabel: (cat: string) => string;
  renderStars: (rating: number, size?: number) => React.ReactNode;
  t: (key: string, options?: any) => string;
}

function MarketItemCard({
  item,
  onClick,
  formatDate,
  formatWordCount,
  getCategoryIcon,
  getCategoryLabel,
  renderStars,
  t,
}: MarketItemCardProps) {
  const categoryColors: Record<string, string> = {
    romanziere: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    saggista: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  };

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer group"
    >
      {/* Cover / Colored Header */}
      <div
        className={`h-32 flex items-center justify-center relative -mx-6 -mt-6 w-[calc(100%+3rem)] ${
          item.category === 'romanziere'
            ? 'bg-gradient-to-br from-violet-500 to-purple-700'
            : 'bg-gradient-to-br from-teal-500 to-cyan-700'
        }`}
      >
        {item.category === 'romanziere' ? (
          <BookOpen size={40} className="text-white/50" />
        ) : (
          <FileText size={40} className="text-white/50" />
        )}

        {/* Category Badge */}
        <span
          className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${
            categoryColors[item.category] || 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-1">
            {getCategoryIcon(item.category)}
            {getCategoryLabel(item.category)}
          </span>
        </span>

        {/* OmniWriter Badge */}
        <span className="absolute bottom-2 right-2 text-[10px] text-white/70 font-medium flex items-center gap-1">
          <Pen size={10} /> {t('marketplace.createdWithOmniWriter')}
        </span>
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {item.title}
        </h3>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <User size={12} />
          <span>{item.author_display_name || item.author_name}</span>
        </div>

        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {item.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-3">
            {item.review_count > 0 && (
              <div className="flex items-center gap-1">
                {renderStars(item.average_rating, 12)}
                <span>({item.review_count})</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Download size={12} />
              <span>{item.download_count}</span>
            </div>
          </div>

          {item.word_count > 0 && (
            <span>{formatWordCount(item.word_count)} {t('marketplace.words')}</span>
          )}
        </div>

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
          <Calendar size={11} />
          <span>{formatDate(item.published_at)}</span>
        </div>
      </div>
    </div>
  );
}
