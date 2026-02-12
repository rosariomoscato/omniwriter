// @ts-nocheck
import express from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePremium } from '../middleware/roles';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'sources');
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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/rtf',
      'text/plain',
    ];
    const validExtensions = ['.pdf', '.docx', '.doc', '.rtf', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Check both MIME type and file extension
    const isValidMimeType = allowedTypes.includes(file.mimetype);
    const isValidExtension = validExtensions.includes(fileExtension);

    if (isValidMimeType || isValidExtension) {
      cb(null, true);
    } else {
      // Create a specific error for unsupported file types
      const error = new Error('INVALID_FILE_TYPE');
      (error as any).status = 400;
      (error as any).code = 'LIMIT_FILE_TYPE';
      (error as any).message = 'Invalid file type. Only PDF, DOCX, DOC, RTF, and TXT files are allowed.';
      cb(error);
    }
  },
});

// Extract text content from uploaded file
async function extractTextContent(filePath: string, fileType: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  // For TXT files, read directly
  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // For other file types, we'll store the file path
  // In a real implementation, you would use libraries like:
  // - pdf-parse for PDF files
  // - mammoth for DOCX files
  // For now, return empty string and store the file
  return '';
}

// GET /api/projects/:id/sources - Get project sources
router.get('/projects/:id/sources', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const userId = req.user?.id;
  const projectId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify project belongs to user
    const project = db
      .prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
      .get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const sources = db
      .prepare(
        `SELECT id, project_id, saga_id, user_id, file_name, file_path, file_type,
                file_size, content_text, source_type, url, tags_json, relevance_score, created_at
         FROM sources
         WHERE project_id = ?
         ORDER BY created_at DESC`
      )
      .all(projectId);

    res.json({ sources, count: sources.length });
  } catch (error) {
    console.error('[Sources] Error fetching sources:', error);
    res.status(500).json({ message: 'Failed to fetch sources' });
  }
});

// POST /api/projects/:id/sources/upload - Upload source file
router.post(
  '/projects/:id/sources/upload',
  authenticateToken,
  (req, res, next) => {
    // Custom multer error handling
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 25MB.' });
        }
        if (err.code === 'LIMIT_FILE_TYPE' || err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            message: 'Invalid file type. Only PDF, DOCX, DOC, RTF, and TXT files are allowed.'
          });
        }
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }
      next();
    });
  },
  async (req: any, res) => {
    const db = getDatabase();
    const userId = req.user.id;
    const projectId = req.params.id;

    try {
      // Verify project belongs to user
      const project = db
        .prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
        .get(projectId, userId);

      if (!project) {
        // Clean up uploaded file if project not found
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Project not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Extract text content
      const contentText = await extractTextContent(req.file.path, req.file.mimetype);

      // Generate source ID
      const sourceId = Buffer.from(`${projectId}-${Date.now()}`).toString('base64').slice(0, 36);

      // Insert source into database
      db.prepare(
        `INSERT INTO sources (
          id, project_id, user_id, file_name, file_path, file_type,
          file_size, content_text, source_type, tags_json, relevance_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sourceId,
        projectId,
        userId,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        contentText,
        'upload',
        '[]',
        0.0
      );

      // Fetch the created source
      const source = db
        .prepare('SELECT * FROM sources WHERE id = ?')
        .get(sourceId);

      console.log(`[Sources] File uploaded: ${req.file.originalname} for project ${projectId}`);

      res.status(201).json({ source });
    } catch (error: any) {
      console.error('[Sources] Error uploading file:', error);

      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        message: error.message || 'Failed to upload file',
      });
    }
  }
);

// DELETE /api/sources/:id - Delete a source
router.delete('/sources/:id', authenticateToken, (req: any, res) => {
  const db = getDatabase();
  const userId = req.user.id;
  const sourceId = req.params.id;

  try {
    // Get source to verify ownership and get file path
    const source: any = db
      .prepare('SELECT * FROM sources WHERE id = ? AND user_id = ?')
      .get(sourceId, userId);

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    // Delete file from filesystem if it exists
    if (source.file_path && fs.existsSync(source.file_path)) {
      fs.unlinkSync(source.file_path);
      console.log(`[Sources] Deleted file: ${source.file_path}`);
    }

    // Delete from database
    db.prepare('DELETE FROM sources WHERE id = ?').run(sourceId);

    console.log(`[Sources] Source deleted: ${sourceId}`);

    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    console.error('[Sources] Error deleting source:', error);
    res.status(500).json({ message: 'Failed to delete source' });
  }
});

// POST /api/sagas/:id/sources/upload - Upload source to saga (shares with all projects in saga)
router.post(
  '/sagas/:id/sources/upload',
  authenticateToken,
  requirePremium,
  (req, res, next) => {
    // Custom multer error handling
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 25MB.' });
        }
        if (err.code === 'LIMIT_FILE_TYPE' || err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            message: 'Invalid file type. Only PDF, DOCX, DOC, RTF, and TXT files are allowed.'
          });
        }
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    const db = getDatabase();
    const userId = req.user?.id;
    const sagaId = req.params.id;

    try {
      // Verify saga belongs to user
      const saga = db.prepare('SELECT id, area FROM sagas WHERE id = ? AND user_id = ?').get(sagaId, userId);
      if (!saga) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Saga not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Extract text content
      const contentText = await extractTextContent(req.file.path, req.file.mimetype);

      // Generate source ID
      const sourceId = Buffer.from(`${sagaId}-${Date.now()}`).toString('base64').slice(0, 36);

      // Insert source with saga_id (project_id is NULL)
      db.prepare(
        `INSERT INTO sources (
          id, project_id, saga_id, user_id, file_name, file_path, file_type,
          file_size, content_text, source_type, tags_json, relevance_score
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sourceId,
        sagaId,
        userId,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        contentText,
        'upload',
        '[]',
        0.0
      );

      // Fetch created source
      const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);

      console.log(`[Sources] File uploaded to saga ${sagaId}: ${req.file.originalname}`);
      res.status(201).json({ source });
    } catch (error: any) {
      console.error('[Sources] Error uploading file to saga:', error);
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: error.message || 'Failed to upload file',
      });
    }
  }
);

