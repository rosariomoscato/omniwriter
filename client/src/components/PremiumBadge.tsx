import React from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdminBadgeProps {
  role?: 'user' | 'admin';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const AdminBadge: React.FC<AdminBadgeProps> = ({
  role = 'user',
  size = 'md',
  showLabel = true
}) => {
  const { t } = useTranslation();

  if (role === 'user') {
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

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-orange-600 text-white ${sizeClasses[size]}`}
    >
      <Shield size={iconSizes[size]} className="fill-current" />
      {showLabel && (
        <span className="font-medium">{t('profile.roles.admin')}</span>
      )}
    </div>
  );
};

export default AdminBadge;
