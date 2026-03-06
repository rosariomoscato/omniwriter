/**
 * Tier Permissions Configuration
 *
 * Centralized configuration for all user role limits and permissions.
 * Feature #401: Simplified to two roles only:
 * - user: Standard authenticated user with full access to all features
 * - admin: Full system access (same as user + admin features)
 */

// Type definitions for tier limits
export type UserRole = 'user' | 'admin';

export interface GenerationLimits {
  /** Maximum words per generation (null = unlimited) */
  maxWordsPerGeneration: number | null;
  /** Maximum chapters per project (null = unlimited) */
  maxChaptersPerProject: number | null;
  /** Maximum total words per project (null = unlimited) */
  maxWordsPerProject: number | null;
  /** Maximum generations per day (null = unlimited) */
  maxGenerationsPerDay: number | null;
  /** Can generate full novels/books */
  canGenerateFullContent: boolean;
}

export interface HumanModelLimits {
  /** Maximum number of style profiles */
  maxProfiles: number;
  /** Minimum word count for training Romanziere model */
  minWordCountRomanziere: number;
  /** Minimum word count for training Saggista/Redattore model */
  minWordCountBasic: number;
  /** Can use articulated analysis (Romanziere deep style) */
  canUseArticulatedAnalysis: boolean;
  /** Maximum word count per profile upload (MB) */
  maxUploadSizeMB: number;
  /** Style strength slider (0-100) */
  canAdjustStyleStrength: boolean;
}

export interface SourceLimits {
  /** Maximum number of sources per project (null = unlimited) */
  maxSourcesPerProject: number | null;
  /** Maximum file size per upload in MB */
  maxFileSizeMB: number;
  /** Maximum total storage in MB (null = unlimited) */
  maxTotalStorageMB: number | null;
  /** Allowed file types for upload */
  allowedFileTypes: string[];
  /** Can use web search for sources */
  canUseWebSearch: boolean;
  /** Maximum web searches per day (null = unlimited) */
  maxWebSearchesPerDay: number | null;
  /** Can save web search results as sources */
  canSaveWebSearchResults: boolean;
}

export interface ExportLimits {
  /** Available export formats */
  availableFormats: ('docx' | 'epub' | 'rtf' | 'pdf' | 'txt')[];
  /** Can upload custom EPUB cover image */
  canUploadEpubCover: boolean;
  /** Can edit EPUB metadata (title, author, ISBN, description) */
  canEditEpubMetadata: boolean;
  /** Can batch export multiple chapters/sections */
  canBatchExport: boolean;
  /** Can preview export before download */
  canPreviewExport: boolean;
  /** Can customize export formatting options */
  canCustomizeFormatting: boolean;
}

export interface SagaLimits {
  /** Can create sagas/series */
  canCreateSagas: boolean;
  /** Maximum sagas per user (null = unlimited) */
  maxSagasPerUser: number | null;
  /** Maximum projects per saga (null = unlimited) */
  maxProjectsPerSaga: number | null;
  /** Can share sources across saga projects */
  canShareSources: boolean;
  /** Can use continuity checker across saga */
  canUseContinuityChecker: boolean;
  /** Can use novel analysis feature */
  canAnalyzeNovels: boolean;
  /** Can use sequel proposal feature */
  canProposeSequel: boolean;
}

export interface IntegrationLimits {
  /** Can connect Google Drive */
  canConnectGoogleDrive: boolean;
  /** Can save projects to Google Drive */
  canSaveToGoogleDrive: boolean;
  /** Can load projects from Google Drive */
  canLoadFromGoogleDrive: boolean;
  /** Can use advanced AI model selection */
  canSelectAiModel: boolean;
  /** Available AI models for selection */
  availableAiModels: string[];
  /** Can adjust quality vs speed setting */
  canAdjustQualitySetting: boolean;
  /** Can use SEO optimization tools (Redattore) */
  canUseSeoTools: boolean;
}

export interface TierLimits {
  generation: GenerationLimits;
  humanModel: HumanModelLimits;
  sources: SourceLimits;
  export: ExportLimits;
  saga: SagaLimits;
  integration: IntegrationLimits;
}

/**
 * User limits - full access to all features
 * Feature #401: All users now have what was previously "premium" access
 */
const USER_LIMITS: TierLimits = {
  generation: {
    maxWordsPerGeneration: null,       // Unlimited
    maxChaptersPerProject: null,       // Unlimited
    maxWordsPerProject: null,          // Unlimited
    maxGenerationsPerDay: null,        // Unlimited
    canGenerateFullContent: true,      // Full novels/essays
  },
  humanModel: {
    maxProfiles: 10,                   // Multiple profiles
    minWordCountRomanziere: 50000,     // Same minimum for quality
    minWordCountBasic: 10000,
    canUseArticulatedAnalysis: true,   // Deep style replication
    maxUploadSizeMB: 25,               // 25MB per upload
    canAdjustStyleStrength: true,      // Style strength slider available
  },
  sources: {
    maxSourcesPerProject: null,        // Unlimited
    maxFileSizeMB: 25,                 // 25MB per file
    maxTotalStorageMB: null,           // Unlimited storage
    allowedFileTypes: ['pdf', 'docx', 'txt', 'rtf'],
    canUseWebSearch: true,             // Full web search
    maxWebSearchesPerDay: null,        // Unlimited
    canSaveWebSearchResults: true,
  },
  export: {
    availableFormats: ['docx', 'epub', 'rtf', 'pdf', 'txt'], // All formats
    canUploadEpubCover: true,          // EPUB cover upload
    canEditEpubMetadata: true,         // EPUB metadata editing
    canBatchExport: true,              // Batch export
    canPreviewExport: true,            // Export preview
    canCustomizeFormatting: true,      // Custom formatting
  },
  saga: {
    canCreateSagas: true,              // Saga grouping
    maxSagasPerUser: null,             // Unlimited
    maxProjectsPerSaga: null,          // Unlimited
    canShareSources: true,             // Shared sources
    canUseContinuityChecker: true,     // Continuity checker
    canAnalyzeNovels: true,            // Novel analysis
    canProposeSequel: true,            // Sequel proposal
  },
  integration: {
    canConnectGoogleDrive: true,       // Google Drive integration
    canSaveToGoogleDrive: true,
    canLoadFromGoogleDrive: true,
    canSelectAiModel: true,            // AI model selection
    availableAiModels: ['gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet', 'default'],
    canAdjustQualitySetting: true,     // Quality/speed setting
    canUseSeoTools: true,              // Full SEO tools
  },
};