// GET /api/sagas/:id/sources - Get sources for a saga (shared sources)
router.get('/sagas/:id/sources', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const userId = req.user?.id;
  const sagaId = req.params.id;

  try {
    // Verify saga belongs to user
    const saga = db.prepare('SELECT id FROM sagas WHERE id = ? AND user_id = ?').get(sagaId, userId);
    if (!saga) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    // Get all sources for this saga (project_id is NULL for saga-level sources)
    const sources = db.prepare(
      `SELECT id, project_id, saga_id, user_id, file_name, file_path, file_type,
                file_size, content_text, source_type, url, tags_json, relevance_score, created_at
         FROM sources
         WHERE saga_id = ? AND user_id = ?
         ORDER BY created_at DESC`
    ).all(sagaId, userId);

    res.json({ sources, count: sources.length });
  } catch (error) {
    console.error('[Sources] Error fetching saga sources:', error);
    res.status(500).json({ message: 'Failed to fetch sources' });
  }
});

// PUT /api/sources/:id/tags - Update source tags
router.put('/sources/:id/tags', authenticateToken, (req: any, res) => {
  const db = getDatabase();
  const userId = req.user.id;
  const sourceId = req.params.id;
  const { tags } = req.body;

  // Validate tags is an array
  if (!Array.isArray(tags)) {
    return res.status(400).json({ message: 'Tags must be an array' });
  }

  // Validate each tag is a string
  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return res.status(400).json({ message: 'Each tag must be a string' });
    }
  }

  try {
    // Verify source belongs to user
    const source: any = db
      .prepare('SELECT id FROM sources WHERE id = ? AND user_id = ?')
      .get(sourceId, userId);

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    // Update tags
    const tagsJson = JSON.stringify(tags);
    db.prepare('UPDATE sources SET tags_json = ? WHERE id = ?').run(tagsJson, sourceId);

    console.log(`[Sources] Updated tags for source ${sourceId}:`, tags);

    // Fetch updated source
    const updatedSource = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);

    res.json({ source: updatedSource });
  } catch (error) {
    console.error('[Sources] Error updating tags:', error);
    res.status(500).json({ message: 'Failed to update tags' });
  }
});

// GET /api/sources/tags - Get all tags for a user's sources
router.get('/sources/tags', authenticateToken, (req: any, res) => {
  const db = getDatabase();
  const userId = req.user.id;

  try {
    // Get all sources for user
    const sources: any[] = db
      .prepare('SELECT tags_json FROM sources WHERE user_id = ?')
      .all(userId);

    // Collect all unique tags
    const tagSet = new Set<string>();
    for (const source of sources) {
      try {
        const tags = JSON.parse(source.tags_json || '[]');
        for (const tag of tags) {
          if (typeof tag === 'string' && tag.trim()) {
            tagSet.add(tag.trim());
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    const tags = Array.from(tagSet).sort();
    res.json({ tags });
  } catch (error) {
    console.error('[Sources] Error fetching tags:', error);
    res.status(500).json({ message: 'Failed to fetch tags' });
  }
});

export default router;
