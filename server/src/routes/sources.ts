// @ts-nocheck
import express, { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkSourceUploadLimit } from '../middleware/tierCheck'; // Feature #368 - Tier limits
import { TIER_LIMITS, UserRole } from '../config/tier-permissions'; // Feature #368 - Tier configuration
import { increaseUserStorage, decreaseUserStorage } from '../utils/storage'; // Feature #404 - Storage quota tracking
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
      cb(error as any, false);
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

// GET /api/projects/:id/sources - Get project sources (including saga-wide sources)
router.get('/projects/:id/sources', authenticateToken, (req: any, res: any) => {
  const db = getDatabase();
  const userId = req.user?.id;
  const projectId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify project belongs to user and get saga_id
    const project: any = db
      .prepare('SELECT id, saga_id FROM projects WHERE id = ? AND user_id = ?')
      .get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    let sources: any[];
    const sagaId = project.saga_id;

    if (sagaId) {
      // Project is part of a saga - get both project sources and saga-wide sources
      // Include: 1) Sources directly linked to this project
      //          2) Sources linked to the saga (saga_id set) - either standalone (project_id NULL) or from other projects
      sources = db
        .prepare(
          `SELECT id, project_id, saga_id, user_id, file_name, file_path, file_type,
                  file_size, content_text, source_type, url, tags_json, relevance_score, created_at
           FROM sources
           WHERE project_id = ? OR saga_id = ?
           ORDER BY
             CASE WHEN project_id = ? THEN 0 ELSE 1 END,
             created_at DESC`
        )
        .all(projectId, sagaId, projectId);

      console.log(`[Sources] Project ${projectId} is in saga ${sagaId}, returning ${sources.length} sources (project + saga-wide)`);
    } else {
      // Project is not in a saga - only get project sources
      sources = db
        .prepare(
          `SELECT id, project_id, saga_id, user_id, file_name, file_path, file_type,
                  file_size, content_text, source_type, url, tags_json, relevance_score, created_at
           FROM sources
           WHERE project_id = ?
           ORDER BY created_at DESC`
        )
        .all(projectId);

      console.log(`[Sources] Project ${projectId} not in saga, returning ${sources.length} project sources`);
    }

    res.json({ sources, count: sources.length });
  } catch (error) {
    console.error('[Sources] Error fetching sources:', error);
    res.status(500).json({ message: 'Failed to fetch sources' });
  }
});

// GET /api/sources - Get all sources for authenticated user
router.get('/sources', authenticateToken, (req: any, res: any) => {
  console.log('[Sources] GET /api/sources - Route handler called!');
  const db = getDatabase();
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sources = db
      .prepare(
        `SELECT sources.id, sources.project_id, sources.saga_id, sources.user_id,
                sources.file_name, sources.file_path, sources.file_type,
                sources.file_size, sources.content_text, sources.source_type,
                sources.url, sources.tags_json, sources.relevance_score, sources.created_at,
                p.title as project_title, p.area as project_area
         FROM sources
         LEFT JOIN projects p ON sources.project_id = p.id
         WHERE sources.user_id = ?
         ORDER BY sources.created_at DESC`
      )
      .all(userId);

    // Parse tags for each source
    const sourcesWithTags = sources.map((source: any) => ({
      ...source,
      tags: source.tags_json ? JSON.parse(source.tags_json) : [],
    }));

    res.json({ sources: sourcesWithTags, count: sourcesWithTags.length });
  } catch (error) {
    console.error('[Sources] Error fetching user sources:', error);
    res.status(500).json({ message: 'Failed to fetch sources' });
  }
});

