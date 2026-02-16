import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
// import * as mammoth from 'mammoth'; // Temporarily disabled - package not installed

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

// GET /api/projects - List user's projects with pagination
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;

    // Get query parameters for filtering and pagination
    const { area, status, search, sort, tag, page = '1', limit = '20' } = req.query;

    // Parse pagination parameters with defaults
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20)); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    // Count query - gets total matching projects
    let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE user_id = ?';
    const countParams: (string | number | undefined)[] = [userId];

    // Main query - fetches paginated projects
    let query = 'SELECT * FROM projects WHERE user_id = ?';
    const params: (string | number | undefined)[] = [userId];

    // Apply filters to both queries
    if (area && typeof area === 'string') {
      query += ' AND area = ?';
      countQuery += ' AND area = ?';
      params.push(area);
      countParams.push(area);
    }

    if (status && typeof status === 'string') {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search && typeof search === 'string') {
      // Trim and limit search length to prevent abuse
      const sanitizedSearch = search.trim().slice(0, 500);

      // Only search if there's actual content after sanitization
      if (sanitizedSearch.length > 0) {
        // Escape SQL LIKE wildcards (%) and (_) to prevent them from being interpreted
        const escapeLikeString = (str: string) =>
          str.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const escapedSearch = escapeLikeString(sanitizedSearch);
        query += ' AND (title LIKE ? OR description LIKE ?) ESCAPE \'\\\'';
        countQuery += ' AND (title LIKE ? OR description LIKE ?) ESCAPE \'\\\'';
        params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
        countParams.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
      }
    }

    // Tag filtering - use subquery
    if (tag && typeof tag === 'string') {
      query += ` AND id IN (SELECT project_id FROM project_tags WHERE tag_name = ?)`;
      countQuery += ` AND id IN (SELECT project_id FROM project_tags WHERE tag_name = ?)`;
      params.push(tag.trim());
      countParams.push(tag.trim());
    }

    // Sorting
    if (sort === 'alphabetical') {
      query += ' ORDER BY title ASC';
    } else if (sort === 'oldest') {
      query += ' ORDER BY created_at ASC';
    } else {
      query += ' ORDER BY updated_at DESC'; // default: most recent
    }

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    console.log('[Projects] Fetching projects for user:', userId, 'page:', pageNum, 'limit:', limitNum);

    // Get total count for pagination metadata
    const totalResult = db.prepare(countQuery).get(...countParams) as { total: number };
    const totalProjects = totalResult.total;

    // Fetch paginated projects with tags in a single query (fixes N+1 problem)
    const projectsQuery = `
      SELECT
        p.*,
        GROUP_CONCAT(pt.tag_name, ',') as tags
      FROM (${query}) as p
      LEFT JOIN project_tags pt ON p.id = pt.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;

    const projects = db.prepare(projectsQuery).all(...params);

    // Parse the comma-separated tags
    const projectsWithTags = (projects as any[]).map(project => ({
      ...project,
      tags: project.tags ? project.tags.split(',').filter((t: string) => t) : []
    }));

    const totalPages = Math.ceil(totalProjects / limitNum);

    console.log('[Projects] Found', projects.length, 'of', totalProjects, 'projects');
    res.json({
      projects: projectsWithTags,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalProjects,
        totalPages: totalPages,
        hasMore: pageNum < totalPages
      }
    });
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

    // Fetch tags for this project
    const tags = db.prepare('SELECT tag_name FROM project_tags WHERE project_id = ? ORDER BY tag_name ASC').all(projectId);
    const projectWithTags = {
      ...project,
      tags: tags.map((t: any) => t.tag_name)
    };

    res.json({ project: projectWithTags });
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

    const { title, description, genre, tone, target_audience, pov, word_count_target, status, settings_json, human_model_id } = req.body;

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
        human_model_id = COALESCE(?, human_model_id),
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
      human_model_id || null,
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
    // Match "1. Chapter Title" format (from our export)
    const numberedTitlePattern = /^\d+\.\s+(.+)$/;
    // Match lines followed by dashes (chapter header with separator)
    const nextLineIsDash = lines.indexOf(line) < lines.length - 1 && lines[lines.indexOf(line) + 1].trim().match(/^-+$/);

    if (chapterPattern.test(trimmed) || romanPattern.test(trimmed) || numberPattern.test(trimmed) ||
        (numberedTitlePattern.test(trimmed) && nextLineIsDash)) {
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

// Helper function to parse DOCX content using mammoth
// Temporarily disabled - mammoth package not installed
async function parseDocxContent(buffer: Buffer, filename: string): Promise<{ title: string; chapters: Array<{ title: string; content: string }> }> {
  // TODO: Re-enable when mammoth package can be installed
  throw new Error('DOCX import temporarily disabled. Please use TXT files for now.');
  /*
  try {
    // Use mammoth to extract raw text from DOCX
    const result = await mammoth.extractRawText({ buffer: buffer });
    const plainText = result.value;

    console.log('[Import] Extracted text from DOCX, length:', plainText.length);

    // Use the same TXT parsing logic to detect chapters
    return parseTxtContent(plainText, filename);
  } catch (error) {
    console.error('[Import] DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file. Please ensure it is a valid .docx file.');
  }
  */
}

// POST /api/projects/import - Import project from file
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/import', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
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

    // Validate file size (0 bytes = corrupted or empty)
    if (file.size === 0) {
      res.status(400).json({ message: 'The uploaded file is empty. Please upload a valid file with content.' });
      return;
    }

    // Validate file size is reasonable (max 10MB already enforced by multer)
    if (file.size > 10 * 1024 * 1024) {
      res.status(400).json({ message: 'File is too large. Maximum size is 10MB.' });
      return;
    }

    // Validate area
    if (!['romanziere', 'saggista', 'redattore'].includes(area)) {
      res.status(400).json({ message: 'Invalid area. Must be romanziere, saggista, or redattore' });
      return;
    }

    // Parse file content based on type with proper error handling
    let parsed: { title: string; chapters: Array<{ title: string; content: string }> };

    try {
      if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
        // Validate UTF-8 encoding
        const content = file.buffer.toString('utf-8');
        // Check for valid UTF-8 (replacement character indicates invalid encoding)
        if (content.includes('\uFFFD')) {
          throw new Error('File encoding is not valid UTF-8. Please save the file as UTF-8 text and try again.');
        }
        parsed = parseTxtContent(content, file.originalname);
      } else {
        // DOCX temporarily disabled
        throw new Error('DOCX import temporarily unavailable. Please upload a TXT file.');
      }
    } catch (parseError) {
      console.error('[Projects] File parsing error:', parseError instanceof Error ? parseError.message : 'Unknown error');
      res.status(400).json({
        message: parseError instanceof Error
          ? parseError.message
          : 'Failed to parse file. Please ensure it is a valid text file.'
      });
      return;
    }

    console.log('[Projects] Parsed', parsed.chapters.length, 'chapters from file');

    if (parsed.chapters.length === 0) {
      res.status(400).json({ message: 'Could not extract any content from the file. Please ensure the file contains readable text.' });
      return;
    }

    // Check for duplicate project titles and handle gracefully
    let finalTitle = parsed.title;
    const existingProject = db.prepare(
      'SELECT id, title FROM projects WHERE user_id = ? AND title = ? COLLATE NOCASE'
    ).get(userId, finalTitle) as { id: string; title: string } | undefined;

    if (existingProject) {
      // Duplicate found - generate a unique title
      let counter = 2;
      let newTitle = `${finalTitle} (${counter})`;

      // Find next available number
      while (db.prepare('SELECT id FROM projects WHERE user_id = ? AND title = ? COLLATE NOCASE').get(userId, newTitle)) {
        counter++;
        newTitle = `${finalTitle} (${counter})`;
      }

      finalTitle = newTitle;
      console.log('[Projects] Duplicate title detected, renamed to:', finalTitle);
    }

    // Create project
    const projectId = uuidv4();
    db.prepare(
      `INSERT INTO projects (id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov, word_count_target, status, settings_json, word_count, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, '', '', '', 0, 'draft', '{}', 0, datetime('now'), datetime('now'))`
    ).run(
      projectId,
      userId,
      finalTitle,
      description,
      area,
      genre
    );

    console.log('[Projects] Created project:', projectId, 'with title:', finalTitle);

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
      message: existingProject
        ? `Project imported as "${finalTitle}" (a project with that name already existed)`
        : 'Project imported successfully',
      project,
      chaptersCreated: parsed.chapters.length,
      totalWordCount,
      renamed: !!existingProject,
      originalTitle: parsed.title,
      finalTitle: finalTitle
    });
  } catch (error) {
    console.error('[Projects] Import error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to import project' });
  }
});

// GET /api/projects/:id/tags - Get all tags for a project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/:id/tags', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Verify project belongs to user
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Get all tags for this project
    const tags = db.prepare('SELECT tag_name FROM project_tags WHERE project_id = ? ORDER BY tag_name ASC').all(projectId);
    const tagNames = tags.map((t: any) => t.tag_name);

    console.log('[Projects] Fetched', tagNames.length, 'tags for project:', projectId);
    res.json({ tags: tagNames });
  } catch (error) {
    console.error('[Projects] Get tags error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/projects/:id/tags - Add a tag to a project
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/tags', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const { tag_name } = req.body;

    if (!tag_name || typeof tag_name !== 'string') {
      res.status(400).json({ message: 'Tag name is required' });
      return;
    }

    // Trim and validate tag name
    const trimmedTag = tag_name.trim().slice(0, 50); // Limit to 50 chars
    if (trimmedTag.length === 0) {
      res.status(400).json({ message: 'Tag name cannot be empty' });
      return;
    }

    // Verify project belongs to user
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Check if tag already exists
    const existing = db.prepare('SELECT id FROM project_tags WHERE project_id = ? AND tag_name = ?').get(projectId, trimmedTag);
    if (existing) {
      res.json({ tag: trimmedTag }); // Tag already exists, return it
      return;
    }

    // Add tag
    const tagId = uuidv4();
    db.prepare('INSERT INTO project_tags (id, project_id, tag_name) VALUES (?, ?, ?)').run(tagId, projectId, trimmedTag);

    console.log('[Projects] Added tag:', trimmedTag, 'to project:', projectId);
    res.status(201).json({ tag: trimmedTag });
  } catch (error) {
    console.error('[Projects] Add tag error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/projects/:id/tags/:tagName - Remove a tag from a project
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/:id/tags/:tagName', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const tagName = decodeURIComponent(req.params.tagName);

    // Verify project belongs to user
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Delete tag
    const result = db.prepare('DELETE FROM project_tags WHERE project_id = ? AND tag_name = ?').run(projectId, tagName);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Tag not found' });
      return;
    }

    console.log('[Projects] Removed tag:', tagName, 'from project:', projectId);
    res.json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('[Projects] Remove tag error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to extract text from uploaded file
async function extractTextFromUploadedFile(file: Express.Multer.File): Promise<string> {
  if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
    return file.buffer.toString('utf-8');
  } else {
    // For DOCX, extract text (basic implementation)
    const text = file.buffer.toString('utf-8');
    return text
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// Helper function to extract entities using simple pattern matching
// In production, this would use AI for more accurate extraction
function extractEntities(novelContent: string): {
  characters: Array<{ name: string; description: string; traits: string; backstory: string; role_in_story: string }>;
  locations: Array<{ name: string; description: string; significance: string }>;
  plotEvents: Array<{ title: string; description: string; event_type: string }>;
} {
  const characters: any[] = [];
  const locations: any[] = [];
  const plotEvents: any[] = [];

  // Simple extraction using pattern matching
  // This is a basic implementation - production should use AI

  // Extract potential character names (capitalized words followed by descriptions)
  const characterPattern = /([A-Z][a-z]+)\s+(said|asked|replied|thought|walked|ran|looked|felt)/g;
  const characterMatches = new Set();
  let match;
  while ((match = characterPattern.exec(novelContent)) !== null) {
    characterMatches.add(match[1]);
  }

  // Convert to character objects
  characterMatches.forEach((name: any) => {
    characters.push({
      name,
      description: `Character extracted from uploaded novel`,
      traits: '',
      backstory: '',
      role_in_story: 'Character'
    });
  });

  // Extract locations (words following 'in', 'at', 'to')
  const locationPattern = /\b(in|at|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  const locationMatches = new Set();
  while ((match = locationPattern.exec(novelContent)) !== null) {
    locationMatches.add(match[2]);
  }

  // Convert to location objects (limit to reasonable number)
  locationMatches.forEach((name: any) => {
    if (locations.length < 20) {
      locations.push({
        name,
        description: `Location extracted from uploaded novel`,
        significance: 'Setting'
      });
    }
  });

  // Extract plot events (sentences with action verbs)
  const eventPattern = /([A-Z][^!?]*?\b(?:discovered|realized|found|lost|won|escaped|died|fought|kissed|married|betrayed|saved)\b[^!?]*[!?])/g;
  while ((match = eventPattern.exec(novelContent)) !== null) {
    if (plotEvents.length < 30) {
      plotEvents.push({
        title: match[1].substring(0, 50) + (match[1].length > 50 ? '...' : ''),
        description: match[1],
        event_type: 'plot_event'
      });
    }
  }

  return { characters, locations, plotEvents };
}

// POST /api/projects/:id/analyze-novel - Analyze uploaded novel to extract characters, locations, and plot events
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/analyze-novel', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    console.log('[Projects] Analyzing novel file:', file.originalname, 'size:', file.size, 'type:', file.mimetype);

    // Verify project belongs to user and is a Romanziere project
    const project = db.prepare('SELECT id, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string; area: string } | undefined;
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.area !== 'romanziere') {
      res.status(400).json({ message: 'Novel analysis is only available for Romanziere projects' });
      return;
    }

    // Extract text from uploaded file
    const novelContent = await extractTextFromUploadedFile(file);

    if (novelContent.length < 100) {
      res.status(400).json({ message: 'File content is too short for analysis. Please upload a file with more content.' });
      return;
    }

    console.log('[Projects] Extracted text length:', novelContent.length, 'characters');

    // Extract entities using pattern matching
    const { characters, locations, plotEvents } = extractEntities(novelContent);

    console.log('[Projects] Extracted', characters.length, 'characters,', locations.length, 'locations,', plotEvents.length, 'plot events');

    // Clear existing extracted entities for this project
    db.prepare('DELETE FROM characters WHERE project_id = ? AND extracted_from_upload = 1').run(projectId);
    db.prepare('DELETE FROM locations WHERE project_id = ? AND extracted_from_upload = 1').run(projectId);
    db.prepare('DELETE FROM plot_events WHERE project_id = ? AND extracted_from_upload = 1').run(projectId);

    // Insert extracted characters
    let charactersCreated = 0;
    for (const character of characters) {
      try {
        const characterId = uuidv4();
        db.prepare(
          `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, '[]', 1, datetime('now'), datetime('now'))`
        ).run(
          characterId,
          projectId,
          character.name,
          character.description,
          character.traits,
          character.backstory,
          character.role_in_story
        );
        charactersCreated++;
      } catch (err) {
        // Skip duplicates
        console.warn('[Projects] Failed to insert character:', character.name, err);
      }
    }

    // Insert extracted locations
    let locationsCreated = 0;
    for (const location of locations) {
      try {
        const locationId = uuidv4();
        db.prepare(
          `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          locationId,
          projectId,
          location.name,
          location.description,
          location.significance
        );
        locationsCreated++;
      } catch (err) {
        // Skip duplicates
        console.warn('[Projects] Failed to insert location:', location.name, err);
      }
    }

    // Insert extracted plot events
    let plotEventsCreated = 0;
    for (const event of plotEvents) {
      try {
        const eventId = uuidv4();
        db.prepare(
          `INSERT INTO plot_events (id, project_id, saga_id, title, description, chapter_id, order_index, event_type, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          eventId,
          projectId,
          event.title,
          event.description,
          plotEventsCreated
        );
        plotEventsCreated++;
      } catch (err) {
        console.warn('[Projects] Failed to insert plot event:', event.title, err);
      }
    }

    console.log('[Projects] Novel analysis completed:', {
      characters: charactersCreated,
      locations: locationsCreated,
      plotEvents: plotEventsCreated
    });

    res.json({
      message: 'Novel analyzed successfully',
      extracted: {
        characters: charactersCreated,
        locations: locationsCreated,
        plotEvents: plotEventsCreated
      }
    });
  } catch (error) {
    console.error('[Projects] Analyze novel error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to analyze novel' });
  }
});

// POST /api/projects/:id/generate/outline - Generate full novel outline (Feature #179)
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/generate/outline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    console.log('[Projects] Generating outline for project:', projectId);

    // Verify project belongs to user and is a Romanziere project
    const project = db.prepare(`
      SELECT id, title, area, settings_json, genre, tone, target_audience, pov, word_count_target
      FROM projects WHERE id = ? AND user_id = ?
    `).get(projectId, userId) as {
      id: string;
      title: string;
      area: string;
      settings_json: string;
      genre: string;
      tone: string;
      target_audience: string;
      pov: string;
      word_count_target: number;
    } | undefined;

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.area !== 'romanziere') {
      res.status(400).json({ message: 'Outline generation is only available for Romanziere projects' });
      return;
    }

    // Parse project settings
    let settings = {};
    try {
      settings = project.settings_json ? JSON.parse(project.settings_json) : {};
    } catch (e) {
      console.warn('[Projects] Failed to parse settings_json:', e);
    }

    // Determine number of chapters based on word count target
    const wordCountTarget = project.word_count_target || 50000;
    const avgChapterWords = 3000; // Average 3000 words per chapter
    const numChapters = Math.max(10, Math.min(30, Math.ceil(wordCountTarget / avgChapterWords)));

    // Generate chapter outline with summaries
    const chapters: Array<{ title: string; summary: string }> = [];

    // Story structure templates based on genre
    const genreStructures: Record<string, string[]> = {
      fantasy: [
        'The Awakening',
        'The Call to Adventure',
        'Crossing the Threshold',
        'The First Trial',
        'Allies and Enemies',
        'The Dark Forest',
        'The Revelation',
        'The Loss',
        'The Final Stand',
        'Resolution'
      ],
      romance: [
        'The Encounter',
        'First Impressions',
        'Growing Closer',
        'The Obstacle',
        'Misunderstandings',
        'The Rival',
        'The Heartbreak',
        'Realization',
        'The Grand Gesture',
        'Happily Ever After'
      ],
      thriller: [
        'The Crime',
        'The Investigation Begins',
        'First Clues',
        'The Red Herring',
        'The Stakes Rise',
        'A Close Call',
        'The Twist',
        'The Trap',
        'Confrontation',
        'Justice'
      ],
      mystery: [
        'The Discovery',
        'Gathering Evidence',
        'Interviewing Witnesses',
        'Secrets Revealed',
        'The Second Body',
        'Connecting the Dots',
        'The Accusation',
        'The Alibi',
        'The Truth',
        'Case Closed'
      ],
      scifi: [
        'The Discovery',
        'The Experiment',
        'Something Goes Wrong',
        'The New World',
        'First Contact',
        'The Conflict',
        'The Journey',
        'The Sacrifice',
        'The Return',
        'A New Beginning'
      ],
      historical: [
        'Setting the Scene',
        'The Catalyst',
        'War Declared',
        'The Home Front',
        'The Battle',
        'Aftermath',
        'Personal Loss',
        'The Turning Tide',
        'Victory',
        'Reconstruction'
      ],
      default: [
        'Introduction',
        'Inciting Incident',
        'Rising Action',
        'First Plot Point',
        'The Journey',
        'The Midpoint',
        'Complications',
        'The Climax',
        'Falling Action',
        'Resolution'
      ]
    };

    // Get chapter titles based on genre
    const genre = (project.genre || 'default').toLowerCase();
    const chapterTitles = genreStructures[genre as keyof typeof genreStructures] || genreStructures.default;

    // Generate chapter summaries based on tone
    const toneAdjectives: Record<string, string> = {
      dark: 'ominous',
      light: 'hopeful',
      serious: 'grave',
      humorous: 'witty',
      dramatic: 'intense',
      romantic: 'passionate'
    };

    const tone = toneAdjectives[project.tone as keyof typeof toneAdjectives] || 'engaging';

    // Generate outline chapters
    for (let i = 0; i < numChapters; i++) {
      const titleIndex = i % chapterTitles.length;
      const title = chapterTitles[titleIndex];
      const chapterNum = i + 1;

      // Generate contextual summary
      let summary = '';
      if (i === 0) {
        summary = `Introduce the main character and their world. Establish the ${tone} tone and the central conflict that will drive the narrative forward.`;
      } else if (i === Math.floor(numChapters / 2)) {
        summary = `The midpoint of the story. A major revelation or plot twist shifts the direction of the narrative. The stakes are raised significantly.`;
      } else if (i === numChapters - 1) {
        summary = `The conclusion. All plot threads are resolved. The character arc completes, and the thematic elements of the ${project.genre || 'story'} find fulfillment.`;
      } else {
        summary = `Develop the narrative with ${tone} pacing. Advance both plot and character development while building tension toward the story's climax.`;
      }

      chapters.push({ title, summary });
    }

    // Create chapters in database
    const createdChapters: Array<{ id: string; title: string; summary: string }> = [];

    for (let i = 0; i < chapters.length; i++) {
      const { title, summary } = chapters[i];
      const chapterId = uuidv4();

      try {
        // Check if chapter with this title already exists
        const existing = db.prepare(
          'SELECT id FROM chapters WHERE project_id = ? AND title = ?'
        ).get(projectId, title);

        if (existing) {
          console.log('[Projects] Chapter already exists, skipping:', title);
          continue;
        }

        db.prepare(
          `INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
        ).run(
          chapterId,
          projectId,
          title,
          `# ${title}\n\n**Outline Summary:**\n${summary}\n\n**Notes:**\nWrite this chapter focusing on character development and advancing the main plot. Use the ${tone} tone established in the project settings.\n\nTarget word count: ${avgChapterWords} words`,
          i // order_index: chapter position in the outline
        );

        createdChapters.push({ id: chapterId, title, summary });
        console.log('[Projects] Created outline chapter:', title);
      } catch (err) {
        console.warn('[Projects] Failed to create chapter:', title, err);
      }
    }

    console.log('[Projects] Outline generation completed:', {
      projectId,
      totalChapters: chapters.length,
      createdChapters: createdChapters.length
    });

    res.json({
      message: 'Outline generated successfully',
      outline: {
        genre: project.genre,
        tone: project.tone,
        total_chapters: chapters.length,
        chapters: createdChapters
      },
      created: createdChapters.length
    });
  } catch (error) {
    console.error('[Projects] Generate outline error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to generate outline' });
  }
});

