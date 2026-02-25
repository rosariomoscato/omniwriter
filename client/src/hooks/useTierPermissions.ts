import { useMemo, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  TIER_LIMITS,
  FEATURE_NAMES,
  PREMIUM_TIERS,
  UserRole,
  TierLimits,
} from '../config/tier-config';

// Feature types that can be checked
export type PremiumFeature =
  | 'sagas'
  | 'novelAnalysis'
  | 'googleDrive'
  | 'advancedAI'
  | 'multipleProfiles'
  | 'fullHumanAnalysis'
  | 'unlimitedProjects'
  | 'unlimitedGenerations'
  | 'epubExport'
  | 'pdfExport'
  | 'unlimitedSources'
  | 'unlimitedWebSearch';

// Limit types that can be queried
export type LimitType =
  | 'maxProjects'
  | 'maxChaptersPerProject'
  | 'maxSourcesPerProject'
  | 'maxSourceSizeMB'
  | 'totalSourceStorageMB'
  | 'maxGenerationLength'
  | 'maxDailyGenerations'
  | 'maxHumanModels'
  | 'humanModelTrainingWords'
  | 'maxDailyWebSearches';

// Feature to tier limit mapping
const FEATURE_TO_LIMIT: Record<PremiumFeature, keyof TierLimits | null> = {
  sagas: 'canCreateSagas',
  novelAnalysis: 'canAnalyzeNovels',
  googleDrive: 'canGoogleDriveSync',
  advancedAI: 'canAdvancedAIModels',
  multipleProfiles: 'canMultipleHumanProfiles',
  fullHumanAnalysis: 'canFullHumanAnalysis',
  unlimitedProjects: 'maxProjects',
  unlimitedGenerations: 'maxGenerationLength',
  epubExport: 'exportFormats',
  pdfExport: 'exportFormats',
  unlimitedSources: 'maxSourcesPerProject',
  unlimitedWebSearch: 'maxDailyWebSearches',
};

interface UpgradePromptState {
  show: boolean;
  feature: PremiumFeature | null;
  featureName: string;
  message: string;
}

interface UseTierPermissionsReturn {
  // User info
  role: UserRole;
  isPremium: boolean;
  isAdmin: boolean;

  // Permission checks
  canAccess: (feature: PremiumFeature) => boolean;
  getLimit: (limitType: LimitType) => number;
  canExportFormat: (format: string) => boolean;

  // Upgrade prompt
  showUpgradePrompt: (feature: PremiumFeature) => void;
  hideUpgradePrompt: () => void;
  upgradePrompt: UpgradePromptState;

  // Utilities
  limits: TierLimits;
  getFeatureName: (feature: PremiumFeature) => string;
}

/**
 * Custom hook to check tier-based permissions
 *
 * Uses AuthContext to get the user role and provides
 * helper functions for checking feature access and limits.
 */
export function useTierPermissions(): UseTierPermissionsReturn {
  const { user } = useAuth();
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptState>({
    show: false,
    feature: null,
    featureName: '',
    message: '',
  });

  // Get user role with fallback to 'free'
  const role = useMemo((): UserRole => {
    return (user?.role as UserRole) || 'free';
  }, [user?.role]);

  // Check if user has premium access
  const isPremium = useMemo(() => {
    return PREMIUM_TIERS.includes(role);
  }, [role]);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return role === 'admin';
  }, [role]);

  // Get tier limits for current role
  const limits = useMemo(() => {
    return TIER_LIMITS[role] || TIER_LIMITS.free;
  }, [role]);

  /**
   * Check if user can access a specific premium feature
   */
  const canAccess = useCallback(
    (feature: PremiumFeature): boolean => {
      const limitKey = FEATURE_TO_LIMIT[feature];

      if (!limitKey) return false;

      const limitValue = limits[limitKey];

      // Boolean features
      if (typeof limitValue === 'boolean') {
        return limitValue;
      }

      // Numeric features (-1 means unlimited, which is truthy for "can access unlimited")
      if (typeof limitValue === 'number') {
        return limitValue === -1; // Unlimited means they "can access" the unlimited version
      }

      // Array features (like exportFormats)
      if (Array.isArray(limitValue)) {
        if (feature === 'epubExport') {
          return limitValue.includes('epub');
        }
        if (feature === 'pdfExport') {
          return limitValue.includes('pdf');
        }
        return limitValue.length > 2; // More than basic formats
      }

      return false;
    },
    [limits]
  );

  /**
   * Get a numeric limit for the current tier
   * Returns -1 for unlimited
   */
  const getLimit = useCallback(
    (limitType: LimitType): number => {
      const value = limits[limitType];
      return typeof value === 'number' ? value : 0;
    },
    [limits]
  );

  /**
   * Check if user can export to a specific format
   */
  const canExportFormat = useCallback(
    (format: string): boolean => {
      const formatLower = format.toLowerCase();

      // Check if format is in available formats
      if (!limits.exportFormats.includes(formatLower)) {
        return false;
      }

      return true;
    },
    [limits.exportFormats]
  );

  /**
   * Get display name for a feature
   */
  const getFeatureName = useCallback((feature: PremiumFeature): string => {
    return FEATURE_NAMES[feature] || feature;
  }, []);

  /**
   * Show upgrade prompt for a specific feature
   */
  const showUpgradePrompt = useCallback(
    (feature: PremiumFeature) => {
      const featureName = getFeatureName(feature);
      const message = isPremium
        ? `Hai gia accesso a ${featureName}.`
        : `Accedi a ${featureName} con un abbonamento Premium.`;

      setUpgradePrompt({
        show: true,
        feature,
        featureName,
        message,
      });
    },
    [getFeatureName, isPremium]
  );

  /**
   * Hide upgrade prompt
   */
  const hideUpgradePrompt = useCallback(() => {
    setUpgradePrompt({
      show: false,
      feature: null,
      featureName: '',
      message: '',
    });
  }, []);

  return {
    role,
    isPremium,
    isAdmin,
    canAccess,
    getLimit,
    canExportFormat,
    showUpgradePrompt,
    hideUpgradePrompt,
    upgradePrompt,
    limits,
    getFeatureName,
  };
}

export default useTierPermissions;
