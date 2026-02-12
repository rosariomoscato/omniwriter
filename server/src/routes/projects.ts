import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as mammoth from 'mammoth';

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
    const { area, status, search, sort, tag } = req.query;

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
      // Trim and limit search length to prevent abuse
      const sanitizedSearch = search.trim().slice(0, 500);

      // Only search if there's actual content after sanitization
      if (sanitizedSearch.length > 0) {
        // Escape SQL LIKE wildcards (%) and (_) to prevent them from being interpreted
        const escapeLikeString = (str: string) =>
          str.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const escapedSearch = escapeLikeString(sanitizedSearch);
        query += ' AND (title LIKE ? OR description LIKE ?) ESCAPE \'\\\'';
        params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
      }
    }

    // Tag filtering - use subquery
    if (tag && typeof tag === 'string') {
      query += ` AND id IN (SELECT project_id FROM project_tags WHERE tag_name = ?)`;
      params.push(tag.trim());
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

    // Fetch tags for each project
    const projectsWithTags = (projects as any[]).map(project => {
      const tags = db.prepare('SELECT tag_name FROM project_tags WHERE project_id = ? ORDER BY tag_name ASC').all(project.id);
      return {
        ...project,
        tags: tags.map((t: any) => t.tag_name)
      };
    });

    console.log('[Projects] Found', (projects as unknown[]).length, 'projects');
    res.json({ projects: projectsWithTags, count: (projects as unknown[]).length });
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
async function parseDocxContent(buffer: Buffer, filename: string): Promise<{ title: string; chapters: Array<{ title: string; content: string }> }> {
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
        // Treat as DOCX using mammoth parser
        parsed = await parseDocxContent(file.buffer, file.originalname);
      }
    } catch (parseError) {
      console.error('[Projects] File parsing error:', parseError instanceof Error ? parseError.message : 'Unknown error');
      res.status(400).json({
        message: parseError instanceof Error
          ? parseError.message
          : 'Failed to parse file. Please ensure it is a valid text or DOCX file.'
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

export default router;