// POST /api/projects/:id/detect-plot-holes - Detect plot holes and inconsistencies (Feature #182)
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/detect-plot-holes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    console.log('[Projects] Detecting plot holes for project:', projectId);

    // Verify project belongs to user and is a Romanziere project
    const project = db.prepare('SELECT id, title, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string; title: string; area: string } | undefined;
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.area !== 'romanziere') {
      res.status(400).json({ message: 'Plot hole detection is only available for Romanziere projects' });
      return;
    }

    // Get all chapters with their content
    const chapters = db.prepare('SELECT id, title, content, order_index FROM chapters WHERE project_id = ? ORDER BY order_index').all(projectId) as Array<{ id: string; title: string; content: string; order_index: number }>;

    if (chapters.length === 0) {
      res.status(400).json({ message: 'No chapters found. Please generate some chapters first.' });
      return;
    }

    console.log('[Projects] Analyzing', chapters.length, 'chapters for plot holes');

    // Get characters, locations, and plot events for context
    const characters = db.prepare('SELECT name, description FROM characters WHERE project_id = ?').all(projectId) as Array<{ name: string; description: string }>;
    const locations = db.prepare('SELECT name, description FROM locations WHERE project_id = ?').all(projectId) as Array<{ name: string; description: string }>;
    const plotEvents = db.prepare('SELECT title, description, chapter_id FROM plot_events WHERE project_id = ?').all(projectId) as Array<{ title: string; description: string; chapter_id: string | null }>;

    // Analyze content for potential plot holes
    const plotHoles: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      chapter_references: string[];
      suggestion: string;
    }> = [];

    // Combine all chapter content for analysis
    const fullText = chapters.map(ch => ch.content).join('\n\n');

    // 1. Check for character inconsistencies
    const characterNames = characters.map(c => c.name.toLowerCase());
    const characterInconsistencies = analyzeCharacterConsistency(chapters, characterNames);
    plotHoles.push(...characterInconsistencies);

    // 2. Check for timeline inconsistencies
    const timelineIssues = analyzeTimelineConsistency(chapters, plotEvents);
    plotHoles.push(...timelineIssues);

    // 3. Check for unexplained plot developments
    const unexplainedEvents = analyzeUnexplainedDevelopments(chapters, plotEvents);
    plotHoles.push(...unexplainedEvents);

    // 4. Check for logical inconsistencies
    const logicalInconsistencies = analyzeLogicalInconsistencies(chapters, fullText);
    plotHoles.push(...logicalInconsistencies);

    // 5. Check for resolution gaps
    const resolutionGaps = analyzeResolutionGaps(chapters);
    plotHoles.push(...resolutionGaps);

    console.log('[Projects] Plot hole detection completed:', {
      total_issues: plotHoles.length,
      breakdown: {
        character: plotHoles.filter(h => h.type === 'character').length,
        timeline: plotHoles.filter(h => h.type === 'timeline').length,
        unexplained: plotHoles.filter(h => h.type === 'unexplained').length,
        logical: plotHoles.filter(h => h.type === 'logical').length,
        resolution: plotHoles.filter(h => h.type === 'resolution').length,
      }
    });

    res.json({
      message: 'Plot hole detection completed',
      plot_holes: plotHoles,
      total_issues: plotHoles.length
    });
  } catch (error) {
    console.error('[Projects] Plot hole detection error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to detect plot holes' });
  }
});

