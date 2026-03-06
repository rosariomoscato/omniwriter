import React from 'react';
import { Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PremiumBadgeProps {
  tier?: 'free' | 'premium' | 'lifetime' | 'admin';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  tier = 'free',
  size = 'md',
  showLabel = true
}) => {
  const { t } = useTranslation();

  if (tier === 'free') {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const isLifetime = tier === 'lifetime' || tier === 'admin';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full ${
        isLifetime
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
      } ${sizeClasses[size]}`}
    >
      <Crown size={iconSizes[size]} className="fill-current" />
      {showLabel && (
        <span className="font-medium">
          {isLifetime ? t('premium.lifetime') : t('premium.premium')}
        </span>
      )}
    </div>
  );
};

export default PremiumBadge;
