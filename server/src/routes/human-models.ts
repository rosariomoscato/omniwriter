import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { HumanModel, CreateHumanModelInput } from '../models/HumanModel';

const router = Router();

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
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const { name, description, model_type, style_strength }: CreateHumanModelInput = req.body;

    if (!name) {
      res.status(400).json({ message: 'Name is required' });
      return;
    }

    if (!model_type || !['romanziere_advanced', 'saggista_basic', 'redattore_basic'].includes(model_type)) {
      res.status(400).json({ message: 'Invalid model type' });
      return;
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

// POST /api/human-models/:id/upload - Upload writing for style analysis
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/upload', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

    // Check ownership
    const model = db.prepare('SELECT id, total_word_count FROM human_models WHERE id = ? AND user_id = ?').get(modelId, userId) as HumanModel | undefined;
    if (!model) {
      res.status(404).json({ message: 'Human model not found' });
      return;
    }

    // For now, we expect base64 encoded content in the request body
    // In a full implementation with multer, we would handle multipart/form-data
    const { file_name, file_type, content_text } = req.body;

    if (!file_name || !file_type || !content_text) {
      res.status(400).json({ message: 'file_name, file_type, and content_text are required' });
      return;
    }

    const sourceId = uuidv4();
    const wordCount = countWords(content_text);
    const uploadDir = path.join(__dirname, '../../data/human-model-sources');

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadDir, `${sourceId}-${file_name}`);
    fs.writeFileSync(filePath, content_text, 'utf-8');

    console.log('[HumanModels] Uploading source:', sourceId, 'for model:', modelId);
    db.prepare(
      `INSERT INTO human_model_sources (id, human_model_id, file_name, file_path, file_type, word_count, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(sourceId, modelId, file_name, filePath, file_type, wordCount);

    // Update total word count
    const newTotalWordCount = model.total_word_count + wordCount;
    db.prepare(
      'UPDATE human_models SET total_word_count = ?, updated_at = datetime("now") WHERE id = ?'
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/human-models/:id/analyze - Start style analysis
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/analyze', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const modelId = req.params.id;

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

    console.log('[HumanModels] Starting analysis for model:', modelId);

    // Update status to analyzing
    db.prepare(
      'UPDATE human_models SET training_status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('analyzing', modelId);

    // In a real implementation, this would trigger an AI analysis job
    // For now, we'll simulate completion after a delay
    setTimeout(() => {
      const analysisResult = {
        tone: 'Formal yet engaging',
        sentence_structure: 'Varied, with frequent use of compound sentences',
        vocabulary: 'Rich vocabulary, academic tone',
        patterns: ['Uses metaphors', 'Frequent dialogue', 'Descriptive passages']
      };

      db.prepare(
        `UPDATE human_models SET
          training_status = 'ready',
          analysis_result_json = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(JSON.stringify(analysisResult), modelId);

      console.log('[HumanModels] Analysis completed for model:', modelId);
    }, 2000);

    res.json({ message: 'Style analysis started', status: 'analyzing' });
  } catch (error) {
    console.error('[HumanModels] Analyze error:', error instanceof Error ? error.message : 'Unknown error');
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