// Helper function to analyze character consistency
function analyzeCharacterConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  characterNames: string[]
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  // Check for characters appearing inconsistently
  characterNames.forEach(charName => {
    const appearances: number[] = [];
    chapters.forEach((ch, idx) => {
      const regex = new RegExp(`\\b${charName}\\b`, 'gi');
      const matches = ch.content.match(regex);
      if (matches && matches.length > 0) {
        appearances.push(idx);
      }
    });

    // If character appears early then disappears without resolution
    if (appearances.length >= 2 && appearances[appearances.length - 1] < chapters.length - 3) {
      const lastAppearance = chapters[appearances[appearances.length - 1]];
      issues.push({
        type: 'character',
        severity: 'medium',
        description: `Character "${charName}" disappears from the story after chapter "${lastAppearance.title}" without resolution`,
        chapter_references: chapters.filter((_, i) => appearances.includes(i)).map(ch => ch.title),
        suggestion: `Consider bringing ${charName} back for a resolution or explaining their absence`
      });
    }

    // Check for sudden character reintroduction after long absence
    if (appearances.length >= 3) {
      for (let i = 1; i < appearances.length - 1; i++) {
        const gap = appearances[i + 1] - appearances[i];
        if (gap >= 5) {
          issues.push({
            type: 'character',
            severity: 'low',
            description: `Character "${charName}" reappears after a long absence (${gap} chapters)`,
            chapter_references: [chapters[appearances[i]].title, chapters[appearances[i + 1]].title],
            suggestion: `Add a brief reference to ${charName} during their absence to maintain continuity`
          });
        }
      }
    }
  });

  return issues;
}

