import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Download,
  Star,
  User,
  Calendar,
  Globe,
  Moon,
  Sun,
  Pen,
  MessageCircle,
  Clock,
  LogIn,
  Sparkles,
  X,
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

interface Review {
  id: string;
  marketplace_item_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export default function MarketplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const currentLang = i18n.language || 'it';

  const toggleLanguage = async () => {
    const newLang = currentLang === 'it' ? 'en' : 'it';
    await i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  useEffect(() => {
    fetchItem();
    fetchReviews();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/${id}`);
      if (!response.ok) {
        throw new Error('Item not found');
      }
      const data = await response.json();
      setItem(data);
    } catch (err) {
      setError(t('marketplace.itemNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/marketplace/${id}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('[Marketplace] Error fetching reviews:', err);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/marketplace/${id}/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the file as a blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition');
      const filename = disposition
        ? disposition.split('filename=')[1]?.replace(/"/g, '') || `${item?.title || 'download'}.txt`
        : `${item?.title || 'download'}.txt`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Refresh the item to update download count
      fetchItem();
    } catch (err) {
      console.error('[Marketplace] Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmittingReview(true);
    setReviewError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/marketplace/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: reviewRating,
          text: reviewText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit review');
      }

      // Refresh reviews and item
      await Promise.all([fetchReviews(), fetchItem()]);
      setShowReviewForm(false);
      setReviewText('');
      setReviewRating(5);
    } catch (err: any) {
      setReviewError(err.message || t('marketplace.reviewError'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(currentLang === 'it' ? 'it-IT' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderStars = (rating: number, size = 16, interactive = false, onSelect?: (r: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={size}
          className={`${
            i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'
          } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={interactive && onSelect ? () => onSelect(i) : undefined}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-cosmic flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 text-lg flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          {t('marketplace.loading')}
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-cosmic">
        {/* Decorative background orbs for dark mode */}
        <div className="hidden dark:block fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 py-20 text-center relative">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <BookOpen size={32} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {error || t('marketplace.itemNotFound')}
          </h2>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            {t('marketplace.backToMarketplace')}
          </Link>
        </div>
      </div>
    );
  }

  const canReview = user && item.user_id !== user.id && !reviews.some(r => r.user_id === String(user.id));

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
              <Link to="/marketplace" className="text-lg font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {t('marketplace.title')}
              </Link>
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
                <Link
                  to="/login"
                  className="btn-primary text-sm ml-2"
                >
                  {t('auth.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Back Link */}
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          {t('marketplace.backToMarketplace')}
        </Link>

        {/* Item Header */}
        <div className="card overflow-hidden mb-6 !p-0">
          {/* Cover Banner */}
          <div
            className={`h-40 sm:h-48 flex items-center justify-center relative ${
              item.category === 'romanziere'
                ? 'bg-gradient-to-br from-violet-500 to-purple-700'
                : 'bg-gradient-to-br from-teal-500 to-cyan-700'
            }`}
          >
            {item.category === 'romanziere' ? (
              <BookOpen size={56} className="text-white/40" />
            ) : (
              <FileText size={56} className="text-white/40" />
            )}

            {/* OmniWriter Badge */}
            <span className="absolute bottom-3 right-3 text-xs text-white/80 font-medium flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Pen size={12} /> {t('marketplace.createdWithOmniWriter')}
            </span>
          </div>

          {/* Item Info */}
          <div className="p-6">
            {/* Category */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mb-4 ${
                item.category === 'romanziere'
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
              }`}
            >
              {item.category === 'romanziere' ? <BookOpen size={12} /> : <FileText size={12} />}
              {item.category === 'romanziere' ? t('marketplace.categoryRomanziere') : t('marketplace.categorySaggista')}
            </span>

            <h1 className="heading-1 mb-4">
              {item.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-1.5">
                <User size={14} />
                <span>{item.author_display_name || item.author_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{formatDate(item.published_at)}</span>
              </div>
              {item.word_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>{item.word_count.toLocaleString()} {t('marketplace.words')}</span>
                </div>
              )}
              {item.genre && (
                <span className="bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full text-xs font-medium">
                  {item.genre}
                </span>
              )}
            </div>

            {/* Rating and Downloads */}
            <div className="flex items-center gap-6 mb-5">
              <div className="flex items-center gap-2">
                {renderStars(item.average_rating)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.average_rating > 0 ? item.average_rating.toFixed(1) : '-'}
                  {item.review_count > 0 && ` (${item.review_count} ${t('marketplace.reviews')})`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Download size={14} />
                <span>{item.download_count} {t('marketplace.downloads')}</span>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="prose prose-gray dark:prose-invert max-w-none mb-6">
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{item.description}</p>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3"
            >
              {downloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('marketplace.downloading')}
                </>
              ) : (
                <>
                  <Download size={18} />
                  {t('marketplace.downloadButton')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-3 flex items-center gap-2">
              <MessageCircle size={20} className="text-primary-500" />
              {t('marketplace.reviewsTitle')} ({reviews.length})
            </h2>

            {canReview && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="btn-primary text-sm"
              >
                {t('marketplace.writeReview')}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && user && (
            <form onSubmit={handleSubmitReview} className="mb-6 p-5 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-100 dark:border-dark-border">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('marketplace.yourReview')}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('marketplace.rating')}
                </label>
                {renderStars(reviewRating, 24, true, setReviewRating)}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('marketplace.reviewText')}
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none resize-none transition-all duration-200"
                  placeholder={t('marketplace.reviewPlaceholder')}
                />
              </div>

              {reviewError && (
                <p className="text-sm text-red-500 dark:text-red-400 mb-3">{reviewError}</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary disabled:opacity-50"
                >
                  {submittingReview ? t('marketplace.submitting') : t('marketplace.submitReview')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="btn-secondary"
                >
                  {t('marketplace.cancel')}
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
                <MessageCircle size={24} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">{t('marketplace.noReviews')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-100 dark:border-dark-border last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {review.reviewer_name || t('marketplace.anonymousUser')}
                      </span>
                      {renderStars(review.rating, 14)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Clock size={12} />
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-dark-border pt-6">
          <p>{t('marketplace.footerAttribution')}</p>
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card max-w-sm mx-4 animate-scale-in">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <LogIn size={28} className="text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('marketplace.loginRequired')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('marketplace.loginToDownload')}
              </p>
              <div className="flex items-center gap-3 justify-center flex-wrap">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="btn-secondary"
                >
                  {t('marketplace.cancel')}
                </button>
                <Link
                  to="/login"
                  className="btn-primary"
                  onClick={() => {
                    sessionStorage.setItem('redirectAfterLogin', `/marketplace/${id}`);
                  }}
                >
                  {t('auth.login')}
                </Link>
                <Link
                  to="/register"
                  className="btn-secondary !border-primary-500 !text-primary-600 dark:!text-primary-400 hover:!bg-primary-50 dark:hover:!bg-primary-900/20"
                >
                  {t('auth.register')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
