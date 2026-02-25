/**
 * Tier Check Middleware
 *
 * Middleware for checking user tier permissions and limits.
 * Uses the centralized TIER_LIMITS configuration from tier-permissions.ts
 *
 * Two middleware types:
 * - checkTierFeature: For boolean feature gates (e.g., canUseWebSearch)
 * - checkTierLimit: For quantitative limits with database queries (e.g., maxSourcesPerProject)
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getDatabase } from '../db/database';
import {
  TIER_LIMITS,
  isFeatureAvailable,
  getLimitValue,
  UserRole,
} from '../config/tier-permissions';

/**
 * Response structure for tier check errors
 */
interface TierCheckError {
  message: string;
  code: 'PREMIUM_REQUIRED' | 'TIER_LIMIT_REACHED';
  feature?: string;
  limitType?: string;
  current?: number;
  max?: number | null;
}

/**
 * Check if a boolean feature is available for the user's tier.
 * Use this for feature gates like: canUseWebSearch, canCreateSagas, canSelectAiModel
 *
 * @param featurePath - Dot-notation path to the feature (e.g., 'sources.canUseWebSearch')
 *
 * @example
 * // Check if user can use web search
 * router.post('/web-search', checkTierFeature('sources.canUseWebSearch'), handleWebSearch);
 */
export function checkTierFeature(featurePath: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Get user role from authenticated request
    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check if feature is available for this tier
    const isAvailable = isFeatureAvailable(userRole, featurePath);

    if (!isAvailable) {
      const error: TierCheckError = {
        message: `La funzionalità "${getFeatureDisplayName(featurePath)}" richiede un abbonamento Premium.`,
        code: 'PREMIUM_REQUIRED',
        feature: featurePath,
      };
      res.status(403).json(error);
      return;
    }

    next();
  };
}

/**
 * Check if a quantitative limit has been reached for the user's tier.
 * Performs database queries to check current usage against tier limits.
 *
 * @param limitPath - Dot-notation path to the limit (e.g., 'generation.maxWordsPerGeneration')
 * @param options - Configuration for how to check the limit
 *
 * @example
 * // Check if user can upload more sources (counts current sources for project)
 * router.post('/sources/upload',
 *   checkTierLimit('sources.maxSourcesPerProject', {
 *     countQuery: 'SELECT COUNT(*) as count FROM sources WHERE project_id = ?',
 *     queryParam: 'projectId', // Uses req.params.projectId
 *   }),
 *   handleUpload
 * );
 */
export function checkTierLimit(
  limitPath: string,
  options: {
    /** SQL query to get current count/usage */
    countQuery: string;
    /** Where to get the query parameter: 'body', 'params', 'query' */
    paramSource?: 'body' | 'params' | 'query';
    /** Name of the parameter to use in query */
    paramName: string;
    /** Optional: custom value to add to current (e.g., file size for storage) */
    additionalValue?: number | ((req: AuthRequest) => number);
    /** Optional: check against a different value than count (e.g., file size) */
    valueToCheck?: 'count' | 'custom';
    /** For custom checks: function to get the value to compare */
    customValueGetter?: (req: AuthRequest, currentCount: number) => number;
  }
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Get user role from authenticated request
    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Get the limit value for this tier
    const maxLimit = getLimitValue(userRole, limitPath);

    // If limit is null, it means unlimited - allow the request
    if (maxLimit === null) {
      next();
      return;
    }

    // Get the parameter value for the query
    const paramSource = options.paramSource || 'params';
    let paramValue: unknown;
    switch (paramSource) {
      case 'body':
        paramValue = req.body[options.paramName];
        break;
      case 'query':
        paramValue = req.query[options.paramName];
        break;
      case 'params':
      default:
        paramValue = req.params[options.paramName];
        break;
    }

    // Execute count query
    const db = getDatabase();
    try {
      const stmt = db.prepare(options.countQuery);
      const result = stmt.get(paramValue) as { count: number } | undefined;
      const currentCount = result?.count || 0;

      // Determine value to check against limit
      let valueToCheck: number;
      if (options.valueToCheck === 'custom' && options.customValueGetter) {
        valueToCheck = options.customValueGetter(req, currentCount);
      } else {
        valueToCheck = currentCount;
        // Add additional value if provided (e.g., file size)
        if (options.additionalValue) {
          const additional =
            typeof options.additionalValue === 'function'
              ? options.additionalValue(req)
              : options.additionalValue;
          valueToCheck += additional;
        }
      }

      // Check against limit
      const numericLimit = typeof maxLimit === 'number' ? maxLimit : 0;
      if (valueToCheck > numericLimit) {
        const error: TierCheckError = {
          message: `Hai raggiunto il limite di ${getLimitDisplayName(limitPath)} per il tuo piano.`,
          code: 'TIER_LIMIT_REACHED',
          limitType: limitPath,
          current: currentCount,
          max: numericLimit,
        };
        res.status(403).json(error);
        return;
      }

      // Store current count in request for later use if needed
      req.tierCheck = {
        currentCount,
        maxLimit: numericLimit,
        limitPath,
      };

      next();
    } catch (error) {
      console.error('[TierCheck] Error checking limit:', error);
      res.status(500).json({
        message: 'Error checking tier limits',
        code: 'TIER_CHECK_ERROR',
      });
    }
  };
}