// Helper function to analyze timeline consistency
function analyzeTimelineConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  plotEvents: Array<{ title: string; description: string; chapter_id: string | null }>
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  // Look for temporal inconsistencies in content
  const timeIndicators = ['day later', 'next morning', 'hours later', 'weeks passed', 'month later', 'years later'];

  chapters.forEach((chapter, idx) => {
    if (idx > 0) {
      const prevChapter = chapters[idx - 1];
      const currentTimeIndicators = timeIndicators.filter(indicator =>
        chapter.content.toLowerCase().includes(indicator)
      );

      if (currentTimeIndicators.length > 0) {
        // Check if previous chapter ended in a way that makes time jump unclear
        const prevContent = prevChapter.content.toLowerCase();
        const hasCliffhanger = prevContent.includes('suddenly') || prevContent.includes('without warning');

        if (hasCliffhanger && currentTimeIndicators.length > 0) {
          issues.push({
            type: 'timeline',
            severity: 'medium',
            description: `Possible timeline inconsistency between "${prevChapter.title}" and "${chapter.title}"`,
            chapter_references: [prevChapter.title, chapter.title],
            suggestion: 'Clarify the time transition or adjust the scene break to make the time jump clear'
          });
        }
      }
    }

    // Check for contradictory time references within chapter
    const content = chapter.content.toLowerCase();
    const hasMorning = content.includes('morning') || content.includes('dawn');
    const hasEvening = content.includes('evening') || content.includes('dusk') || content.includes('night');

    // Count occurrences to detect frequent back-and-forth
    const morningCount = (content.match(/morning|dawn|sunrise/gi) || []).length;
    const eveningCount = (content.match(/evening|dusk|night|sunset/gi) || []).length;

    if (morningCount > 0 && eveningCount > 0 && morningCount + eveningCount > 4) {
      issues.push({
        type: 'timeline',
        severity: 'low',
        description: `Chapter "${chapter.title}" has frequent time-of-day shifts that may be confusing`,
        chapter_references: [chapter.title],
        suggestion: 'Consider structuring scenes more clearly or adding scene breaks to indicate time changes'
      });
    }
  });

  return issues;
}

