import React from 'react';
import { useTierPermissions, PremiumFeature } from '../hooks/useTierPermissions';
import PremiumBadge from './PremiumBadge';

interface FeatureGateProps {
  /**
   * The premium feature to check access for
   */
  feature: PremiumFeature;
  /**
   * Content to show if the user has access to the feature
   */
  children: React.ReactNode;
  /**
   * Content to show if the user does NOT have access (when showLocked is false)
   */
  fallback?: React.ReactNode;
  /**
   * If true, shows a locked version with PremiumBadge instead of hiding completely
   * If false (default), shows only the fallback or nothing
   */
  showLocked?: boolean;
  /**
   * Custom message to show on the locked overlay
   */
  lockedMessage?: string;
  /**
   * Additional CSS classes for the locked container
   */
  className?: string;
  /**
   * Callback when user clicks on the locked overlay to upgrade
   */
  onUpgradeClick?: () => void;
  /**
   * If true, wraps children in a container with relative positioning for the overlay
   * Useful when you want to show the locked state over the actual component
   */
  showOverlay?: boolean;
}

/**
 * FeatureGate Component
 *
 * A wrapper component that conditionally renders children based on user tier permissions.
 * Uses useTierPermissions internally to check feature access.
 *
 * @example
 * // Hide feature completely if user doesn't have access
 * <FeatureGate feature="sagas">
 *   <button>Create Saga</button>
 * </FeatureGate>
 *
 * @example
 * // Show fallback content if user doesn't have access
 * <FeatureGate feature="sagas" fallback={<span>Sagas require Premium</span>}>
 *   <button>Create Saga</button>
 * </FeatureGate>
 *
 * @example
 * // Show locked version with PremiumBadge
 * <FeatureGate feature="sagas" showLocked>
 *   <button>Create Saga</button>
 * </FeatureGate>
 *
 * @example
 * // Show overlay on top of the locked feature
 * <FeatureGate feature="sagas" showLocked showOverlay>
 *   <button>Create Saga</button>
 * </FeatureGate>
 */
export default function FeatureGate({
  feature,
  children,
  fallback = null,
  showLocked = false,
  lockedMessage,
  className = '',
  onUpgradeClick,
  showOverlay = false,
}: FeatureGateProps): React.ReactElement | null {
  const { canAccess, getFeatureName } = useTierPermissions();
  const hasAccess = canAccess(feature);
  const featureName = getFeatureName(feature);

  // User has access - show the children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access and showLocked is false - show fallback or nothing
  if (!showLocked) {
    return <>{fallback}</>;
  }

  // User doesn't have access but showLocked is true - show locked version
  const message = lockedMessage || `${featureName} richiede Premium`;

  // If showOverlay is true, render the children with an overlay on top
  if (showOverlay) {
    return (
      <div className={`relative ${className}`}>
        {/* The actual content (visually disabled) */}
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>

        {/* Overlay with PremiumBadge */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 dark:bg-gray-900/80 rounded-lg cursor-pointer"
          onClick={onUpgradeClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onUpgradeClick?.();
            }
          }}
        >
          <PremiumBadge size="lg" onClick={onUpgradeClick} />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
            {message}
          </p>
        </div>
      </div>
    );
  }

  // Default locked version - show placeholder with badge
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
    >
      <span className="text-gray-400 dark:text-gray-500">{message}</span>
      <PremiumBadge size="sm" onClick={onUpgradeClick} />
    </div>
  );
}
