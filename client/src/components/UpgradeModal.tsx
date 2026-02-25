import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Crown, Zap, Star, Sparkles } from 'lucide-react';
import { useFocusTrapSimple } from '../hooks/useFocusTrap';
import { registerModal, unregisterModal } from './NetworkErrorDialog';

interface UpgradeModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback when modal is closed
   */
  onClose: () => void;
  /**
   * Optional title override
   */
  title?: string;
  /**
   * Optional description override
   */
  description?: string;
}

/**
 * UpgradeModal Component
 *
 * A modal that displays premium benefits, pricing, and an upgrade button.
 * Supports both light and dark themes.
 */
export default function UpgradeModal({
  isOpen,
  onClose,
  title,
  description
}: UpgradeModalProps) {
  const { t } = useTranslation();
  const modalId = useState(() => `upgrade-${Math.random().toString(36).substring(2, 9)}`)[0];
  const modalRef = useFocusTrapSimple(isOpen);

  // Register modal on mount
  useEffect(() => {
    if (isOpen) {
      registerModal(modalId);
    }
    return () => {
      if (isOpen) {
        unregisterModal(modalId);
      }
    };
  }, [modalId, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUpgrade = () => {
    // Navigate to registration/payment page
    window.location.href = '/register?plan=premium';
    onClose();
  };

  if (!isOpen) return null;

  const premiumBenefits = [
    t('upgradeModal.benefits.unlimited', 'Unlimited content generation'),
    t('upgradeModal.benefits.advancedHumanModel', 'Advanced Human Model with multiple profiles'),
    t('upgradeModal.benefits.unlimitedSources', 'Unlimited source uploads'),
    t('upgradeModal.benefits.allFormats', 'All export formats (DOCX, EPUB, PDF, RTF)'),
    t('upgradeModal.benefits.advancedSEO', 'Advanced SEO tools'),
    t('upgradeModal.benefits.googleDrive', 'Google Drive integration'),
    t('upgradeModal.benefits.sagaGrouping', 'Saga/Series grouping with shared sources'),
    t('upgradeModal.benefits.prioritySupport', 'Priority support'),
  ];

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      aria-describedby="upgrade-modal-description"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 p-6 pb-16">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2
              id="upgrade-modal-title"
              className="text-2xl font-bold text-white"
            >
              {title || t('upgradeModal.title', 'Upgrade to Premium')}
            </h2>
          </div>

          <p
            id="upgrade-modal-description"
            className="text-white/90 text-sm"
          >
            {description || t('upgradeModal.description', 'Unlock all features and take your writing to the next level')}
          </p>

          {/* Decorative sparkles */}
          <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/30" />
          <Sparkles className="absolute bottom-8 right-8 w-5 h-5 text-white/20" />
          <Star className="absolute top-12 right-24 w-4 h-4 text-white/25" />
        </div>

        {/* Content */}
        <div className="p-6 -mt-8">
          {/* Pricing cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Premium */}
            <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border-2 border-purple-500">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="bg-purple-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {t('landing.pricing.premium.popular', 'Most Popular')}
                </span>
              </div>
              <div className="text-center mt-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {t('landing.pricing.premium.name', 'Premium')}
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t('landing.pricing.premium.price', '€19')}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('landing.pricing.premium.period', '/month')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('landing.pricing.premium.description', 'For serious writers')}
                </p>
              </div>
            </div>

            {/* Lifetime */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('landing.pricing.lifetime.name', 'Lifetime')}
                  </p>
                </div>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t('landing.pricing.lifetime.price', '€299')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('landing.pricing.lifetime.period', 'one-time')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('landing.pricing.lifetime.description', 'Access forever')}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits list */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('upgradeModal.whatsIncluded', 'What\'s included:')}
            </h3>
            <ul className="space-y-2">
              {premiumBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 hover:from-amber-500 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              {t('upgradeModal.upgradeNow', 'Upgrade Now')}
            </button>
          </div>

          {/* Money back guarantee */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            {t('upgradeModal.moneyBack', '30-day money-back guarantee. No questions asked.')}
          </p>
        </div>
      </div>
    </div>
  );
}