// Helper function to analyze unexplained plot developments
function analyzeUnexplainedDevelopments(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  plotEvents: Array<{ title: string; description: string; chapter_id: string | null }>
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  // Look for sudden plot twists without foreshadowing
  const twistIndicators = ['suddenly', 'unexpectedly', 'shockingly', 'to everyone\'s surprise', 'out of nowhere'];

  chapters.forEach((chapter, idx) => {
    const content = chapter.content.toLowerCase();
    twistIndicators.forEach(indicator => {
      if (content.includes(indicator)) {
        // Check if there's any setup in previous chapters
        const previousChapters = chapters.slice(0, idx);
        const hasSetup = previousChapters.some(prev => {
          const prevContent = prev.content.toLowerCase();
          return prevContent.includes('hint') || prevContent.includes('suggest') || prevContent.includes('seem');
        });

        if (!hasSetup && idx > 2) {
          issues.push({
            type: 'unexplained',
            severity: 'medium',
            description: `Major development in "${chapter.title}" may lack proper setup`,
            chapter_references: [chapter.title],
            suggestion: 'Add subtle foreshadowing in earlier chapters to make this development feel earned'
          });
        }
      }
    });
  });

  return issues;
}

// Helper function to analyze logical inconsistencies
function analyzeLogicalInconsistencies(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  fullText: string
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  // Check for contradictory statements
  const contradictions = [
    { pattern: /didn't know.*but knew/gi, description: 'Character knowledge contradiction' },
    { pattern: /never.*but always/gi, description: 'Absolute statement contradiction' },
    { pattern: /impossible.*but happened/gi, description: 'Logical impossibility' },
  ];

  chapters.forEach(chapter => {
    contradictions.forEach(({ pattern, description }) => {
      const matches = chapter.content.match(pattern);
      if (matches) {
        issues.push({
          type: 'logical',
          severity: 'high',
          description: `Possible logical contradiction in "${chapter.title}": ${description}`,
          chapter_references: [chapter.title],
          suggestion: 'Review the context to ensure the statement makes sense'
        });
      }
    });
  });

  // Check for character knowledge inconsistencies
  const knowledgePatterns = [
    { first: 'didn\'t know', second: 'realized', window: 3 },
    { first: 'forgotten', second: 'remembered', window: 2 },
  ];

  knowledgePatterns.forEach(({ first, second, window }) => {
    const chaptersWithFirst = chapters.filter(ch =>
      ch.content.toLowerCase().includes(first)
    );

    const chaptersWithSecond = chapters.filter(ch =>
      ch.content.toLowerCase().includes(second)
    );

    // If same chapters contain both patterns close together, may indicate inconsistency
    chapters.forEach(chapter => {
      const content = chapter.content.toLowerCase();
      const hasFirst = content.includes(first);
      const hasSecond = content.includes(second);

      if (hasFirst && hasSecond) {
        issues.push({
          type: 'logical',
          severity: 'low',
          description: `Character knowledge inconsistency in "${chapter.title}"`,
          chapter_references: [chapter.title],
          suggestion: 'Ensure character knowledge states are consistent'
        });
      }
    });
  });

  return issues;
}

// Helper function to analyze resolution gaps
function analyzeResolutionGaps(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  if (chapters.length < 3) return issues;

  // Check for unresolved plot points introduced in early chapters
  const unresolvedPatterns = [
    'mystery', 'question', 'wondered', 'puzzled', 'unclear', 'unsure', 'confused'
  ];

  const firstThird = Math.floor(chapters.length / 3);
  const earlyChapters = chapters.slice(0, firstThird);
  const lastChapters = chapters.slice(-firstThird);

  earlyChapters.forEach(chapter => {
    const content = chapter.content.toLowerCase();
    const hasUnresolved = unresolvedPatterns.some(pattern => content.includes(pattern));

    if (hasUnresolved) {
      // Check if resolved in later chapters
      const resolutionPatterns = ['solved', 'answered', 'understood', 'realized', 'discovered', 'found'];
      const isResolved = lastChapters.some(ch =>
        resolutionPatterns.some(pattern => ch.content.toLowerCase().includes(pattern))
      );

      if (!isResolved) {
        issues.push({
          type: 'resolution',
          severity: 'medium',
          description: `Potential unresolved plot point from "${chapter.title}"`,
          chapter_references: [chapter.title],
          suggestion: 'Consider addressing this plot point in the story\'s resolution'
        });
      }
    }
  });

  return issues;
}

// POST /api/projects/:id/check-consistency - Check consistency across chapters (Feature #183)
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/check-consistency', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    console.log('[Projects] Checking consistency for project:', projectId);

    // Verify project belongs to user and is a Romanziere project
    const project = db.prepare('SELECT id, title, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string; title: string; area: string } | undefined;
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.area !== 'romanziere') {
      res.status(400).json({ message: 'Consistency checking is only available for Romanziere projects' });
      return;
    }

    // Get all chapters with their content
    const chapters = db.prepare('SELECT id, title, content, order_index FROM chapters WHERE project_id = ? ORDER BY order_index').all(projectId) as Array<{ id: string; title: string; content: string; order_index: number }>;

    if (chapters.length === 0) {
      res.status(400).json({ message: 'No chapters found. Please generate some chapters first.' });
      return;
    }

    console.log('[Projects] Analyzing', chapters.length, 'chapters for consistency');

    // Get characters and locations for reference
    const characters = db.prepare('SELECT name, description, traits FROM characters WHERE project_id = ?').all(projectId) as Array<{ name: string; description: string; traits: string }>;
    const locations = db.prepare('SELECT name, description, significance FROM locations WHERE project_id = ?').all(projectId) as Array<{ name: string; description: string; significance: string }>;

    // Analyze consistency issues
    const inconsistencies: Array<{
      type: 'character' | 'location' | 'timeline' | 'description';
      entity_name: string;
      description: string;
      chapter_references: string[];
      suggestion: string;
    }> = [];

    // 1. Check character description consistency
    const characterIssues = analyzeCharacterDescriptionConsistency(chapters, characters);
    inconsistencies.push(...characterIssues);

    // 2. Check location description consistency
    const locationIssues = analyzeLocationDescriptionConsistency(chapters, locations);
    inconsistencies.push(...locationIssues);

    // 3. Check character trait consistency
    const traitIssues = analyzeCharacterTraitConsistency(chapters, characters);
    inconsistencies.push(...traitIssues);

    // 4. Check timeline continuity
    const timelineIssues = analyzeTimelineContinuity(chapters);
    inconsistencies.push(...timelineIssues);

    console.log('[Projects] Consistency check completed:', {
      total_inconsistencies: inconsistencies.length,
      breakdown: {
        character: inconsistencies.filter(i => i.type === 'character').length,
        location: inconsistencies.filter(i => i.type === 'location').length,
        timeline: inconsistencies.filter(i => i.type === 'timeline').length,
        description: inconsistencies.filter(i => i.type === 'description').length,
      }
    });

    res.json({
      message: 'Consistency check completed',
      inconsistencies: inconsistencies,
      total_inconsistencies: inconsistencies.length
    });
  } catch (error) {
    console.error('[Projects] Consistency check error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to check consistency' });
  }
});

