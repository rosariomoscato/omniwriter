import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  /**
   * Whether the badge is clickable and should open the upgrade modal.
   * When true, clicking the badge will call onUpgradeClick.
   */
  onClick?: () => void;
  /**
   * Optional additional CSS classes
   */
  className?: string;
  /**
   * Badge size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PremiumBadge Component
 *
 * A golden/purple badge that indicates premium features.
 * Can be clicked to open the upgrade modal.
 *
 * Supports both light and dark themes through Tailwind CSS classes.
 */
export default function PremiumBadge({
  onClick,
  className = '',
  size = 'md'
}: PremiumBadgeProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const baseClasses = `
    inline-flex items-center
    font-medium rounded-full
    bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500
    text-white
    shadow-sm
    ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200' : ''}
    ${sizeClasses[size]}
    ${className}
  `;

  return (
    <span
      className={baseClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={t('premium.badge', 'Premium feature')}
    >
      <Crown className={iconSizes[size]} />
      <span>{t('premium.badge', 'Premium')}</span>
    </span>
  );
}
