import React from 'react';

interface FeatureGateProps {
  /**
   * The feature to check (kept for backward compatibility, but all features now accessible)
   */
  feature?: string;
  /**
   * Content to show (always shown now)
   */
  children: React.ReactNode;
  /**
   * @deprecated No longer used - all content is shown
   */
  fallback?: React.ReactNode;
  /**
   * @deprecated No longer used - all features are accessible
   */
  showLocked?: boolean;
  /**
   * @deprecated No longer used
   */
  lockedMessage?: string;
  /**
   * @deprecated No longer used
   */
  className?: string;
  /**
   * @deprecated No longer used - no upgrade needed
   */
  onUpgradeClick?: () => void;
  /**
   * @deprecated No longer used
   */
  showOverlay?: boolean;
}

/**
 * FeatureGate Component
 *
 * Feature #414: Simplified to always show children.
 * Previously used for gating features based on user tier, but all users now have full access.
 *
 * @example
 * <FeatureGate feature="sagas">
 *   <button>Create Saga</button>
 * </FeatureGate>
 */
export default function FeatureGate({
  children,
}: FeatureGateProps): React.ReactElement {
  // All users now have access to all features (Feature #401)
  return <>{children}</>;
}