// Helper function to analyze character description consistency
function analyzeCharacterDescriptionConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  characters: Array<{ name: string; description: string; traits: string }>
): Array<{
  type: 'character';
  entity_name: string;
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: 'character';
    entity_name: string;
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  characters.forEach(character => {
    const charName = character.name;
    const charNameLower = charName.toLowerCase();

    // Find all chapters where character appears
    const appearances = chapters.filter(ch =>
      ch.content.toLowerCase().includes(charNameLower)
    );

    if (appearances.length < 2) return; // Need multiple appearances to check consistency

    // Check for physical description consistency
    const physicalTraits = ['hair', 'eyes', 'tall', 'short', 'thin', 'heavy', 'young', 'old'];
    const descriptions: string[] = [];

    appearances.forEach(chapter => {
      const content = chapter.content.toLowerCase();
      physicalTraits.forEach(trait => {
        const regex = new RegExp(`${charNameLower}.*${trait}\\s+(\\w+)`, 'gi');
        const matches = chapter.content.match(regex);
        if (matches) {
          descriptions.push(...matches);
        }
      });
    });

    // Check for contradictory descriptions (basic check)
    const hasBlond = descriptions.some(d => d.includes('blond') || d.includes('blonde'));
    const hasBrown = descriptions.some(d => d.includes('brown'));
    const hasBlack = descriptions.some(d => d.includes('black'));

    if (hasBlond && hasBlack) {
      issues.push({
        type: 'character',
        entity_name: charName,
        description: 'Inconsistent hair color descriptions',
        chapter_references: appearances.map(ch => ch.title),
        suggestion: `Review ${charName}'s physical descriptions for consistency`
      });
    }
  });

  return issues;
}

