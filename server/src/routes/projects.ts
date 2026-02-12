import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads (stored in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept DOCX and TXT files
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'application/msword', // .doc (legacy)
    ];
    const allowedExtensions = ['.docx', '.txt', '.doc'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX, DOC, and TXT files are allowed'));
    }
  },
});

// GET /api/projects - List user's projects
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;

    // Get query parameters for filtering
    const { area, status, search, sort } = req.query;

    let query = 'SELECT * FROM projects WHERE user_id = ?';
    const params: (string | undefined)[] = [userId];

    if (area && typeof area === 'string') {
      query += ' AND area = ?';
      params.push(area);
    }

    if (status && typeof status === 'string') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string') {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    if (sort === 'alphabetical') {
      query += ' ORDER BY title ASC';
    } else if (sort === 'oldest') {
      query += ' ORDER BY created_at ASC';
    } else {
      query += ' ORDER BY updated_at DESC'; // default: most recent
    }

    console.log('[Projects] Fetching projects for user:', userId);
    const projects = db.prepare(query).all(...params);

    console.log('[Projects] Found', (projects as unknown[]).length, 'projects');
    res.json({ projects, count: (projects as unknown[]).length });
  } catch (error) {
    console.error('[Projects] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/projects - Create new project
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const { title, description, area, genre, tone, target_audience, pov, word_count_target, saga_id, settings_json } = req.body;

    if (!title || !area) {
      res.status(400).json({ message: 'Title and area are required' });
      return;
    }

    if (!['romanziere', 'saggista', 'redattore'].includes(area)) {
      res.status(400).json({ message: 'Area must be romanziere, saggista, or redattore' });
      return;
    }

    const projectId = uuidv4();

    console.log('[Projects] Creating project:', projectId, 'for user:', userId);
    db.prepare(
      `INSERT INTO projects (id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov, word_count_target, status, settings_json, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, datetime('now'), datetime('now'))`
    ).run(
      projectId,
      userId,
      saga_id || null,
      title,
      description || '',
      area,
      genre || '',
      tone || '',
      target_audience || '',
      pov || '',
      word_count_target || 0,
      settings_json || '{}'
    );

    // Fetch and return the newly created project
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    console.log('[Projects] Project created successfully:', projectId);

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('[Projects] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/projects/:id - Get single project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    console.log('[Projects] Fetching project:', projectId, 'for user:', userId);
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('[Projects] Get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/projects/:id - Update project
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Check ownership
    const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!existing) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const { title, description, genre, tone, target_audience, pov, word_count_target, status, settings_json } = req.body;

    console.log('[Projects] Updating project:', projectId);
    db.prepare(
      `UPDATE projects SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        genre = COALESCE(?, genre),
        tone = COALESCE(?, tone),
        target_audience = COALESCE(?, target_audience),
        pov = COALESCE(?, pov),
        word_count_target = COALESCE(?, word_count_target),
        status = COALESCE(?, status),
        settings_json = COALESCE(?, settings_json),
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(
      title || null,
      description || null,
      genre || null,
      tone || null,
      target_audience || null,
      pov || null,
      word_count_target || null,
      status || null,
      settings_json || null,
      projectId,
      userId
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    console.log('[Projects] Project updated successfully:', projectId);

    res.json({ message: 'Project updated successfully', project });
  } catch (error) {
    console.error('[Projects] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/projects/:id - Delete project
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    console.log('[Projects] Deleting project:', projectId, 'for user:', userId);
    const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(projectId, userId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    console.log('[Projects] Project deleted successfully:', projectId);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[Projects] Delete error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/projects/:id/duplicate - Duplicate a project
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/duplicate', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Fetch the original project
    const originalProject = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!originalProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const newProjectId = uuidv4();
    const duplicateTitle = `${originalProject.title} (Copy)`;

    console.log('[Projects] Duplicating project:', projectId, '->', newProjectId);

    // Create the duplicated project
    db.prepare(
      `INSERT INTO projects (
        id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov,
        word_count_target, status, settings_json, word_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, datetime('now'), datetime('now'))`
    ).run(
      newProjectId,
      userId,
      originalProject.saga_id,
      duplicateTitle,
      originalProject.description || '',
      originalProject.area,
      originalProject.genre || '',
      originalProject.tone || '',
      originalProject.target_audience || '',
      originalProject.pov || '',
      originalProject.word_count_target || 0,
      originalProject.settings_json || '{}'
    );

    // Duplicate chapters if any exist
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ?').all(projectId) as any[];
    for (const chapter of chapters) {
      const newChapterId = uuidv4();
      db.prepare(
        `INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        newChapterId,
        newProjectId,
        chapter.title,
        chapter.content || '',
        chapter.order_index,
        chapter.status,
        chapter.word_count || 0
      );

      // Duplicate chapter versions if any exist
      const versions = db.prepare('SELECT * FROM chapter_versions WHERE chapter_id = ?').all(chapter.id) as any[];
      for (const version of versions) {
        const newVersionId = uuidv4();
        db.prepare(
          `INSERT INTO chapter_versions (id, chapter_id, content, version_number, created_at, change_description)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          newVersionId,
          newChapterId,
          version.content,
          version.version_number,
          version.created_at,
          version.change_description || ''
        );
      }
    }

    // Duplicate characters if any exist (for romanziere projects)
    const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[];
    for (const character of characters) {
      const newCharacterId = uuidv4();
      db.prepare(
        `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        newCharacterId,
        newProjectId,
        character.saga_id,
        character.name,
        character.description || '',
        character.traits || '',
        character.backstory || '',
        character.role_in_story || '',
        character.relationships_json || '[]',
        character.extracted_from_upload || 0
      );
    }

    // Duplicate locations if any exist
    const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(projectId) as any[];
    for (const location of locations) {
      const newLocationId = uuidv4();
      db.prepare(
        `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        newLocationId,
        newProjectId,
        location.saga_id,
        location.name,
        location.description || '',
        location.significance || '',
        location.extracted_from_upload || 0
      );
    }

    // Duplicate plot events if any exist
    const plotEvents = db.prepare('SELECT * FROM plot_events WHERE project_id = ?').all(projectId) as any[];
    for (const plotEvent of plotEvents) {
      const newPlotEventId = uuidv4();
      db.prepare(
        `INSERT INTO plot_events (id, project_id, saga_id, title, description, chapter_id, order_index, event_type, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        newPlotEventId,
        newProjectId,
        plotEvent.saga_id,
        plotEvent.title,
        plotEvent.description || '',
        plotEvent.chapter_id,
        plotEvent.order_index,
        plotEvent.event_type || '',
        plotEvent.extracted_from_upload || 0
      );
    }

    // Duplicate sources if any exist
    const sources = db.prepare('SELECT * FROM sources WHERE project_id = ?').all(projectId) as any[];
    for (const source of sources) {
      const newSourceId = uuidv4();
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        newSourceId,
        newProjectId,
        userId,
        source.file_name,
        source.file_path || '',
        source.file_type,
        source.file_size || 0,
        source.content_text || '',
        source.source_type || 'upload',
        source.url || '',
        source.tags_json || '[]',
        source.relevance_score || 0.0
      );
    }

    // Fetch and return the duplicated project
    const duplicatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(newProjectId);
    console.log('[Projects] Project duplicated successfully:', newProjectId);

    res.status(201).json({ message: 'Project duplicated successfully', project: duplicatedProject });
  } catch (error) {
    console.error('[Projects] Duplicate error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to parse TXT content
function parseTxtContent(content: string, filename: string): { title: string; chapters: Array<{ title: string; content: string }> } {
  const lines = content.split('\n');
  const chapters: Array<{ title: string; content: string }> = [];
  let currentChapter: { title: string; content: string } | null = null;
  let currentContent: string[] = [];

  // Extract title from first non-empty line or use filename
  let title = filename.replace(/\.(txt|docx?)$/i, '').replace(/[_-]/g, ' ');

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect chapter headers (common patterns)
    const chapterPattern = /^(chapter|capitolo|parte|part)\s+\d+[:\.\s]/i;
    const romanPattern = /^(chapter|capitolo)?\s*[IVXLCDM]+[:\.\s]/i;
    const numberPattern = /^#\s+\d+/;

    if (chapterPattern.test(trimmed) || romanPattern.test(trimmed) || numberPattern.test(trimmed)) {
      // Save previous chapter
      if (currentChapter) {
        currentChapter.content = currentContent.join('\n').trim();
        chapters.push(currentChapter);
      }

      // Start new chapter
      currentChapter = { title: trimmed, content: '' };
      currentContent = [];
    } else if (currentChapter) {
      // Add to current chapter content
      currentContent.push(line);
    } else if (trimmed && !title.includes(trimmed)) {
      // Still looking for first chapter, collect content
      currentContent.push(line);
    }
  }

  // Don't forget the last chapter
  if (currentChapter) {
    currentChapter.content = currentContent.join('\n').trim();
    chapters.push(currentChapter);
  }

  // If no chapters were detected, create a single chapter with all content
  if (chapters.length === 0) {
    const fullContent = currentContent.join('\n').trim();
    if (fullContent) {
      chapters.push({ title: 'Chapter 1', content: fullContent });
    }
  }

  // Use first line of content as title if title wasn't explicitly set
  if (chapters.length > 0 && currentContent.length > 0) {
    const firstLine = currentContent[0].trim();
    if (firstLine.length > 3 && firstLine.length < 100) {
      title = firstLine;
    }
  }

  return { title, chapters };
}

// Helper function to parse DOCX content (basic text extraction)
function parseDocxContent(buffer: Buffer, filename: string): { title: string; chapters: Array<{ title: string; content: string }> } {
  // For now, treat DOCX as text (strip XML tags)
  // A production implementation would use a proper DOCX parser like mammoth.js
  const text = buffer.toString('utf-8');

  // Remove XML tags and extract plain text
  const plainText = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Use the same TXT parsing logic
  return parseTxtContent(plainText, filename);
}

// POST /api/projects/import - Import project from file
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/import', authenticateToken, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { area = 'romanziere', genre = '', description = '' } = req.body;

    console.log('[Projects] Importing file:', file.originalname, 'size:', file.size, 'type:', file.mimetype, 'area:', area);

    // Validate area
    if (!['romanziere', 'saggista', 'redattore'].includes(area)) {
      res.status(400).json({ message: 'Invalid area. Must be romanziere, saggista, or redattore' });
      return;
    }

    // Parse file content based on type
    let parsed: { title: string; chapters: Array<{ title: string; content: string }> };

    if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
      const content = file.buffer.toString('utf-8');
      parsed = parseTxtContent(content, file.originalname);
    } else {
      // Treat as DOCX (basic text extraction)
      parsed = parseDocxContent(file.buffer, file.originalname);
    }

    console.log('[Projects] Parsed', parsed.chapters.length, 'chapters from file');

    if (parsed.chapters.length === 0) {
      res.status(400).json({ message: 'Could not extract any content from the file. Please ensure the file contains text.' });
      return;
    }

    // Create project
    const projectId = uuidv4();
    db.prepare(
      `INSERT INTO projects (id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov, word_count_target, status, settings_json, word_count, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, '', '', '', 0, 'draft', '{}', 0, datetime('now'), datetime('now'))`
    ).run(
      projectId,
      userId,
      parsed.title,
      description,
      area,
      genre
    );

    console.log('[Projects] Created project:', projectId, 'with title:', parsed.title);

    // Create chapters
    let totalWordCount = 0;
    for (let i = 0; i < parsed.chapters.length; i++) {
      const chapter = parsed.chapters[i];
      const chapterId = uuidv4();
      const wordCount = chapter.content.split(/\s+/).filter(w => w.length > 0).length;
      totalWordCount += wordCount;

      db.prepare(
        `INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'imported', ?, datetime('now'), datetime('now'))`
      ).run(
        chapterId,
        projectId,
        chapter.title,
        chapter.content,
        i
      );
    }

    console.log('[Projects] Created', parsed.chapters.length, 'chapters');

    // Update project word count
    db.prepare('UPDATE projects SET word_count = ? WHERE id = ?').run(totalWordCount, projectId);

    // Fetch and return the created project
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    console.log('[Projects] Import completed successfully:', projectId);
    res.status(201).json({
      message: 'Project imported successfully',
      project,
      chaptersCreated: parsed.chapters.length,
      totalWordCount
    });
  } catch (error) {
    console.error('[Projects] Import error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to import project' });
  }
});

export default router;