/**
 * Check if user can generate content based on word count limits.
 * Combines per-generation and per-project limits.
 */
export function checkGenerationLimit(
  projectId: string,
  requestedWords: number
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const limits = TIER_LIMITS[userRole];
    const { maxWordsPerGeneration, maxWordsPerProject } = limits.generation;

    // Check per-generation limit
    if (maxWordsPerGeneration !== null && requestedWords > maxWordsPerGeneration) {
      const error: TierCheckError = {
        message: `Generazione limitata a ${maxWordsPerGeneration.toLocaleString('it-IT')} parole per richiesta. Passa a Premium per sbloccare generazioni illimitate.`,
        code: 'TIER_LIMIT_REACHED',
        limitType: 'generation.maxWordsPerGeneration',
        current: requestedWords,
        max: maxWordsPerGeneration,
      };
      res.status(403).json(error);
      return;
    }

    // Check per-project limit
    if (maxWordsPerProject !== null) {
      const db = getDatabase();
      const project = db
        .prepare('SELECT word_count FROM projects WHERE id = ?')
        .get(projectId) as { word_count: number } | undefined;

      const currentWords = project?.word_count || 0;

      if (currentWords + requestedWords > maxWordsPerProject) {
        const error: TierCheckError = {
          message: `Limite di ${maxWordsPerProject.toLocaleString('it-IT')} parole per progetto raggiunto. Passa a Premium per progetti illimitati.`,
          code: 'TIER_LIMIT_REACHED',
          limitType: 'generation.maxWordsPerProject',
          current: currentWords,
          max: maxWordsPerProject,
        };
        res.status(403).json(error);
        return;
      }
    }

    next();
  };
}

/**
 * Check if user can upload a source file based on size and count limits.
 */
export function checkSourceUploadLimit(
  projectId: string,
  fileSizeBytes: number
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const limits = TIER_LIMITS[userRole];
    const { maxSourcesPerProject, maxFileSizeMB, maxTotalStorageMB } = limits.sources;

    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    // Check file size limit
    if (fileSizeMB > maxFileSizeMB) {
      const error: TierCheckError = {
        message: `File troppo grande. Limite: ${maxFileSizeMB}MB. Passa a Premium per file fino a 25MB.`,
        code: 'TIER_LIMIT_REACHED',
        limitType: 'sources.maxFileSizeMB',
        current: Math.round(fileSizeMB * 100) / 100,
        max: maxFileSizeMB,
      };
      res.status(403).json(error);
      return;
    }

    const db = getDatabase();

    // Check source count limit
    if (maxSourcesPerProject !== null) {
      const countResult = db
        .prepare('SELECT COUNT(*) as count FROM sources WHERE project_id = ?')
        .get(projectId) as { count: number };

      if (countResult.count >= maxSourcesPerProject) {
        const error: TierCheckError = {
          message: `Limite di ${maxSourcesPerProject} fonti per progetto raggiunto. Passa a Premium per fonti illimitate.`,
          code: 'TIER_LIMIT_REACHED',
          limitType: 'sources.maxSourcesPerProject',
          current: countResult.count,
          max: maxSourcesPerProject,
        };
        res.status(403).json(error);
        return;
      }
    }

    // Check total storage limit
    if (maxTotalStorageMB !== null) {
      const storageResult = db
        .prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM sources WHERE user_id = ?')
        .get(req.user!.id) as { total: number };

      const totalStorageMB = storageResult.total / (1024 * 1024);

      if (totalStorageMB + fileSizeMB > maxTotalStorageMB) {
        const error: TierCheckError = {
          message: `Spazio di archiviazione esaurito. Passa a Premium per spazio illimitato.`,
          code: 'TIER_LIMIT_REACHED',
          limitType: 'sources.maxTotalStorageMB',
          current: Math.round(totalStorageMB * 100) / 100,
          max: maxTotalStorageMB,
        };
        res.status(403).json(error);
        return;
      }
    }

    next();
  };
}