/**
 * Admin limits - inherits all user features
 */
const ADMIN_LIMITS: TierLimits = {
  ...USER_LIMITS,
};

/**
 * Complete tier limits configuration
 * Maps each user role to its corresponding limits
 */
export const TIER_LIMITS: Record<UserRole, TierLimits> = {
  user: USER_LIMITS,
  admin: ADMIN_LIMITS,
};

/**
 * Helper function to get limits for a specific role
 */
export function getTierLimits(role: UserRole): TierLimits {
  return TIER_LIMITS[role] || TIER_LIMITS.user;
}

/**
 * Helper function to check if a feature is available for a role
 */
export function isFeatureAvailable(
  role: UserRole,
  featurePath: string
): boolean {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const pathParts = featurePath.split('.');

  let current: unknown = limits;
  for (const part of pathParts) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current === true || current === null;
}

/**
 * Helper function to get a specific limit value for a role
 */
export function getLimitValue(
  role: UserRole,
  limitPath: string
): number | string | boolean | string[] | null {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const pathParts = limitPath.split('.');

  let current: unknown = limits;
  for (const part of pathParts) {
    if (typeof current !== 'object' || current === null) {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as number | string | boolean | string[] | null;
}

/**
 * Check if generation is allowed based on word count limits
 */
export function canGenerateWords(
  role: UserRole,
  requestedWords: number,
  currentProjectWords: number
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const { maxWordsPerGeneration, maxWordsPerProject } = limits.generation;

  if (maxWordsPerGeneration !== null && requestedWords > maxWordsPerGeneration) {
    return {
      allowed: false,
      reason: `Generazione limitata a ${maxWordsPerGeneration.toLocaleString('it-IT')} parole per richiesta.`,
    };
  }

  if (maxWordsPerProject !== null && currentProjectWords + requestedWords > maxWordsPerProject) {
    return {
      allowed: false,
      reason: `Limite di ${maxWordsPerProject.toLocaleString('it-IT')} parole per progetto raggiunto.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create a new style profile
 */
export function canCreateStyleProfile(
  role: UserRole,
  currentProfileCount: number
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const { maxProfiles } = limits.humanModel;

  if (currentProfileCount >= maxProfiles) {
    return {
      allowed: false,
      reason: `Limite di ${maxProfiles} profili stile raggiunto.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can upload a source
 */
export function canUploadSource(
  role: UserRole,
  fileSizeMB: number,
  currentSourceCount: number,
  currentTotalStorageMB: number
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const { maxSourcesPerProject, maxFileSizeMB, maxTotalStorageMB } = limits.sources;

  if (maxSourcesPerProject !== null && currentSourceCount >= maxSourcesPerProject) {
    return {
      allowed: false,
      reason: `Limite di ${maxSourcesPerProject} fonti per progetto raggiunto.`,
    };
  }

  if (fileSizeMB > maxFileSizeMB) {
    return {
      allowed: false,
      reason: `File troppo grande. Limite: ${maxFileSizeMB}MB.`,
    };
  }

  if (maxTotalStorageMB !== null && currentTotalStorageMB + fileSizeMB > maxTotalStorageMB) {
    return {
      allowed: false,
      reason: `Spazio di archiviazione esaurito.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if export format is available for role
 */
export function canExportFormat(
  role: UserRole,
  format: string
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const { availableFormats } = limits.export;

  if (!availableFormats.includes(format as 'docx' | 'epub' | 'rtf' | 'pdf' | 'txt')) {
    return {
      allowed: false,
      reason: `Formato ${format.toUpperCase()} non disponibile.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create a saga
 */
export function canCreateSaga(
  role: UserRole,
  currentSagaCount: number
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[role] || TIER_LIMITS.user;
  const { canCreateSagas, maxSagasPerUser } = limits.saga;

  if (!canCreateSagas) {
    return {
      allowed: false,
      reason: 'La creazione di saghe/serie non e disponibile.',
    };
  }

  if (maxSagasPerUser !== null && currentSagaCount >= maxSagasPerUser) {
    return {
      allowed: false,
      reason: `Limite di ${maxSagasPerUser} saghe raggiunto.`,
    };
  }

  return { allowed: true };
}

/**
 * Get user-friendly tier name in Italian
 */
export function getTierName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    user: 'Utente',
    admin: 'Amministratore',
  };
  return names[role] || 'Utente';
}

/**
 * Get tier upgrade prompt message
 * @deprecated No longer needed since all users have full access
 */
export function getUpgradePrompt(feature: string): string {
  return `La funzionalita "${feature}" non e attualmente disponibile.`;
}

export default TIER_LIMITS;
