// @ts-nocheck
import { Router, Response, Request, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkHumanModelLimit } from '../middleware/tierCheck';
import { TIER_LIMITS, UserRole } from '../config/tier-permissions';
import { HumanModel, CreateHumanModelInput } from '../models/HumanModel';
import { analyzeWritingStyle, isAIAvailable, hasUserProvider } from '../services/ai-service';
import { extractTextFromFile, isSupportedFormat } from '../services/text-extraction';
import { getUserStorageInfo, hasStorageQuota, increaseUserStorage, decreaseUserStorage } from '../utils/storage'; // Feature #404 - Storage quota tracking

const router = Router();

// Configure multer for file uploads in Human Model
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'human-model-sources');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Check if format is supported
    if (isSupportedFormat(ext)) {
      cb(null, true);
    } else {
      const error = new Error('INVALID_FILE_TYPE');
      (error as any).status = 400;
      (error as any).code = 'LIMIT_FILE_TYPE';
      (error as any).message = 'Invalid file type. Supported formats: TXT, DOCX, DOC, RTF, PDF';
      cb(error as any, false);
    }
  },
});

// Helper function to count words in text
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// GET /api/human-models - List user's human models
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;

    console.log('[HumanModels] Fetching models for user:', userId);
    const models = db.prepare(
      'SELECT * FROM human_models WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as HumanModel[];

    console.log('[HumanModels] Found', models.length, 'models');
    res.json({ models, count: models.length });
  } catch (error) {
    console.error('[HumanModels] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/human-models/:id - Get single model with sources
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

    console.log('[HumanModels] Fetching model:', modelId, 'for user:', userId);
    const model = db.prepare(
      'SELECT * FROM human_models WHERE id = ? AND user_id = ?'
    ).get(modelId, userId) as HumanModel | undefined;

    if (!model) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    // Fetch sources for this model
    const sources = db.prepare(
      'SELECT * FROM human_model_sources WHERE human_model_id = ? ORDER BY uploaded_at DESC'
    ).all(modelId);

    res.json({ model, sources });
  } catch (error) {
    console.error('[HumanModels] Get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/human-models - Create new style profile
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/', authenticateToken, checkHumanModelLimit(), (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const userRole = req.user?.role as UserRole;
    const { name, description, model_type, style_strength }: CreateHumanModelInput = req.body;

    if (!name) {
      res.status(400).json({ message: 'Name is required' });
      return;
    }

    if (!model_type || !['romanziere_advanced', 'saggista_basic', 'redattore_basic'].includes(model_type)) {
      res.status(400).json({ message: 'Invalid model type' });
      return;
    }

    // Check if user can use romanziere_advanced (articulated analysis) - Premium only
    if (model_type === 'romanziere_advanced') {
      const limits = TIER_LIMITS[userRole];
      if (!limits.humanModel.canUseArticulatedAnalysis) {
        res.status(403).json({
          message: 'L\'analisi stile approfondita (Romanziere Advanced) richiede un abbonamento Premium. Passa a Premium per sbloccare questa funzionalità.',
          code: 'PREMIUM_REQUIRED',
          feature: 'humanModel.canUseArticulatedAnalysis',
        });
        return;
      }
    }

    const modelId = uuidv4();

    console.log('[HumanModels] Creating model:', modelId, 'for user:', userId);
    db.prepare(
      `INSERT INTO human_models (id, user_id, name, description, model_type, analysis_result_json, total_word_count, training_status, style_strength, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', 0, 'pending', ?, datetime('now'), datetime('now'))`
    ).run(
      modelId,
      userId,
      name,
      description || '',
      model_type,
      style_strength || 50
    );

    // Fetch and return newly created model
    const model = db.prepare('SELECT * FROM human_models WHERE id = ?').get(modelId) as HumanModel;
    console.log('[HumanModels] Model created successfully:', modelId);

    res.status(201).json({ message: 'Style profile created successfully', model });
  } catch (error) {
    console.error('[HumanModels] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/human-models/:id - Update model
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

    // Check ownership
    const existing = db.prepare('SELECT id FROM human_models WHERE id = ? AND user_id = ?').get(modelId, userId);
    if (!existing) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    const { name, description, model_type, style_strength } = req.body;

    console.log('[HumanModels] Updating model:', modelId);
    db.prepare(
      `UPDATE human_models SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        model_type = COALESCE(?, model_type),
        style_strength = COALESCE(?, style_strength),
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(
      name || null,
      description || null,
      model_type || null,
      style_strength || null,
      modelId,
      userId
    );

    const model = db.prepare('SELECT * FROM human_models WHERE id = ?').get(modelId) as HumanModel;
    console.log('[HumanModels] Model updated successfully:', modelId);

    res.json({ message: 'Model updated successfully', model });
  } catch (error) {
    console.error('[HumanModels] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/human-models/:id - Delete model
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

    console.log('[HumanModels] Deleting model:', modelId, 'for user:', userId);

    // First, get sources to delete files
    const sources = db.prepare('SELECT file_path FROM human_model_sources WHERE human_model_id = ?').all(modelId) as Array<{ file_path: string }>;

    // Delete source files from filesystem
    for (const source of sources) {
      try {
        if (fs.existsSync(source.file_path)) {
          fs.unlinkSync(source.file_path);
          console.log('[HumanModels] Deleted source file:', source.file_path);
        }
      } catch (err) {
        console.warn('[HumanModels] Failed to delete file:', source.file_path, err);
      }
    }

    // Delete model (cascade will delete sources from DB)
    const result = db.prepare('DELETE FROM human_models WHERE id = ? AND user_id = ?').run(modelId, userId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    console.log('[HumanModels] Model deleted successfully:', modelId);
    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('[HumanModels] Delete error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @ts-nocheck
// POST /api/human-models/:id/upload - Upload writing for style analysis
// Supports both multipart/form-data (file upload) and JSON (text content)
router.post(
  '/:id/upload',
  authenticateToken,
  (req: any, res: Response, next: NextFunction) => {
    // Check content type to decide how to handle the request
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart file upload
      upload.single('file')(req, res, (err: any) => {
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
          }
          if (err.code === 'LIMIT_FILE_TYPE' || err.message === 'INVALID_FILE_TYPE') {
            return res.status(400).json({
              message: 'Invalid file type. Supported formats: TXT, DOCX, DOC, RTF, PDF'
            });
          }
          return res.status(400).json({ message: err.message || 'File upload failed' });
        }
        next();
      });
    } else {
      // Pass through for JSON handling
      next();
    }
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const db = getDatabase();
      const userId = req.user?.id;
      const modelId = req.params.id;

      console.log('[HumanModels] Upload request received for model:', modelId, 'by user:', userId);

      // Check ownership
      const model = db.prepare('SELECT id, total_word_count FROM human_models WHERE id = ? AND user_id = ?').get(modelId, userId) as HumanModel | undefined;
      if (!model) {
        console.log('[HumanModels] Model not found:', modelId);
        // Clean up uploaded file if exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(404).json({ message: 'Human model not found' });
        return;
      }

      // Feature #405: Check storage quota from users table before upload
      if (req.file) {
        const storageInfo = getUserStorageInfo(userId);
        const newFileSizeBytes = req.file.size;

        if (!hasStorageQuota(userId, newFileSizeBytes)) {
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          const usedMB = Math.round((storageInfo.used / (1024 * 1024)) * 100) / 100;
          const limitMB = Math.round((storageInfo.limit / (1024 * 1024)) * 100) / 100;
          const availableMB = Math.round(((storageInfo.limit - storageInfo.used) / (1024 * 1024)) * 100) / 100;
          const fileMB = Math.round((newFileSizeBytes / (1024 * 1024)) * 100) / 100;

          return res.status(413).json({
            message: `Spazio insufficiente. Hai usato ${usedMB} MB su ${limitMB} MB (${availableMB} MB disponibili). Il file richiede ${fileMB} MB.`,
            code: 'STORAGE_QUOTA_EXCEEDED',
            used: storageInfo.used,
            limit: storageInfo.limit,
            available: storageInfo.limit - storageInfo.used,
            required: newFileSizeBytes,
            usedMB,
            limitMB,
            availableMB,
            fileMB
          });
        }
      }

      const contentType = req.headers['content-type'] || '';
      let file_name: string;
      let file_type: string;
      let content_text: string;
      let filePath: string;

      if (contentType.includes('multipart/form-data') && req.file) {
        // Handle file upload
        console.log('[HumanModels] Processing file upload:', req.file.originalname);

        file_name = req.file.originalname;
        file_type = req.file.mimetype;
        filePath = req.file.path;

        // Extract text from the uploaded file
        const extractionResult = await extractTextFromFile(req.file.path);

        if (extractionResult.error) {
          // Clean up uploaded file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          console.log('[HumanModels] Text extraction error:', extractionResult.error);
          return res.status(400).json({ message: extractionResult.error });
        }

        content_text = extractionResult.text;
        console.log('[HumanModels] Text extracted successfully. Word count:', extractionResult.wordCount);
      } else {
        // Handle JSON upload (backward compatibility)
        const body = req.body;
        file_name = body.file_name;
        file_type = body.file_type;
        content_text = body.content_text;

        if (!file_name || !file_type || !content_text) {
          console.log('[HumanModels] Missing required fields');
          res.status(400).json({ message: 'file_name, file_type, and content_text are required' });
          return;
        }

        // Validate content size (max 10MB per file)
        const contentSizeMB = Buffer.byteLength(content_text, 'utf8') / (1024 * 1024);
        if (contentSizeMB > 10) {
          console.log('[HumanModels] File too large:', contentSizeMB.toFixed(2), 'MB');
          res.status(413).json({ message: `File too large (${contentSizeMB.toFixed(2)} MB). Maximum allowed size is 10 MB.` });
          return;
        }

        // Validate file type for Human Model uploads
        const validExtensions = ['.pdf', '.docx', '.doc', '.rtf', '.txt'];
        const fileExtension = path.extname(file_name).toLowerCase();

        const isValidMimeType = file_type === 'text/plain' ||
          file_type.includes('word') ||
          file_type.includes('rtf') ||
          file_type.includes('pdf');
        const isValidExtension = validExtensions.includes(fileExtension);

        if (!isValidMimeType && !isValidExtension) {
          return res.status(400).json({
            message: 'Invalid file type. Supported formats: TXT, DOCX, DOC, RTF'
          });
        }

        const sourceId = uuidv4();
        const uploadDir = path.join(__dirname, '../../data/human-model-sources');

        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Save file (for JSON uploads, we save the extracted text as .txt)
        filePath = path.join(uploadDir, `${sourceId}-${file_name}`);
        fs.writeFileSync(filePath, content_text, 'utf-8');
      }

      const wordCount = countWords(content_text);

      const sourceId = uuidv4();
      console.log('[HumanModels] Uploading source:', sourceId, 'for model:', modelId);

      // Save to database - store the extracted text file path
      // For multipart uploads, we use the original file path
      // For JSON uploads, we already have the filePath set
      const finalFilePath = req.file ? req.file.path : filePath;

      db.prepare(
        `INSERT INTO human_model_sources (id, human_model_id, file_name, file_path, file_type, word_count, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(sourceId, modelId, file_name, finalFilePath, file_type, wordCount);

      // Feature #404: Update user storage tracking (human model files count toward quota)
      const fileSizeBytes = req.file ? req.file.size : Buffer.byteLength(content_text, 'utf8');
      increaseUserStorage(userId, fileSizeBytes);

      // Update total word count
      const newTotalWordCount = model.total_word_count + wordCount;
      db.prepare(
        "UPDATE human_models SET total_word_count = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newTotalWordCount, modelId);

      const source = db.prepare('SELECT * FROM human_model_sources WHERE id = ?').get(sourceId);
      console.log('[HumanModels] Source uploaded successfully:', sourceId);

      res.status(201).json({
        message: 'Writing uploaded successfully',
        source,
        total_word_count: newTotalWordCount
      });
    } catch (error) {
      console.error('[HumanModels] Upload error:', error instanceof Error ? error.message : 'Unknown error');

      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// POST /api/human-models/:id/analyze - Start style analysis
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

    // Get language from request body or Accept-Language header
    // Default to Italian as per project specification
    const language = req.body?.language ||
                     (req.headers['accept-language']?.startsWith('en') ? 'en' : 'it') as 'it' | 'en';

    // Check ownership and word count
    const model = db.prepare('SELECT * FROM human_models WHERE id = ? AND user_id = ?').get(modelId, userId) as HumanModel | undefined;
    if (!model) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    // Check if minimum word count requirement is met (50,000 for romanziere_advanced)
    const minWords = model.model_type === 'romanziere_advanced' ? 50000 : 10000;
    if (model.total_word_count < minWords) {
      res.status(400).json({
        message: `Insufficient word count for analysis. Required: ${minWords}, Current: ${model.total_word_count}`
      });
      return;
    }

    // Check if user has a configured provider or if env provider is available
    const userHasProvider = userId ? hasUserProvider(userId) : false;
    const envProviderAvailable = isAIAvailable();

    console.log('[HumanModels] Starting analysis for model:', modelId, 'language:', language);
    console.log('[HumanModels] User has provider:', userHasProvider, 'Env provider available:', envProviderAvailable);

    if (!userHasProvider && !envProviderAvailable) {
      res.status(400).json({
        message: 'No AI provider configured. Please configure an AI provider in Settings or contact support.'
      });
      return;
    }

    // Update status to analyzing
    db.prepare(
      "UPDATE human_models SET training_status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run('analyzing', modelId);

    // Send immediate response - analysis runs in background
    res.json({ message: 'Style analysis started', status: 'analyzing' });

    // Run AI analysis asynchronously
    try {
      // Fetch all source texts for this model
      const sources = db.prepare(
        'SELECT file_path FROM human_model_sources WHERE human_model_id = ?'
      ).all(modelId) as Array<{ file_path: string }>;

      // Combine all source texts
      let combinedText = '';
      for (const source of sources) {
        try {
          if (fs.existsSync(source.file_path)) {
            const content = fs.readFileSync(source.file_path, 'utf-8');
            combinedText += content + '\n\n';
          }
        } catch (readError) {
          console.warn('[HumanModels] Could not read source file:', source.file_path, readError);
        }
      }

      // Analyze with AI service - pass userId to use user's configured provider
      const analysisResult = await analyzeWritingStyle(combinedText, language, userId);

      // Save analysis result
      db.prepare(
        `UPDATE human_models SET
          training_status = 'ready',
          analysis_result_json = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(JSON.stringify(analysisResult), modelId);

      console.log('[HumanModels] Analysis completed for model:', modelId);
    } catch (analysisError) {
      console.error('[HumanModels] Analysis failed for model:', modelId, analysisError);

      // Update status to failed
      db.prepare(
        "UPDATE human_models SET training_status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).run(modelId);
    }
  } catch (error) {
    console.error('[HumanModels] Analyze error:', error instanceof Error ? error.message : 'Unknown error');
    // Response already sent, just log the error
  }
});

// DELETE /api/human-models/:id/sources/:sourceId - Delete a source file from a human model
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/:id/sources/:sourceId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;
    const sourceId = req.params.sourceId;

    console.log('[HumanModels] Deleting source:', sourceId, 'from model:', modelId, 'for user:', userId);

    // Check model ownership
    const model = db.prepare('SELECT id, total_word_count FROM human_models WHERE id = ? AND user_id = ?').get(modelId, userId) as HumanModel | undefined;
    if (!model) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    // Get source to retrieve file info
    const source = db.prepare('SELECT * FROM human_model_sources WHERE id = ? AND human_model_id = ?').get(sourceId, modelId) as { file_path: string; word_count: number } | undefined;
    if (!source) {
      res.status(404).json({ message: 'Source not found' });
      return;
    }

    // Delete file from filesystem
    try {
      if (fs.existsSync(source.file_path)) {
        fs.unlinkSync(source.file_path);
        console.log('[HumanModels] Deleted source file:', source.file_path);
      }
    } catch (err) {
      console.warn('[HumanModels] Failed to delete file:', source.file_path, err);
    }

    // Delete source from database
    db.prepare('DELETE FROM human_model_sources WHERE id = ? AND human_model_id = ?').run(sourceId, modelId);

    // Update total word count
    const newTotalWordCount = Math.max(0, model.total_word_count - source.word_count);
    db.prepare(
      "UPDATE human_models SET total_word_count = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newTotalWordCount, modelId);

    console.log('[HumanModels] Source deleted successfully:', sourceId, 'New word count:', newTotalWordCount);

    res.json({ message: 'Source deleted successfully', total_word_count: newTotalWordCount });
  } catch (error) {
    console.error('[HumanModels] Delete source error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/human-models/:id/analysis - Get analysis results
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/:id/analysis', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

    const model = db.prepare(
      'SELECT training_status, analysis_result_json FROM human_models WHERE id = ? AND user_id = ?'
    ).get(modelId, userId) as HumanModel | undefined;

    if (!model) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    let analysisResult = null;
    try {
      analysisResult = JSON.parse(model.analysis_result_json);
    } catch {
      analysisResult = {};
    }

    res.json({
      status: model.training_status,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('[HumanModels] Get analysis error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
