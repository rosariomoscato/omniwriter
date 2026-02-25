/**
 * Tier Configuration for OmniWriter
 *
 * This file mirrors the backend TIER_LIMITS configuration
 * to allow client-side UI checks before API calls.
 *
 * Keep this file synchronized with backend tier configuration.
 */

// User role types
export type UserRole = 'free' | 'premium' | 'lifetime' | 'admin';

// Premium tiers (have access to premium features)
export const PREMIUM_TIERS: UserRole[] = ['premium', 'lifetime', 'admin'];

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
  aiModelTier: 'free' | 'premium'; // Which tier of AI models are available

  // Premium features
  canCreateSagas: boolean;       // Can create sagas/series
  canAnalyzeNovels: boolean;     // Can analyze existing novels
  canGoogleDriveSync: boolean;   // Google Drive integration
  canAdvancedAIModels: boolean;  // Access to advanced AI models (GPT-4, Claude Opus)
  canMultipleHumanProfiles: boolean; // Multiple Human Model profiles
  canFullHumanAnalysis: boolean; // Full Human Model analysis features
}

// TIER_LIMITS configuration per role
export const TIER_LIMITS: Record<UserRole, TierLimits> = {
  free: {
    // Project limits
    maxProjects: 10,
    maxChaptersPerProject: 20,

    // Source upload limits
    maxSourcesPerProject: 5,
    maxSourceSizeMB: 5,
    totalSourceStorageMB: 50,

    // Generation limits
    maxGenerationLength: 2000,
    maxDailyGenerations: 50,

    // Human Model limits
    maxHumanModels: 1,
    humanModelTrainingWords: 50000,

    // Export format availability
    exportFormats: ['txt', 'docx'],

    // Web search limits
    maxDailyWebSearches: 10,

    // AI model access
    aiModelTier: 'free',

    // Premium features
    canCreateSagas: false,
    canAnalyzeNovels: false,
    canGoogleDriveSync: false,
    canAdvancedAIModels: false,
    canMultipleHumanProfiles: false,
    canFullHumanAnalysis: false,
  },

  premium: {
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

    // Premium features
    canCreateSagas: true,
    canAnalyzeNovels: true,
    canGoogleDriveSync: true,
    canAdvancedAIModels: true,
    canMultipleHumanProfiles: true,
    canFullHumanAnalysis: true,
  },

  lifetime: {
    // Same as premium
    maxProjects: -1,
    maxChaptersPerProject: -1,
    maxSourcesPerProject: -1,
    maxSourceSizeMB: 50,
    totalSourceStorageMB: -1,
    maxGenerationLength: -1,
    maxDailyGenerations: -1,
    maxHumanModels: -1,
    humanModelTrainingWords: 50000,
    exportFormats: ['txt', 'docx', 'epub', 'pdf', 'rtf'],
    maxDailyWebSearches: -1,
    aiModelTier: 'premium',
    canCreateSagas: true,
    canAnalyzeNovels: true,
    canGoogleDriveSync: true,
    canAdvancedAIModels: true,
    canMultipleHumanProfiles: true,
    canFullHumanAnalysis: true,
  },

  admin: {
    // Admin has full access (same as premium)
    maxProjects: -1,
    maxChaptersPerProject: -1,
    maxSourcesPerProject: -1,
    maxSourceSizeMB: 50,
    totalSourceStorageMB: -1,
    maxGenerationLength: -1,
    maxDailyGenerations: -1,
    maxHumanModels: -1,
    humanModelTrainingWords: 50000,
    exportFormats: ['txt', 'docx', 'epub', 'pdf', 'rtf'],
    maxDailyWebSearches: -1,
    aiModelTier: 'premium',
    canCreateSagas: true,
    canAnalyzeNovels: true,
    canGoogleDriveSync: true,
    canAdvancedAIModels: true,
    canMultipleHumanProfiles: true,
    canFullHumanAnalysis: true,
  },
};

// Feature names for upgrade prompts
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

// Helper function to check if a tier is premium
export function isPremiumTier(role: UserRole | undefined): boolean {
  if (!role) return false;
  return PREMIUM_TIERS.includes(role);
}

// Helper function to get limits for a specific role
export function getTierLimits(role: UserRole | undefined): TierLimits {
  if (!role) return TIER_LIMITS.free;
  return TIER_LIMITS[role] || TIER_LIMITS.free;
}

// Export format tier requirements
export const PREMIUM_EXPORT_FORMATS = ['epub', 'pdf', 'rtf'];

export default TIER_LIMITS;