// Helper function to analyze location description consistency
function analyzeLocationDescriptionConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  locations: Array<{ name: string; description: string; significance: string }>
): Array<{
  type: 'location';
  entity_name: string;
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: 'location';
    entity_name: string;
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  locations.forEach(location => {
    const locName = location.name;
    const locNameLower = locName.toLowerCase();

    // Find all chapters where location appears
    const appearances = chapters.filter(ch =>
      ch.content.toLowerCase().includes(locNameLower)
    );

    if (appearances.length < 2) return;

    // Check for contradictory location descriptions
    const indoorDescriptions = appearances.filter(ch =>
      ch.content.toLowerCase().includes(`${locNameLower} inside`) ||
      ch.content.toLowerCase().includes(`${locNameLower} interior`) ||
      ch.content.toLowerCase().includes(`${locNameLower} room`)
    );

    const outdoorDescriptions = appearances.filter(ch =>
      ch.content.toLowerCase().includes(`${locNameLower} outside`) ||
      ch.content.toLowerCase().includes(`${locNameLower} exterior`) ||
      ch.content.toLowerCase().includes(`${locNameLower} garden`)
    );

    // If location is described both as indoor and outdoor in similar contexts, flag it
    if (indoorDescriptions.length > 0 && outdoorDescriptions.length > 0) {
      // Check if the same chapter has both (potential confusion)
      const hasBothInSameChapter = appearances.some(ch =>
        indoorDescriptions.some(ind => ind.id === ch.id) &&
        outdoorDescriptions.some(out => out.id === ch.id)
      );

      if (hasBothInSameChapter) {
        issues.push({
          type: 'location',
          entity_name: locName,
          description: 'Location may be ambiguously described as both indoor and outdoor',
          chapter_references: appearances.map(ch => ch.title),
          suggestion: `Clarify ${locName}'s setting or use more specific location names`
        });
      }
    }
  });

  return issues;
}