// POST /api/sources/upload - Upload standalone source file (not tied to project)
// Feature #368: Added tier limit checks for source uploads
router.post(
  '/sources/upload',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    // Feature #368: Check tier limits before upload
    const userRole = (req as any).user?.role as UserRole;
    const tierLimits = TIER_LIMITS[userRole] || TIER_LIMITS.free;
    const maxFileSizeMB = tierLimits.sources.maxFileSizeMB;
    const maxTotalStorageMB = tierLimits.sources.maxTotalStorageMB;

    // Create a dynamic multer with user's tier limit
    const tierUpload = multer({
      storage,
      limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
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

        const isValidMimeType = allowedTypes.includes(file.mimetype);
        const isValidExtension = validExtensions.includes(fileExtension);

        if (isValidMimeType || isValidExtension) {
          cb(null, true);
        } else {
          const error = new Error('INVALID_FILE_TYPE');
          (error as any).status = 400;
          (error as any).code = 'LIMIT_FILE_TYPE';
          (error as any).message = 'Invalid file type. Only PDF, DOCX, DOC, RTF, and TXT files are allowed.';
          cb(error as any, false);
        }
      },
    });

    // Custom multer error handling
    tierUpload.single('file')(req, res, (err: any) => {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(403).json({
            message: `File troppo grande. Limite: ${maxFileSizeMB}MB. Passa a Premium per file fino a 25MB.`,
            code: 'TIER_LIMIT_REACHED',
            limitType: 'sources.maxFileSizeMB',
            max: maxFileSizeMB
          });
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
  async (req: any, res: any) => {
    const db = getDatabase();
    const userId = req.user?.id;
    const userRole = req.user?.role as UserRole;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Feature #368: Check total storage limit
      const tierLimits = TIER_LIMITS[userRole] || TIER_LIMITS.free;
      const maxTotalStorageMB = tierLimits.sources.maxTotalStorageMB;

      if (maxTotalStorageMB !== null) {
        const storageResult = db
          .prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM sources WHERE user_id = ?')
          .get(userId) as { total: number };

        const currentStorageMB = storageResult.total / (1024 * 1024);
        const newFileSizeMB = req.file.size / (1024 * 1024);

        if (currentStorageMB + newFileSizeMB > maxTotalStorageMB) {
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(403).json({
            message: `Spazio di archiviazione esaurito. Passa a Premium per spazio illimitato.`,
            code: 'TIER_LIMIT_REACHED',
            limitType: 'sources.maxTotalStorageMB',
            current: Math.round(currentStorageMB * 100) / 100,
            max: maxTotalStorageMB
          });
        }
      }

      // Extract text content
      const contentText = await extractTextContent(req.file.path, req.file.mimetype);

      // Generate source ID
      const sourceId = uuidv4();

      // Insert source into database with project_id and saga_id as NULL
      db.prepare(
        `INSERT INTO sources (
          id, project_id, saga_id, user_id, file_name, file_path, file_type,
          file_size, content_text, source_type, tags_json, relevance_score
        ) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sourceId,
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
      const source = db
        .prepare('SELECT * FROM sources WHERE id = ?')
        .get(sourceId);

      // Feature #404: Update user storage tracking
      increaseUserStorage(userId, req.file.size);

      console.log(`[Sources] Standalone file uploaded: ${req.file.originalname} for user ${userId}`);

      res.status(201).json({ source });
    } catch (error: any) {
      console.error('[Sources] Error uploading standalone file:', error);

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

// POST /api/projects/:id/sources/upload - Upload source file (optionally share with saga)
// Feature #368: Added tier limit checks for source uploads
router.post(
  '/projects/:id/sources/upload',
  authenticateToken,
  (req: Request, res: Response, next: NextFunction) => {
    // Feature #368: Check tier limits before upload
    const userRole = (req as any).user?.role as UserRole;
    const tierLimits = TIER_LIMITS[userRole] || TIER_LIMITS.free;
    const maxFileSizeMB = tierLimits.sources.maxFileSizeMB;

    // Create a dynamic multer with user's tier limit
    const tierUpload = multer({
      storage,
      limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
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

        const isValidMimeType = allowedTypes.includes(file.mimetype);
        const isValidExtension = validExtensions.includes(fileExtension);

        if (isValidMimeType || isValidExtension) {
          cb(null, true);
        } else {
          const error = new Error('INVALID_FILE_TYPE');
          (error as any).status = 400;
          (error as any).code = 'LIMIT_FILE_TYPE';
          (error as any).message = 'Invalid file type. Only PDF, DOCX, DOC, RTF, and TXT files are allowed.';
          cb(error as any, false);
        }
      },
    });

    // Custom multer error handling
    tierUpload.single('file')(req, res, (err: any) => {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(403).json({
            message: `File troppo grande. Limite: ${maxFileSizeMB}MB. Passa a Premium per file fino a 25MB.`,
            code: 'TIER_LIMIT_REACHED',
            limitType: 'sources.maxFileSizeMB',
            max: maxFileSizeMB
          });
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
  async (req: any, res: any) => {
    const db = getDatabase();
    const userId = req.user.id;
    const userRole = req.user.role as UserRole;
    const projectId = req.params.id;
    const shareWithSaga = req.body?.shareWithSaga === 'true' || req.body?.shareWithSaga === true;

    try {
      // Verify project belongs to user and get saga_id
      const project: any = db
        .prepare('SELECT id, saga_id FROM projects WHERE id = ? AND user_id = ?')
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

      // Feature #368: Check source count and storage limits
      const tierLimits = TIER_LIMITS[userRole] || TIER_LIMITS.free;
      const { maxSourcesPerProject, maxTotalStorageMB } = tierLimits.sources;

      // Check source count limit for project
      if (maxSourcesPerProject !== null) {
        const countResult = db
          .prepare('SELECT COUNT(*) as count FROM sources WHERE project_id = ?')
          .get(projectId) as { count: number };

        if (countResult.count >= maxSourcesPerProject) {
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(403).json({
            message: `Limite di ${maxSourcesPerProject} fonti per progetto raggiunto. Passa a Premium per fonti illimitate.`,
            code: 'TIER_LIMIT_REACHED',
            limitType: 'sources.maxSourcesPerProject',
            current: countResult.count,
            max: maxSourcesPerProject
          });
        }
      }

      // Check total storage limit
      if (maxTotalStorageMB !== null) {
        const storageResult = db
          .prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM sources WHERE user_id = ?')
          .get(userId) as { total: number };

        const currentStorageMB = storageResult.total / (1024 * 1024);
        const newFileSizeMB = req.file.size / (1024 * 1024);

        if (currentStorageMB + newFileSizeMB > maxTotalStorageMB) {
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(403).json({
            message: `Spazio di archiviazione esaurito. Passa a Premium per spazio illimitato.`,
            code: 'TIER_LIMIT_REACHED',
            limitType: 'sources.maxTotalStorageMB',
            current: Math.round(currentStorageMB * 100) / 100,
            max: maxTotalStorageMB
          });
        }
      }

      // Extract text content
      const contentText = await extractTextContent(req.file.path, req.file.mimetype);

      // Generate source ID
      const sourceId = uuidv4();

      // Determine saga_id for the source
      // If shareWithSaga is true and project has a saga_id, set saga_id on the source
      const sagaId = (shareWithSaga && project.saga_id) ? project.saga_id : null;

      // Insert source into database
      db.prepare(
        `INSERT INTO sources (
          id, project_id, saga_id, user_id, file_name, file_path, file_type,
          file_size, content_text, source_type, tags_json, relevance_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sourceId,
        projectId,
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

      // Fetch the created source
      const source = db
        .prepare('SELECT * FROM sources WHERE id = ?')
        .get(sourceId);

      // Feature #404: Update user storage tracking
      increaseUserStorage(userId, req.file.size);

      console.log(`[Sources] File uploaded: ${req.file.originalname} for project ${projectId}${sagaId ? ' (shared with saga)' : ''}`);

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
router.delete('/sources/:id', authenticateToken, (req: any, res: any) => {
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

    // Feature #404: Update user storage tracking
    if (source.file_size && source.file_size > 0) {
      decreaseUserStorage(userId, source.file_size);
    }

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
  (req: Request, res: Response, next: NextFunction) => {
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
  async (req: any, res: any) => {
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
      const sourceId = uuidv4();

      // Insert source with saga_id (project_id is NULL)
      db.prepare(
        `INSERT INTO sources (
          id, project_id, saga_id, user_id, file_name, file_path, file_type,
          file_size, content_text, source_type, tags_json, relevance_score
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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

      // Feature #404: Update user storage tracking
      increaseUserStorage(userId, req.file.size);

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
router.get('/sagas/:id/sources', authenticateToken, (req: any, res: any) => {
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
router.put('/sources/:id/tags', authenticateToken, (req: any, res: any) => {
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
    const updatedSource: any = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);

    // Convert tags_json to tags array (like GET /api/sources does)
    const sourceWithTags = {
      ...updatedSource,
      tags: updatedSource.tags_json ? JSON.parse(updatedSource.tags_json) : [],
    };

    res.json({ source: sourceWithTags });
  } catch (error) {
    console.error('[Sources] Error updating tags:', error);
    res.status(500).json({ message: 'Failed to update tags' });
  }
});

// GET /api/sources/tags - Get all tags for a user's sources
router.get('/sources/tags', authenticateToken, (req: any, res: any) => {
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

// DELETE /api/sources/tags/:tagName - Delete a tag globally from all sources
router.delete('/sources/tags/:tagName', authenticateToken, (req: any, res: any) => {
  const db = getDatabase();
  const userId = req.user.id;
  const tagName = decodeURIComponent(req.params.tagName);

  if (!tagName) {
    return res.status(400).json({ message: 'Tag name is required' });
  }

  try {
    // Get all sources for user that contain this tag
    const sources: any[] = db
      .prepare('SELECT id, tags_json FROM sources WHERE user_id = ?')
      .all(userId);

    let updatedCount = 0;

    // Update each source that contains the tag
    for (const source of sources) {
      try {
        const tags = JSON.parse(source.tags_json || '[]');
        if (Array.isArray(tags) && tags.includes(tagName)) {
          const updatedTags = tags.filter((t: string) => t !== tagName);
          const tagsJson = JSON.stringify(updatedTags);
          db.prepare('UPDATE sources SET tags_json = ? WHERE id = ?').run(tagsJson, source.id);
          updatedCount++;
        }
      } catch (e) {
        // Skip invalid JSON
        console.error(`[Sources] Error parsing tags for source ${source.id}:`, e);
      }
    }

    console.log(`[Sources] Tag "${tagName}" deleted from ${updatedCount} sources for user ${userId}`);

    res.json({
      message: 'Tag deleted successfully',
      tagName,
      updatedCount
    });
  } catch (error) {
    console.error('[Sources] Error deleting tag:', error);
    res.status(500).json({ message: 'Failed to delete tag' });
  }
});

// PUT /api/sources/:id/project - Link a standalone source to a project
router.put('/sources/:id/project', authenticateToken, (req: any, res: any) => {
  const db = getDatabase();
  const userId = req.user.id;
  const sourceId = req.params.id;
  const { projectId } = req.body;

  // Validate required fields
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    // Verify source belongs to user and is standalone (project_id is NULL)
    const source: any = db
      .prepare('SELECT id, project_id FROM sources WHERE id = ? AND user_id = ?')
      .get(sourceId, userId);

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    if (source.project_id !== null) {
      return res.status(400).json({ message: 'Source is already linked to a project' });
    }

    // Verify project belongs to user and get saga_id
    const project: any = db
      .prepare('SELECT id, saga_id FROM projects WHERE id = ? AND user_id = ?')
      .get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // If project is part of a saga, also set saga_id on the source
    // This makes the source visible to all projects in the same saga
    const sagaId = project.saga_id || null;

    // Update source with project_id and saga_id (if project is in a saga)
    db.prepare('UPDATE sources SET project_id = ?, saga_id = ? WHERE id = ?').run(projectId, sagaId, sourceId);

    console.log(`[Sources] Source ${sourceId} linked to project ${projectId}${sagaId ? ` (saga: ${sagaId})` : ''}`);

    // Fetch updated source
    const updatedSource: any = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);

    // Convert tags_json to tags array
    const sourceWithTags = {
      ...updatedSource,
      tags: updatedSource.tags_json ? JSON.parse(updatedSource.tags_json) : [],
    };

    res.json({ source: sourceWithTags });
  } catch (error) {
    console.error('[Sources] Error linking source to project:', error);
    res.status(500).json({ message: 'Failed to link source to project' });
  }
});

// DELETE /api/sources/:id/project - Unlink a source from its project (sets project_id to NULL)
router.delete('/sources/:id/project', authenticateToken, (req: any, res: any) => {
  const db = getDatabase();
  const userId = req.user.id;
  const sourceId = req.params.id;

  try {
    // Verify source belongs to user
    const source: any = db
      .prepare('SELECT id, project_id FROM sources WHERE id = ? AND user_id = ?')
      .get(sourceId, userId);

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    if (source.project_id === null) {
      return res.status(400).json({ message: 'Source is not linked to any project' });
    }

    // Unlink source from project (set project_id and saga_id to NULL)
    // Clearing saga_id ensures the source won't appear as "saga source" in other projects
    db.prepare('UPDATE sources SET project_id = NULL, saga_id = NULL WHERE id = ?').run(sourceId);

    console.log(`[Sources] Source ${sourceId} unlinked from project (project_id and saga_id cleared)`);

    res.json({ message: 'Source unlinked successfully', sourceId });
  } catch (error) {
    console.error('[Sources] Error unlinking source from project:', error);
    res.status(500).json({ message: 'Failed to unlink source from project' });
  }
});

// POST /api/sources/web-search - Save web search result as source
router.post('/sources/web-search', authenticateToken, async (req: any, res: any) => {
  const db = getDatabase();
  const userId = req.user.id;
  const { projectId, url, title, content, tags } = req.body;

  // Validate required fields
  if (!url || !title) {
    return res.status(400).json({ message: 'URL and title are required' });
  }

  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    // Verify project belongs to user
    const project = db
      .prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
      .get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    // Generate source ID
    const sourceId = uuidv4();

    // Insert web search source into database
    db.prepare(
      `INSERT INTO sources (
        id, project_id, user_id, file_name, file_path, file_type,
        file_size, content_text, source_type, url, tags_json, relevance_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      sourceId,
      projectId,
      userId,
      title,
      null, // no file path for web sources
      'text/html',
      0, // no file size for web sources
      content || '', // content text from web search
      'web_search',
      url,
      JSON.stringify(tags || []),
      0.0
    );

    // Fetch created source
    const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);

    console.log(`[Sources] Web search result saved: ${title} for project ${projectId}`);

    res.status(201).json({ source });
  } catch (error: any) {
    console.error('[Sources] Error saving web search result:', error);
    res.status(500).json({
      message: error.message || 'Failed to save web search result',
    });
  }
});

export default router;
