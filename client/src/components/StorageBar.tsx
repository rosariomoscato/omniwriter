import React, { useEffect, useState } from 'react';
import { AlertCircle, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

interface StorageInfo {
  used_bytes: number;
  limit_bytes: number;
  used_mb: number;
  limit_mb: number;
  percent_used: number;
  available_bytes: number;
}

interface StorageBarProps {
  showWarning?: boolean;
  className?: string;
}

const StorageBar: React.FC<StorageBarProps> = ({
  showWarning = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/users/storage');
      setStorage(response.data.storage);
    } catch (err: any) {
      console.error('Failed to fetch storage info:', err);
      setError(err.message || 'Failed to load storage info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
  }, []);

  // Don't show anything while loading or if there's an error
  if (loading || error || !storage) {
    return null;
  }

  const { used_mb, limit_mb, percent_used } = storage;

  // Determine bar color based on usage
  const getColorClass = () => {
    if (percent_used >= 95) return 'bg-red-500';
    if (percent_used >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const barColor = getColorClass();

  // Show warning if enabled and threshold is met
  const showWarningMessage = showWarning && percent_used >= 80;

  return (
    <div className={`storage-bar ${className}`}>
      {/* Storage bar */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('storage.title')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {used_mb} MB / {limit_mb} MB ({percent_used}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-300 ease-out`}
              style={{ width: `${Math.min(percent_used, 100)}%` }}
              role="progressbar"
              aria-valuenow={percent_used}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Warning message at 80% or 95% */}
      {showWarningMessage && (
        <div className={`mt-2 flex items-start gap-2 p-3 rounded-md ${
          percent_used >= 95
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm">
              {percent_used >= 95
                ? t('storage.warning95')
                : t('storage.warning80')}
            </p>
            <p className="text-xs mt-1 opacity-90">
              {percent_used >= 95
                ? t('storage.warning95Message')
                : t('storage.warning80Message')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageBar;