/**
 * Check if user can export in a specific format.
 */
export function checkExportFormat(format: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const availableFormats = getLimitValue(userRole, 'export.availableFormats') as string[];

    if (!availableFormats.includes(format)) {
      const error: TierCheckError = {
        message: `Formato ${format.toUpperCase()} non disponibile nel piano Free. Passa a Premium per esportare in tutti i formati.`,
        code: 'PREMIUM_REQUIRED',
        feature: `export.${format}`,
      };
      res.status(403).json(error);
      return;
    }

    next();
  };
}

/**
 * Check if user can create a new Human Model profile.
 */
export function checkHumanModelLimit() {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const maxProfiles = getLimitValue(userRole, 'humanModel.maxProfiles') as number;

    const db = getDatabase();
    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM human_models WHERE user_id = ?')
      .get(req.user!.id) as { count: number };

    if (countResult.count >= maxProfiles) {
      const error: TierCheckError = {
        message: `Limite di ${maxProfiles} profili stile raggiunto. Passa a Premium per creare più profili.`,
        code: 'TIER_LIMIT_REACHED',
        limitType: 'humanModel.maxProfiles',
        current: countResult.count,
        max: maxProfiles,
      };
      res.status(403).json(error);
      return;
    }

    next();
  };
}

/**
 * Helper: Get user-friendly display name for a feature path
 */
function getFeatureDisplayName(featurePath: string): string {
  const displayNames: Record<string, string> = {
    'sources.canUseWebSearch': 'Ricerca Web',
    'sources.canSaveWebSearchResults': 'Salvataggio risultati ricerca',
    'saga.canCreateSagas': 'Creazione Saghe/Serie',
    'saga.canShareSources': 'Condivisione fonti tra saghe',
    'saga.canUseContinuityChecker': 'Controllo continuità',
    'saga.canAnalyzeNovels': 'Analisi romanzi',
    'saga.canProposeSequel': 'Proposta sequel',
    'integration.canConnectGoogleDrive': 'Integrazione Google Drive',
    'integration.canSelectAiModel': 'Selezione modello AI',
    'integration.canAdjustQualitySetting': 'Impostazione qualità/velocità',
    'integration.canUseSeoTools': 'Strumenti SEO avanzati',
    'humanModel.canUseArticulatedAnalysis': 'Analisi stile approfondita',
    'humanModel.canAdjustStyleStrength': 'Regolazione intensità stile',
    'export.canUploadEpubCover': 'Cover EPUB personalizzata',
    'export.canEditEpubMetadata': 'Metadata EPUB',
    'export.canBatchExport': 'Esportazione batch',
    'export.canPreviewExport': 'Anteprima esportazione',
    'export.canCustomizeFormatting': 'Formattazione personalizzata',
    'generation.canGenerateFullContent': 'Generazione contenuti completi',
  };

  return displayNames[featurePath] || featurePath;
}

/**
 * Helper: Get user-friendly display name for a limit path
 */
function getLimitDisplayName(limitPath: string): string {
  const displayNames: Record<string, string> = {
    'generation.maxWordsPerGeneration': 'parole per generazione',
    'generation.maxChaptersPerProject': 'capitoli per progetto',
    'generation.maxWordsPerProject': 'parole per progetto',
    'generation.maxGenerationsPerDay': 'generazioni al giorno',
    'humanModel.maxProfiles': 'profili stile',
    'humanModel.maxUploadSizeMB': 'MB per upload',
    'sources.maxSourcesPerProject': 'fonti per progetto',
    'sources.maxFileSizeMB': 'MB per file',
    'sources.maxTotalStorageMB': 'MB di spazio totale',
    'sources.maxWebSearchesPerDay': 'ricerche web al giorno',
    'saga.maxSagasPerUser': 'saghe',
    'saga.maxProjectsPerSaga': 'progetti per saga',
  };

  return displayNames[limitPath] || limitPath;
}

// Extend AuthRequest to include tierCheck info
declare module 'express' {
  interface Request {
    tierCheck?: {
      currentCount: number;
      maxLimit: number;
      limitPath: string;
    };
  }
}

export default {
  checkTierFeature,
  checkTierLimit,
  checkGenerationLimit,
  checkSourceUploadLimit,
  checkExportFormat,
  checkHumanModelLimit,
};