// Helper function to analyze character trait consistency
function analyzeCharacterTraitConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  characters: Array<{ name: string; description: string; traits: string }>
): Array<{
  type: 'character';
  entity_name: string;
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: 'character';
    entity_name: string;
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  characters.forEach(character => {
    const charName = character.name;
    const charNameLower = charName.toLowerCase();
    const traits = character.traits.toLowerCase();

    // Find all chapters where character appears
    const appearances = chapters.filter(ch =>
      ch.content.toLowerCase().includes(charNameLower)
    );

    // Check for behavior that contradicts stated traits
    if (traits.includes('brave') || traits.includes('courageous')) {
      const cowardlyActs = appearances.filter(ch =>
        ch.content.toLowerCase().includes(`${charNameLower} ran`) ||
        ch.content.toLowerCase().includes(`${charNameLower} hid`) ||
        ch.content.toLowerCase().includes(`${charNameLower} trembled`) ||
        ch.content.toLowerCase().includes(`${charNameLower} afraid`)
      );

      if (cowardlyActs.length > 0) {
        issues.push({
          type: 'character',
          entity_name: charName,
          description: 'Character behavior contradicts "brave" trait',
          chapter_references: cowardlyActs.map(ch => ch.title),
          suggestion: `Consider if ${charName}'s fear is justified (character growth) or if trait needs adjustment`
        });
      }
    }

    if (traits.includes('shy') || traits.includes('timid')) {
      const boldActs = appearances.filter(ch =>
        ch.content.toLowerCase().includes(`${charNameLower} shouted`) ||
        ch.content.toLowerCase().includes(`${charNameLower} boldly`) ||
        ch.content.toLowerCase().includes(`${charNameLower} confidently`)
      );

      if (boldActs.length > appearances.length / 2) {
        issues.push({
          type: 'character',
          entity_name: charName,
          description: 'Character consistently acts boldly despite "shy" trait',
          chapter_references: boldActs.map(ch => ch.title),
          suggestion: `Consider if ${charName} has overcome shyness (character arc) or if trait needs updating`
        });
      }
    }
  });

  return issues;
}

// Helper function to analyze timeline continuity
function analyzeTimelineContinuity(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>
): Array<{
  type: 'timeline';
  entity_name: string;
  description: string;
  chapter_references: string[];
  suggestion: string;
}> {
  const issues: Array<{
    type: 'timeline';
    entity_name: string;
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  // Check for time jumps without clear indication
  const timeMarkers = ['hours later', 'days later', 'weeks later', 'months later', 'years later'];

  chapters.forEach((chapter, idx) => {
    if (idx === 0) return;

    const content = chapter.content.toLowerCase();
    const hasTimeMarker = timeMarkers.some(marker => content.includes(marker));

    if (hasTimeMarker) {
      // Check if there's a scene break or chapter break that indicates the time jump
      const hasSceneBreak = chapter.content.includes('***') || chapter.content.includes('---');
      const previousChapter = chapters[idx - 1];

      if (!hasSceneBreak && !previousChapter.content.endsWith('...')) {
        issues.push({
          type: 'timeline',
          entity_name: `Chapter ${idx + 1}`,
          description: 'Time jump may not be clearly indicated',
          chapter_references: [previousChapter.title, chapter.title],
          suggestion: 'Add a scene break or clearer transition to indicate the time passage'
        });
      }
    }
  });

  return issues;
}

export default router;
