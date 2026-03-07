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
            i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'
          } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={interactive && onSelect ? () => onSelect(i) : undefined}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 text-lg">{t('marketplace.loading')}</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {error || t('marketplace.itemNotFound')}
          </h2>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 mt-4 text-primary-600 dark:text-primary-400 hover:underline"
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-2xl font-bold text-primary-600 dark:text-primary-500">
                OmniWriter
              </Link>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <Link to="/marketplace" className="text-lg font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                {t('marketplace.title')}
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <Globe size={18} />
                <span className="hidden sm:inline">{currentLang.toUpperCase()}</span>
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                {theme === 'dark' ? <Sun size={18} className="text-gray-200" /> : <Moon size={18} className="text-gray-700" />}
              </button>

              {user ? (
                <Link
                  to="/dashboard"
                  className="ml-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  {t('nav.dashboard')}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="ml-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  {t('auth.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6"
        >
          <ArrowLeft size={14} />
          {t('marketplace.backToMarketplace')}
        </Link>

        {/* Item Header */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          {/* Cover Banner */}
          <div
            className={`h-40 sm:h-48 flex items-center justify-center relative ${
              item.category === 'romanziere'
                ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                : 'bg-gradient-to-br from-blue-500 to-blue-700'
            }`}
          >
            {item.category === 'romanziere' ? (
              <BookOpen size={56} className="text-white/40" />
            ) : (
              <FileText size={56} className="text-white/40" />
            )}

            {/* OmniWriter Badge */}
            <span className="absolute bottom-3 right-3 text-xs text-white/80 font-medium flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full">
              <Pen size={12} /> {t('marketplace.createdWithOmniWriter')}
            </span>
          </div>

          {/* Item Info */}
          <div className="p-6">
            {/* Category */}
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${
                item.category === 'romanziere'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}
            >
              {item.category === 'romanziere' ? <BookOpen size={12} /> : <FileText size={12} />}
              {item.category === 'romanziere' ? t('marketplace.categoryRomanziere') : t('marketplace.categorySaggista')}
            </span>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
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
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs">
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
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{item.description}</p>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Download size={18} />
              {downloading ? t('marketplace.downloading') : t('marketplace.downloadButton')}
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageCircle size={20} />
              {t('marketplace.reviewsTitle')} ({reviews.length})
            </h2>

            {canReview && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                {t('marketplace.writeReview')}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && user && (
            <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                {t('marketplace.yourReview')}
              </h3>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.rating')}
                </label>
                {renderStars(reviewRating, 24, true, setReviewRating)}
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.reviewText')}
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  placeholder={t('marketplace.reviewPlaceholder')}
                />
              </div>

              {reviewError && (
                <p className="text-sm text-red-500 dark:text-red-400 mb-2">{reviewError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {submittingReview ? t('marketplace.submitting') : t('marketplace.submitReview')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  {t('marketplace.cancel')}
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('marketplace.noReviews')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0"
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-6">
          <p>{t('marketplace.footerAttribution')}</p>
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm mx-4">
            <div className="text-center">
              <LogIn size={32} className="mx-auto text-primary-600 dark:text-primary-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('marketplace.loginRequired')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('marketplace.loginToDownload')}
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  {t('marketplace.cancel')}
                </button>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  onClick={() => {
                    sessionStorage.setItem('redirectAfterLogin', `/marketplace/${id}`);
                  }}
                >
                  {t('auth.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 border border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-sm font-medium"
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
