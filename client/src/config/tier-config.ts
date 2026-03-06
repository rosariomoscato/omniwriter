/**
 * Tier Configuration for OmniWriter
 *
 * Feature #401: Simplified to two roles only: 'user' and 'admin'.
 * All users have full access to all features.
 *
 * Keep this file synchronized with backend tier configuration.
 */

// User role types
export type UserRole = 'user' | 'admin';

// All authenticated users have full access (no premium distinction)
export const PREMIUM_TIERS: UserRole[] = ['user', 'admin'];

// Tier limits configuration
export interface TierLimits {
  // Project limits
  maxProjects: number;           // Maximum number of projects (-1 = unlimited)
  maxChaptersPerProject: number; // Maximum chapters per project (-1 = unlimited)

  // Source upload limits
  maxSourcesPerProject: number;  // Maximum sources per project (-1 = unlimited)
  maxSourceSizeMB: number;       // Maximum file size per source in MB
  totalSourceStorageMB: number;  // Total storage for sources in MB (-1 = unlimited)

  // Generation limits
  maxGenerationLength: number;   // Maximum words per generation (-1 = unlimited)
  maxDailyGenerations: number;   // Maximum generations per day (-1 = unlimited)

  // Human Model limits
  maxHumanModels: number;        // Maximum Human Model profiles (-1 = unlimited)
  humanModelTrainingWords: number; // Minimum words required for training

  // Export format availability
  exportFormats: string[];       // Available export formats

  // Web search limits
  maxDailyWebSearches: number;   // Maximum web searches per day (-1 = unlimited)

  // AI model access
  aiModelTier: 'premium'; // All users have full model access

  // Features (all enabled for all users)
  canCreateSagas: boolean;       // Can create sagas/series
  canAnalyzeNovels: boolean;     // Can analyze existing novels
  canGoogleDriveSync: boolean;   // Google Drive integration
  canAdvancedAIModels: boolean;  // Access to advanced AI models (GPT-4, Claude Opus)
  canMultipleHumanProfiles: boolean; // Multiple Human Model profiles
  canFullHumanAnalysis: boolean; // Full Human Model analysis features
}

// Full access limits (shared by both user and admin)
const FULL_ACCESS_LIMITS: TierLimits = {
  // Project limits
  maxProjects: -1, // Unlimited
  maxChaptersPerProject: -1, // Unlimited

  // Source upload limits
  maxSourcesPerProject: -1, // Unlimited
  maxSourceSizeMB: 50,
  totalSourceStorageMB: -1, // Unlimited

  // Generation limits
  maxGenerationLength: -1, // Unlimited
  maxDailyGenerations: -1, // Unlimited

  // Human Model limits
  maxHumanModels: -1, // Unlimited
  humanModelTrainingWords: 50000,

  // Export format availability
  exportFormats: ['txt', 'docx', 'epub', 'pdf', 'rtf'],

  // Web search limits
  maxDailyWebSearches: -1, // Unlimited

  // AI model access
  aiModelTier: 'premium',

  // All features enabled
  canCreateSagas: true,
  canAnalyzeNovels: true,
  canGoogleDriveSync: true,
  canAdvancedAIModels: true,
  canMultipleHumanProfiles: true,
  canFullHumanAnalysis: true,
};

// TIER_LIMITS configuration per role
export const TIER_LIMITS: Record<UserRole, TierLimits> = {
  user: { ...FULL_ACCESS_LIMITS },
  admin: { ...FULL_ACCESS_LIMITS },
};

// Feature names for UI display
export const FEATURE_NAMES: Record<string, string> = {
  sagas: 'Creazione Saghe/Serie',
  novelAnalysis: 'Analisi Romanzi',
  googleDrive: 'Sincronizzazione Google Drive',
  advancedAI: 'Modelli AI Avanzati',
  multipleProfiles: 'Profili Human Model Multipli',
  fullHumanAnalysis: 'Analisi Human Model Completa',
  unlimitedProjects: 'Progetti Illimitati',
  unlimitedGenerations: 'Generazioni Illimitate',
  epubExport: 'Esportazione EPUB',
  pdfExport: 'Esportazione PDF',
  unlimitedSources: 'Fonti Illimitate',
  unlimitedWebSearch: 'Ricerca Web Illimitata',
};

// All authenticated users are considered "premium" (full access)
export function isPremiumTier(role: UserRole | undefined): boolean {
  if (!role) return false;
  return PREMIUM_TIERS.includes(role);
}

// Helper function to get limits for a specific role
export function getTierLimits(role: UserRole | undefined): TierLimits {
  if (!role) return TIER_LIMITS.user;
  return TIER_LIMITS[role] || TIER_LIMITS.user;
}

// Export format tier requirements (no longer needed, all formats available to all users)
export const PREMIUM_EXPORT_FORMATS = ['epub', 'pdf', 'rtf'];

export default TIER_LIMITS;
