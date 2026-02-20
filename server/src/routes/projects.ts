// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Language } from '../locales';
import { getProviderForUser } from '../services/ai-service';
import { ChatMessage } from '../services/ai';
import {
  sanitizePromptContent,
  sanitizeSensitiveWords,
  isModerationError
} from '../services/contentModeration';
// import * as mammoth from 'mammoth'; // Temporarily disabled - package not installed

const router = Router();

// Configure multer for file uploads (stored in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept DOCX, DOC, RTF, TXT, and PDF files
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'application/msword', // .doc (legacy)
      'application/pdf', // .pdf
      'application/rtf', // .rtf
      'text/rtf', // .rtf (alternative MIME type)
    ];
    const allowedExtensions = ['.docx', '.txt', '.doc', '.pdf', '.rtf'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX, DOC, RTF, TXT, and PDF files are allowed'));
    }
  },
});

// POST /api/analyze-novel - Standalone novel analysis that creates a new project (Feature #268)
// This endpoint allows analyzing a novel file from the Dashboard without an existing project
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/analyze-novel', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const file = req.file;
    const title = req.body.title as string;
    const language = (req.body.language === 'en' ? 'en' : 'it') as 'it' | 'en';
    const sagaId = req.body.sagaId as string | undefined;
    const createNewSaga = req.body.createNewSaga as string | undefined;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ message: 'Project title is required' });
      return;
    }

    console.log('[AnalyzeNovel] Standalone analysis requested:', file.originalname, 'title:', title, 'language:', language);

    // Extract text from uploaded file
    const novelContent = await extractTextFromUploadedFile(file);

    if (novelContent.length < 100) {
      res.status(400).json({ message: 'File content is too short for analysis. Please upload a file with more content.' });
      return;
    }

    console.log('[AnalyzeNovel] Extracted text length:', novelContent.length, 'characters');

    // Create a new Romanziere project first
    const projectId = uuidv4();
    let finalSagaId: string | null = null;

    // Handle saga creation/assignment
    if (createNewSaga && createNewSaga.trim()) {
      // Create a new saga
      const newSagaId = uuidv4();
      db.prepare(
        `INSERT INTO sagas (id, user_id, title, description, area, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'romanziere', datetime('now'), datetime('now'))`
      ).run(newSagaId, userId, createNewSaga.trim());
      finalSagaId = newSagaId;
      console.log('[AnalyzeNovel] Created new saga:', createNewSaga, 'ID:', newSagaId);
    } else if (sagaId && sagaId.trim()) {
      // Verify saga belongs to user and is romanziere area
      const saga = db.prepare('SELECT id, area FROM sagas WHERE id = ? AND user_id = ?').get(sagaId, userId) as { id: string; area: string } | undefined;
      if (saga && saga.area === 'romanziere') {
        finalSagaId = saga.id;
        console.log('[AnalyzeNovel] Using existing saga:', sagaId);
      }
    }

    // Create the project
    db.prepare(
      `INSERT INTO projects (id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov, status, word_count_target, word_count, settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'romanziere', NULL, NULL, NULL, NULL, 'draft', NULL, 0, '{}', datetime('now'), datetime('now'))`
    ).run(projectId, userId, finalSagaId, title.trim(), 'Progetto creato dall\'analisi del romanzo caricato');

    console.log('[AnalyzeNovel] Created project:', projectId, 'with saga:', finalSagaId);

    // Use AI-based analysis to extract characters, locations, plot events, and synopsis
    let characters: Array<{ name: string; description: string; traits: string; backstory: string; role_in_story: string; relationships?: ParsedRelationship[]; status_at_end?: string; status_notes?: string }>;
    let locations: Array<{ name: string; description: string; significance: string }>;
    let plotEvents: Array<{ title: string; description: string; event_type: string }>;
    let synopsis = '';

    try {
      const aiResult = await analyzeNovelWithAI(novelContent, userId || '', language);
      characters = aiResult.characters;
      locations = aiResult.locations;
      plotEvents = aiResult.plotEvents;
      synopsis = aiResult.synopsis;
      console.log('[AnalyzeNovel] AI analysis extracted', characters.length, 'characters,', locations.length, 'locations,', plotEvents.length, 'plot events');
    } catch (aiError) {
      console.error('[AnalyzeNovel] AI analysis failed, falling back to regex:', aiError);
      const regexResult = extractEntities(novelContent);
      characters = regexResult.characters;
      locations = regexResult.locations;
      plotEvents = regexResult.plotEvents;
      synopsis = '';
    }

    // Insert extracted characters
    let charactersCreated = 0;
    const charNameToId: Map<string, string> = new Map();
    const charInsertData: Array<{ id: string; character: typeof characters[0] }> = [];

    for (const character of characters) {
      try {
        const characterId = uuidv4();
        db.prepare(
          `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          characterId,
          projectId,
          finalSagaId,
          character.name,
          character.description,
          character.traits,
          character.backstory,
          character.role_in_story,
          character.status_at_end || 'unknown',
          character.status_notes || ''
        );
        charNameToId.set(normalizeName(character.name), characterId);
        charInsertData.push({ id: characterId, character });
        charactersCreated++;
      } catch (err) {
        console.warn('[AnalyzeNovel] Failed to insert character:', character.name, err);
      }
    }

    // Resolve and save relationships
    for (const { id: fromCharId, character } of charInsertData) {
      if (!character.relationships || character.relationships.length === 0) continue;

      const resolvedRelationships = [];
      for (const rel of character.relationships) {
        let targetId: string | undefined;
        const normalizedRelName = normalizeName(rel.relatedTo);

        targetId = charNameToId.get(normalizedRelName);
        if (!targetId) {
          for (const [name, cId] of charNameToId.entries()) {
            if (name.includes(normalizedRelName) || normalizedRelName.includes(name)) {
              targetId = cId;
              break;
            }
          }
        }

        if (targetId && targetId !== fromCharId) {
          resolvedRelationships.push({
            characterId: fromCharId,
            relatedCharacterId: targetId,
            relationshipType: rel.type || 'ally'
          });
        }
      }

      if (resolvedRelationships.length > 0) {
        try {
          db.prepare('UPDATE characters SET relationships_json = ? WHERE id = ?').run(
            JSON.stringify(resolvedRelationships),
            fromCharId
          );
        } catch (err) {
          console.warn('[AnalyzeNovel] Failed to update relationships:', err);
        }
      }
    }

    // Insert extracted locations
    let locationsCreated = 0;
    for (const location of locations) {
      try {
        const locationId = uuidv4();
        db.prepare(
          `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          locationId,
          projectId,
          finalSagaId,
          location.name,
          location.description,
          location.significance
        );
        locationsCreated++;
      } catch (err) {
        console.warn('[AnalyzeNovel] Failed to insert location:', location.name, err);
      }
    }

    // Insert extracted plot events
    let plotEventsCreated = 0;
    for (const event of plotEvents) {
      try {
        const eventId = uuidv4();
        db.prepare(
          `INSERT INTO plot_events (id, project_id, saga_id, title, description, chapter_id, order_index, event_type, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          eventId,
          projectId,
          finalSagaId,
          event.title,
          event.description,
          plotEventsCreated,
          event.event_type
        );
        plotEventsCreated++;
      } catch (err) {
        console.warn('[AnalyzeNovel] Failed to insert plot event:', event.title, err);
      }
    }

    // Save synopsis to project
    if (synopsis) {
      try {
        db.prepare('UPDATE projects SET synopsis = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(synopsis, projectId, userId);
        console.log('[AnalyzeNovel] Synopsis saved to project');
      } catch (synopsisErr) {
        console.warn('[AnalyzeNovel] Failed to save synopsis:', synopsisErr);
      }
    }

    console.log('[AnalyzeNovel] Analysis completed:', {
      projectId,
      characters: charactersCreated,
      locations: locationsCreated,
      plotEvents: plotEventsCreated,
      synopsis: synopsis ? 'generated' : 'none'
    });

    res.json({
      message: 'Novel analyzed and project created successfully',
      projectId,
      extracted: {
        characters: charactersCreated,
        locations: locationsCreated,
        plotEvents: plotEventsCreated,
        synopsis: synopsis ? true : false
      }
    });
  } catch (error) {
    console.error('[AnalyzeNovel] Error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to analyze novel' });
  }
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

// GET /api/projects/:id/synopsis - Get synopsis for a project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/:id/synopsis', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    const project = db.prepare('SELECT id, synopsis, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string; synopsis: string | null; area: string } | undefined;

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.area !== 'romanziere') {
      res.status(400).json({ message: 'Synopsis is only available for Romanziere projects' });
      return;
    }

    res.json({ synopsis: project.synopsis || '' });
  } catch (error) {
    console.error('[Projects] Get synopsis error:', error instanceof Error ? error.message : 'Unknown error');
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
    const existing = db.prepare('SELECT id, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string; area: string } | undefined;
    if (!existing) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const { title, description, genre, tone, target_audience, pov, word_count_target, status, settings_json, human_model_id, saga_id } = req.body;

    // If saga_id is provided, verify that the saga exists and has the same area as the project
    if (saga_id !== undefined && saga_id !== null) {
      const saga = db.prepare('SELECT id, area FROM sagas WHERE id = ? AND user_id = ?').get(saga_id, userId) as { id: string; area: string } | undefined;
      if (!saga) {
        res.status(404).json({ message: 'Saga not found' });
        return;
      }
      if (saga.area !== existing.area) {
        res.status(400).json({ message: `Project area (${existing.area}) must match saga area (${saga.area})` });
        return;
      }
    }

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
        saga_id = COALESCE(?, saga_id),
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
      saga_id !== undefined ? saga_id : null,
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
        `INSERT INTO chapters (id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        newChapterId,
        newProjectId,
        chapter.title,
        chapter.content || '',
        chapter.summary || '',
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

// ============================================================================
// POST /api/projects/:id/sequel - Create Sequel (Feature #255)
// Creates a new project as a sequel to an existing romanziere project
// Copies characters, locations, synopsis, and creates/assigns saga
// ============================================================================

interface SequelRequestBody {
  title?: string;
  generateProposal?: boolean;
  language?: 'it' | 'en';
  autoGenerateChapters?: boolean;
  numChapters?: number;
}

// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/sequel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const {
      title: customTitle,
      generateProposal = true,
      language = 'it',
      autoGenerateChapters = true,
      numChapters = 10
    } = req.body as SequelRequestBody;

    // Fetch the original project
    const originalProject = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!originalProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Only romanziere projects can have sequels
    if (originalProject.area !== 'romanziere') {
      res.status(400).json({ message: 'Sequels can only be created for romanziere (novel) projects' });
      return;
    }

    const newProjectId = uuidv4();

    // Generate sequel title
    const sequelTitle = customTitle || `${originalProject.title} - Part 2`;

    console.log('[Projects] Creating sequel project:', projectId, '->', newProjectId);

    // Get or create saga
    let sagaId = originalProject.saga_id;

    if (!sagaId) {
      // Create a new saga for this series
      sagaId = uuidv4();
      const sagaTitle = originalProject.title.includes(' - ')
        ? originalProject.title.split(' - ')[0] + ' Series'
        : originalProject.title + ' Series';

      db.prepare(
        `INSERT INTO sagas (id, user_id, title, description, area, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(sagaId, userId, sagaTitle, `Series containing "${originalProject.title}" and its sequels`, 'romanziere');

      // Update original project to be part of the saga
      db.prepare('UPDATE projects SET saga_id = ? WHERE id = ?').run(sagaId, projectId);

      console.log('[Projects] Created new saga:', sagaId);
    }

    // Create the sequel project
    db.prepare(
      `INSERT INTO projects (
        id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov,
        word_count_target, status, settings_json, word_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, datetime('now'), datetime('now'))`
    ).run(
      newProjectId,
      userId,
      sagaId,
      sequelTitle,
      `Sequel to "${originalProject.title}"`,
      originalProject.area,
      originalProject.genre || '',
      originalProject.tone || '',
      originalProject.target_audience || '',
      originalProject.pov || '',
      originalProject.word_count_target || 0,
      originalProject.settings_json || '{}'
    );

    // Copy characters and mark them as returning (extracted_from_upload = 0)
    // Skip dead characters - they should not appear in the sequel
    const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[];
    let charsCopied = 0;
    let charsSkipped = 0;
    for (const character of characters) {
      if (character.status_at_end === 'dead') {
        charsSkipped++;
        console.log(`[Projects] Skipping dead character: ${character.name}`);
        continue;
      }
      const newCharacterId = uuidv4();
      // Mark as returning character by setting extracted_from_upload = 0
      db.prepare(
        `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).run(
        newCharacterId,
        newProjectId,
        sagaId,
        character.name,
        character.description || '',
        character.traits || '',
        character.backstory || '',
        character.role_in_story || '',
        character.relationships_json || '[]',
        'unknown',  // Reset status for sequel
        character.status_notes || ''  // Keep notes for reference
      );
      charsCopied++;
    }
    console.log(`[Projects] Copied ${charsCopied} characters to sequel (skipped ${charsSkipped} dead characters)`);

    // Copy locations with reference to saga
    const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(projectId) as any[];
    for (const location of locations) {
      const newLocationId = uuidv4();
      db.prepare(
        `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).run(
        newLocationId,
        newProjectId,
        sagaId,
        location.name,
        location.description || '',
        location.significance || ''
      );
    }
    console.log('[Projects] Copied', locations.length, 'locations to sequel');

    // Copy synopsis as a source material for reference
    if (originalProject.synopsis) {
      const synopsisSourceId = uuidv4();
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, '', 'reference', 'text', ?, ?, 'upload', '', '["synopsis", "reference"]', 1.0, datetime('now'))`
      ).run(
        synopsisSourceId,
        newProjectId,
        sagaId,
        userId,
        originalProject.synopsis.length,
        `Synopsis of "${originalProject.title}":\n\n${originalProject.synopsis}`
      );
      console.log('[Projects] Copied synopsis as reference source');
    }

    // Copy original sources as reference
    const sources = db.prepare('SELECT * FROM sources WHERE project_id = ?').all(projectId) as any[];
    for (const source of sources) {
      const newSourceId = uuidv4();
      // Validate source_type - database only accepts 'upload' or 'web_search'
      const validSourceType = ['upload', 'web_search'].includes(source.source_type)
        ? source.source_type
        : 'upload';
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        newSourceId,
        newProjectId,
        sagaId,
        userId,
        source.file_name,
        source.file_path || '',
        source.file_type,
        source.file_size || 0,
        source.content_text || '',
        validSourceType,
        source.url || '',
        source.tags_json || '[]',
        source.relevance_score || 0.0
      );
    }
    console.log('[Projects] Copied', sources.length, 'sources to sequel');

    // Generate AI sequel proposal if requested
    let sequelProposal = null;
    if (generateProposal) {
      try {
        sequelProposal = await generateSequelProposal(
          originalProject,
          characters,
          locations,
          db.prepare('SELECT * FROM plot_events WHERE project_id = ?').all(projectId) as any[],
          db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index').all(projectId) as any[],
          userId,
          language
        );

        // Save proposal as a project note/source
        if (sequelProposal) {
          const proposalSourceId = uuidv4();
          const proposalContent = formatSequelProposal(sequelProposal, language);
          db.prepare(
            `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
             VALUES (?, ?, ?, ?, 'AI Sequel Proposal', '', 'text', ?, ?, 'upload', '', '["ai-generated", "sequel-proposal"]', 1.0, datetime('now'))`
          ).run(
            proposalSourceId,
            newProjectId,
            sagaId,
            userId,
            proposalContent.length,
            proposalContent
          );
          console.log('[Projects] Saved AI sequel proposal');
        }
      } catch (proposalErr) {
        console.warn('[Projects] Failed to generate sequel proposal (non-fatal):', proposalErr);
        // Continue without proposal - it's optional
      }
    }

    // Auto-generate chapters if requested (Feature #265)
    let chaptersGenerated = 0;
    let chaptersError: string | null = null;

    if (autoGenerateChapters) {
      try {
        console.log('[Projects] Auto-generating chapters for sequel:', newProjectId);

        // Gather context from the original novel for chapter generation
        const previousCharacters = db.prepare(`
          SELECT name, description, traits, backstory, role_in_story, status_at_end, status_notes
          FROM characters WHERE project_id = ?
        `).all(projectId) as Array<{
          name: string;
          description: string;
          traits: string;
          backstory: string;
          role_in_story: string;
          status_at_end: string;
          status_notes: string;
        }>;

        const previousLocations = db.prepare(`
          SELECT name, description, significance
          FROM locations WHERE project_id = ?
        `).all(projectId) as Array<{
          name: string;
          description: string;
          significance: string;
        }>;

        const previousPlotEvents = db.prepare(`
          SELECT title, description, event_type
          FROM plot_events WHERE project_id = ?
          ORDER BY created_at ASC
        `).all(projectId) as Array<{
          title: string;
          description: string;
          event_type: string;
        }>;

        const previousChapters = db.prepare(`
          SELECT title FROM chapters WHERE project_id = ? ORDER BY order_index
        `).all(projectId) as Array<{
          title: string;
        }>;

        // Build AI prompt for sequel generation
        const isItalian = language === 'it';

        // Separate alive from dead characters
        const aliveCharsOld = previousCharacters.filter(c => c.status_at_end !== 'dead');
        const deadCharsOld = previousCharacters.filter(c => c.status_at_end === 'dead');

        const statusLabelOld = (c: any) => {
          if (!c.status_at_end || c.status_at_end === 'unknown') return '';
          const labels: Record<string, string> = isItalian
            ? { alive: 'Vivo', injured: 'Ferito', missing: 'Disperso' }
            : { alive: 'Alive', injured: 'Injured', missing: 'Missing' };
          return labels[c.status_at_end] ? ` [${labels[c.status_at_end]}${c.status_notes ? ': ' + c.status_notes : ''}]` : '';
        };

        const characterSummaries = aliveCharsOld.slice(0, 15).map(c =>
          `- ${c.name}: ${c.description || 'No description'} ${c.role_in_story ? `(${c.role_in_story})` : ''}${statusLabelOld(c)}`
        ).join('\n');

        const deadCharacterSummaries = deadCharsOld.map(c =>
          `- ${c.name}: ${c.status_notes || (isItalian ? 'Morto nel romanzo precedente' : 'Died in previous novel')}`
        ).join('\n');

        const locationSummaries = previousLocations.slice(0, 10).map(l =>
          `- ${l.name}: ${l.description || 'No description'} ${l.significance ? `- ${l.significance}` : ''}`
        ).join('\n');

        const plotSummary = previousPlotEvents.slice(0, 10).map(e =>
          `- ${e.title}: ${e.description || 'No description'}`
        ).join('\n');

        const chapterSummary = previousChapters.slice(0, 10).map((ch, idx) =>
          `Chapter ${idx + 1}: ${ch.title}`
        ).join('\n');

        const systemPrompt = isItalian
          ? `Sei un esperto scrittore e consulente editoriale specializzato in narrativa seriale.
Il tuo compito è creare un outline per il seguito di un romanzo esistente.
Devi mantenere la coerenza con i personaggi e la trama precedente, continuando la storia in modo naturale e coinvolgente.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.
Ogni capitolo deve avere un titolo contestuale (non generico) e un riassunto che colleghi al romanzo precedente.`
          : `You are an expert writer and editorial consultant specializing in serialized fiction.
Your task is to create an outline for the sequel to an existing novel.
You must maintain consistency with characters and previous plot, continuing the story naturally and engagingly.
Respond ONLY with valid JSON, without additional text.
Each chapter must have a contextual title (not generic) and a summary that links to the previous novel.`;

        const userPrompt = isItalian
          ? `Crea un outline per il sequel del seguente romanzo.

ROMANZO PRECEDENTE: "${originalProject.title}"
${originalProject.synopsis ? `SINOPSI:\n${originalProject.synopsis}\n` : ''}

PERSONAGGI DISPONIBILI PER IL SEQUEL (vivi/attivi):
${characterSummaries || 'Nessun personaggio registrato'}
${deadCharacterSummaries ? `\nPERSONAGGI MORTI NEL ROMANZO PRECEDENTE (NON devono apparire come vivi nel sequel):\n${deadCharacterSummaries}` : ''}

LUOGHI DAL ROMANZO PRECEDENTE:
${locationSummaries || 'Nessun luogo registrato'}

EVENTI DI TRAMA PRINCIPALI:
${plotSummary || 'Nessun evento registrato'}

RIASSUNTO CAPITOLI PRECEDENTI:
${chapterSummary || 'Nessun capitolo disponibile'}

TITOLO DEL SEQUEL: "${sequelTitle}"

Genera un outline con ${numChapters} capitoli nel seguente formato JSON:
{
  "chapters": [
    {
      "title": "Titolo del capitolo (contestuale, non generico)",
      "summary": "Riassunto di cosa accade, includendo riferimenti a personaggi e eventi del romanzo precedente",
      "returning_characters": ["Nome personaggio che ritorna"],
      "new_elements": ["Nuovi elementi introdotti in questo capitolo"],
      "connection_to_previous": "Come questo capitolo si collega al finale del romanzo precedente"
    }
  ],
  "themes_to_explore": ["Temi da esplorare nel sequel"],
  "character_arcs_to_continue": ["Archi narrativi da continuare"]
}

Sii creativo e specifico. I titoli devono essere evocativi e contestuali.
Continua la storia dal punto in cui è terminata.`
          : `Create an outline for the sequel to the following novel.

PREVIOUS NOVEL: "${originalProject.title}"
${originalProject.synopsis ? `SYNOPSIS:\n${originalProject.synopsis}\n` : ''}

CHARACTERS AVAILABLE FOR THE SEQUEL (alive/active):
${characterSummaries || 'No characters registered'}
${deadCharacterSummaries ? `\nCHARACTERS WHO DIED IN THE PREVIOUS NOVEL (must NOT appear alive in the sequel):\n${deadCharacterSummaries}` : ''}

LOCATIONS FROM PREVIOUS NOVEL:
${locationSummaries || 'No locations registered'}

MAIN PLOT EVENTS:
${plotSummary || 'No plot events registered'}

PREVIOUS CHAPTERS SUMMARY:
${chapterSummary || 'No chapters available'}

SEQUEL TITLE: "${sequelTitle}"

Generate an outline with ${numChapters} chapters in the following JSON format:
{
  "chapters": [
    {
      "title": "Chapter title (contextual, not generic)",
      "summary": "Summary of what happens, including references to characters and events from the previous novel",
      "returning_characters": ["Name of returning character"],
      "new_elements": ["New elements introduced in this chapter"],
      "connection_to_previous": "How this chapter connects to the previous novel's ending"
    }
  ],
  "themes_to_explore": ["Themes to explore in the sequel"],
  "character_arcs_to_continue": ["Character arcs to continue"]
}

Be creative and specific. Titles should be evocative and contextual.
Continue the story from where it ended.`;

        // Get AI provider
        const provider = await getProviderForUser(userId);
        let generatedOutline: any = null;

        if (provider) {
          try {
            console.log('[Projects] Calling AI for sequel chapter outline generation...');
            const response = await provider.chat(
              [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              { temperature: 0.8, maxTokens: 4000 }
            );

            // Parse JSON from response
            let jsonStr = response.content || '';
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1].trim();
            }

            generatedOutline = JSON.parse(jsonStr);
            console.log('[Projects] AI generated sequel chapter outline successfully');
          } catch (aiErr) {
            console.error('[Projects] AI sequel chapter outline generation failed:', aiErr);
            // Fall back to template generation
          }
        }

        // Create chapters based on generated outline or fallback template
        if (generatedOutline?.chapters && Array.isArray(generatedOutline.chapters)) {
          // Create chapters from AI-generated outline
          for (let i = 0; i < generatedOutline.chapters.length; i++) {
            const chapter = generatedOutline.chapters[i];
            const chapterId = uuidv4();

            try {
              db.prepare(
                `INSERT INTO chapters (id, project_id, title, summary, order_index, status, word_count, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
              ).run(
                chapterId,
                newProjectId,
                chapter.title || `Chapter ${i + 1}`,
                chapter.summary || '',
                i
              );
              chaptersGenerated++;
            } catch (insertErr) {
              console.warn('[Projects] Failed to insert chapter:', chapter.title, insertErr);
            }
          }
        } else {
          // Fallback: Create template-based chapters
          const fallbackTitles = isItalian
            ? ['Il Risveglio', 'Ombre del Passato', 'La Scoperta', 'Nuove Alleanze', 'Il Conflitto', 'La Rivelazione', 'Il Sacrificio', 'La Battaglia', 'La Rinascita', 'Il Nuovo Inizio']
            : ['The Awakening', 'Shadows of the Past', 'The Discovery', 'New Alliances', 'The Conflict', 'The Revelation', 'The Sacrifice', 'The Battle', 'The Rebirth', 'A New Beginning'];

          const numChaptersToCreate = Math.min(numChapters, fallbackTitles.length);

          for (let i = 0; i < numChaptersToCreate; i++) {
            const chapterId = uuidv4();
            const title = fallbackTitles[i];

            try {
              db.prepare(
                `INSERT INTO chapters (id, project_id, title, summary, order_index, status, word_count, created_at, updated_at)
                 VALUES (?, ?, ?, '', ?, 'draft', 0, datetime('now'), datetime('now'))`
              ).run(chapterId, newProjectId, title, i);
              chaptersGenerated++;
            } catch (insertErr) {
              console.warn('[Projects] Failed to insert fallback chapter:', title, insertErr);
            }
          }
        }

        console.log('[Projects] Auto-generated', chaptersGenerated, 'chapters for sequel');
      } catch (chaptersErr) {
        console.warn('[Projects] Failed to auto-generate chapters (non-fatal):', chaptersErr);
        chaptersError = chaptersErr instanceof Error ? chaptersErr.message : 'Unknown error';
        // Continue without chapters - project was created successfully
      }
    }

    // Fetch and return the sequel project
    const sequelProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(newProjectId);
    console.log('[Projects] Sequel project created successfully:', newProjectId);

    res.status(201).json({
      message: 'Sequel project created successfully',
      project: sequelProject,
      sagaId,
      charactersCopied: characters.length,
      locationsCopied: locations.length,
      sourcesCopied: sources.length,
      proposalGenerated: !!sequelProposal,
      chaptersGenerated,
      chaptersError
    });
  } catch (error) {
    console.error('[Projects] Sequel creation error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================================
// POST /api/projects/:id/sequel-stream - Create Sequel with Full Chapter Content (Feature #266)
// Creates a new project as a sequel and generates full content for each chapter via SSE streaming
// ============================================================================

interface SequelStreamRequestBody {
  title?: string;
  generateProposal?: boolean;
  language?: 'it' | 'en';
  numChapters?: number;
}

// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/sequel-stream', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const {
      title: customTitle,
      generateProposal = true,
      language = 'it',
      numChapters = 10
    } = req.body as SequelStreamRequestBody;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Helper function to send SSE events
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Fetch the original project
    const originalProject = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!originalProject) {
      sendEvent('error', { message: 'Project not found' });
      return res.end();
    }

    // Only romanziere projects can have sequels
    if (originalProject.area !== 'romanziere') {
      sendEvent('error', { message: 'Sequels can only be created for romanziere (novel) projects' });
      return res.end();
    }

    const isItalian = language === 'it';
    const newProjectId = uuidv4();

    // Generate sequel title
    const sequelTitle = customTitle || `${originalProject.title} - Part 2`;

    sendEvent('phase', {
      phase: 'setup',
      message: isItalian ? 'Preparazione progetto seguito...' : 'Setting up sequel project...'
    });

    console.log('[Projects-Stream] Creating sequel project:', projectId, '->', newProjectId);

    // Get or create saga
    let sagaId = originalProject.saga_id;

    if (!sagaId) {
      sagaId = uuidv4();
      const sagaTitle = originalProject.title.includes(' - ')
        ? originalProject.title.split(' - ')[0] + ' Series'
        : originalProject.title + ' Series';

      db.prepare(
        `INSERT INTO sagas (id, user_id, title, description, area, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(sagaId, userId, sagaTitle, `Series containing "${originalProject.title}" and its sequels`, 'romanziere');

      db.prepare('UPDATE projects SET saga_id = ? WHERE id = ?').run(sagaId, projectId);
      console.log('[Projects-Stream] Created new saga:', sagaId);
    }

    // Create the sequel project
    db.prepare(
      `INSERT INTO projects (
        id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov,
        word_count_target, status, settings_json, word_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, datetime('now'), datetime('now'))`
    ).run(
      newProjectId,
      userId,
      sagaId,
      sequelTitle,
      `Sequel to "${originalProject.title}"`,
      originalProject.area,
      originalProject.genre || '',
      originalProject.tone || '',
      originalProject.target_audience || '',
      originalProject.pov || '',
      originalProject.word_count_target || 0,
      originalProject.settings_json || '{}'
    );

    sendEvent('phase', {
      phase: 'copying',
      message: isItalian ? 'Copia personaggi e luoghi...' : 'Copying characters and locations...'
    });

    // Copy characters (exclude dead characters)
    const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[];
    let charactersCopied = 0;
    let charactersSkipped = 0;
    for (const character of characters) {
      // Skip characters with status_at_end = 'dead'
      if (character.status_at_end === 'dead') {
        charactersSkipped++;
        console.log(`[Projects-Stream] Skipping dead character: ${character.name} (${character.status_at_end})`);
        continue;
      }
      const newCharacterId = uuidv4();
      db.prepare(
        `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).run(
        newCharacterId,
        newProjectId,
        sagaId,
        character.name,
        character.description || '',
        character.traits || '',
        character.backstory || '',
        character.role_in_story || '',
        character.relationships_json || '[]',
        'unknown',  // Reset status to unknown for sequel
        character.status_notes || ''  // Keep notes for reference
      );
      charactersCopied++;
    }
    console.log(`[Projects-Stream] Copied ${charactersCopied} characters to sequel (skipped ${charactersSkipped} dead characters)`);

    // Copy locations
    const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(projectId) as any[];
    for (const location of locations) {
      const newLocationId = uuidv4();
      db.prepare(
        `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).run(
        newLocationId,
        newProjectId,
        sagaId,
        location.name,
        location.description || '',
        location.significance || ''
      );
    }
    console.log('[Projects-Stream] Copied', locations.length, 'locations to sequel');

    // Copy synopsis as source
    if (originalProject.synopsis) {
      const synopsisSourceId = uuidv4();
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, '', 'reference', 'text', ?, ?, 'upload', '', '["synopsis", "reference"]', 1.0, datetime('now'))`
      ).run(
        synopsisSourceId,
        newProjectId,
        sagaId,
        userId,
        originalProject.synopsis.length,
        `Synopsis of "${originalProject.title}":\n\n${originalProject.synopsis}`
      );
    }

    // Copy sources
    const sources = db.prepare('SELECT * FROM sources WHERE project_id = ?').all(projectId) as any[];
    for (const source of sources) {
      const newSourceId = uuidv4();
      const validSourceType = ['upload', 'web_search'].includes(source.source_type) ? source.source_type : 'upload';
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        newSourceId,
        newProjectId,
        sagaId,
        userId,
        source.file_name,
        source.file_path || '',
        source.file_type,
        source.file_size || 0,
        source.content_text || '',
        validSourceType,
        source.url || '',
        source.tags_json || '[]',
        source.relevance_score || 0.0
      );
    }
    console.log('[Projects-Stream] Copied', sources.length, 'sources to sequel');

    // Generate AI sequel proposal if requested
    let sequelProposal = null;
    if (generateProposal) {
      sendEvent('phase', {
        phase: 'proposal',
        message: isItalian ? 'Generazione proposta AI...' : 'Generating AI proposal...'
      });

      try {
        sequelProposal = await generateSequelProposal(
          originalProject,
          characters,
          locations,
          db.prepare('SELECT * FROM plot_events WHERE project_id = ?').all(projectId) as any[],
          db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index').all(projectId) as any[],
          userId,
          language
        );

        if (sequelProposal) {
          const proposalSourceId = uuidv4();
          const proposalContent = formatSequelProposal(sequelProposal, language);
          db.prepare(
            `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
             VALUES (?, ?, ?, ?, 'AI Sequel Proposal', '', 'text', ?, ?, 'upload', '', '["ai-generated", "sequel-proposal"]', 1.0, datetime('now'))`
          ).run(
            proposalSourceId,
            newProjectId,
            sagaId,
            userId,
            proposalContent.length,
            proposalContent
          );
          console.log('[Projects-Stream] Saved AI sequel proposal');
        }
      } catch (proposalErr) {
        console.warn('[Projects-Stream] Failed to generate sequel proposal (non-fatal):', proposalErr);
      }
    }

    // Generate chapter outline with AI
    sendEvent('phase', {
      phase: 'outline',
      message: isItalian ? 'Generazione outline capitoli...' : 'Generating chapter outline...'
    });

    // Gather context for chapter generation
    const previousCharacters = db.prepare(`
      SELECT name, description, traits, backstory, role_in_story, status_at_end, status_notes
      FROM characters WHERE project_id = ?
    `).all(projectId) as any[];

    const previousLocations = db.prepare(`
      SELECT name, description, significance
      FROM locations WHERE project_id = ?
    `).all(projectId) as any[];

    const previousPlotEvents = db.prepare(`
      SELECT title, description, event_type
      FROM plot_events WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(projectId) as any[];

    const previousChapters = db.prepare(`
      SELECT title, content FROM chapters WHERE project_id = ? ORDER BY order_index
    `).all(projectId) as any[];

    // Build character summaries with status information
    // Separate alive/active characters from dead/inactive ones
    const aliveCharacters = previousCharacters.filter(c => c.status_at_end !== 'dead');
    const deadCharacters = previousCharacters.filter(c => c.status_at_end === 'dead');

    const statusLabel = (c: any) => {
      if (!c.status_at_end || c.status_at_end === 'unknown') return '';
      const labels: Record<string, string> = isItalian
        ? { alive: '🟢 Vivo', dead: '🔴 Morto', injured: '🟡 Ferito', missing: '⚪ Disperso' }
        : { alive: '🟢 Alive', dead: '🔴 Dead', injured: '🟡 Injured', missing: '⚪ Missing' };
      const label = labels[c.status_at_end] || '';
      return label + (c.status_notes ? ` - ${c.status_notes}` : '');
    };

    const characterSummaries = aliveCharacters.slice(0, 15).map(c =>
      `- ${c.name}: ${c.description || 'No description'} ${c.role_in_story ? `(${c.role_in_story})` : ''} ${statusLabel(c) ? `[${statusLabel(c)}]` : ''}`
    ).join('\n');

    const deadCharacterSummaries = deadCharacters.map(c =>
      `- ${c.name}: ${c.status_notes || (isItalian ? 'Morto nel romanzo precedente' : 'Died in previous novel')}`
    ).join('\n');

    const locationSummaries = previousLocations.slice(0, 10).map(l =>
      `- ${l.name}: ${l.description || 'No description'} ${l.significance ? `- ${l.significance}` : ''}`
    ).join('\n');

    const plotSummary = previousPlotEvents.slice(0, 10).map(e =>
      `- ${e.title}: ${e.description || 'No description'}`
    ).join('\n');

    const chapterSummary = previousChapters.slice(0, 10).map((ch, idx) =>
      `Chapter ${idx + 1}: ${ch.title}`
    ).join('\n');

    const systemPrompt = isItalian
      ? `Sei un esperto scrittore e consulente editoriale specializzato in narrativa seriale.
Il tuo compito è creare un outline per il seguito di un romanzo esistente.
Devi mantenere la coerenza con i personaggi e la trama precedente, continuando la storia in modo naturale e coinvolgente.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.
Ogni capitolo deve avere un titolo contestuale (non generico) e un riassunto che colleghi al romanzo precedente.`
      : `You are an expert writer and editorial consultant specializing in serialized fiction.
Your task is to create an outline for the sequel to an existing novel.
You must maintain consistency with characters and previous plot, continuing the story naturally and engagingly.
Respond ONLY with valid JSON, without additional text.
Each chapter must have a contextual title (not generic) and a summary that links to the previous novel.`;

    const userPrompt = isItalian
      ? `Crea un outline per il sequel del seguente romanzo.

ROMANZO PRECEDENTE: "${originalProject.title}"
${originalProject.synopsis ? `SINOPSI:\n${originalProject.synopsis}\n` : ''}

PERSONAGGI DISPONIBILI PER IL SEQUEL (vivi/attivi):
${characterSummaries || 'Nessun personaggio registrato'}
${deadCharacterSummaries ? `\nPERSONAGGI MORTI NEL ROMANZO PRECEDENTE (NON devono apparire come vivi nel sequel):\n${deadCharacterSummaries}` : ''}

LUOGHI DAL ROMANZO PRECEDENTE:
${locationSummaries || 'Nessun luogo registrato'}

EVENTI DI TRAMA PRINCIPALI:
${plotSummary || 'Nessun evento registrato'}

RIASSUNTO CAPITOLI PRECEDENTI:
${chapterSummary || 'Nessun capitolo disponibile'}

TITOLO DEL SEQUEL: "${sequelTitle}"

Genera un outline con ${numChapters} capitoli nel seguente formato JSON:
{
  "chapters": [
    {
      "title": "Titolo del capitolo (contestuale, non generico)",
      "summary": "Riassunto di cosa accade, includendo riferimenti a personaggi e eventi del romanzo precedente",
      "returning_characters": ["Nome personaggio che ritorna"],
      "new_elements": ["Nuovi elementi introdotti in questo capitolo"],
      "connection_to_previous": "Come questo capitolo si collega al finale del romanzo precedente"
    }
  ],
  "themes_to_explore": ["Temi da esplorare nel sequel"],
  "character_arcs_to_continue": ["Archi narrativi da continuare"]
}

Sii creativo e specifico. I titoli devono essere evocativi e contestuali.
Continua la storia dal punto in cui è terminata.`
      : `Create an outline for the sequel to the following novel.

PREVIOUS NOVEL: "${originalProject.title}"
${originalProject.synopsis ? `SYNOPSIS:\n${originalProject.synopsis}\n` : ''}

CHARACTERS AVAILABLE FOR THE SEQUEL (alive/active):
${characterSummaries || 'No characters registered'}
${deadCharacterSummaries ? `\nCHARACTERS WHO DIED IN THE PREVIOUS NOVEL (must NOT appear alive in the sequel):\n${deadCharacterSummaries}` : ''}

LOCATIONS FROM PREVIOUS NOVEL:
${locationSummaries || 'No locations registered'}

MAIN PLOT EVENTS:
${plotSummary || 'No plot events registered'}

PREVIOUS CHAPTERS SUMMARY:
${chapterSummary || 'No chapters available'}

SEQUEL TITLE: "${sequelTitle}"

Generate an outline with ${numChapters} chapters in the following JSON format:
{
  "chapters": [
    {
      "title": "Chapter title (contextual, not generic)",
      "summary": "Summary of what happens, including references to characters and events from the previous novel",
      "returning_characters": ["Name of returning character"],
      "new_elements": ["New elements introduced in this chapter"],
      "connection_to_previous": "How this chapter connects to the previous novel's ending"
    }
  ],
  "themes_to_explore": ["Themes to explore in the sequel"],
  "character_arcs_to_continue": ["Character arcs to continue"]
}

Be creative and specific. Titles should be evocative and contextual.
Continue the story from where it ended.`;

    // Get AI provider for outline
    const provider = await getProviderForUser(userId);
    let generatedOutline: any = null;

    if (provider) {
      try {
        console.log('[Projects-Stream] Calling AI for sequel chapter outline...');
        const response = await provider.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          { temperature: 0.8, maxTokens: 4000 }
        );

        let jsonStr = response.content || '';
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        generatedOutline = JSON.parse(jsonStr);
        console.log('[Projects-Stream] AI generated sequel chapter outline successfully');
      } catch (aiErr) {
        console.error('[Projects-Stream] AI outline generation failed:', aiErr);
      }
    }

    // Create chapter records
    const chaptersToGenerate: { id: string; title: string; summary: string; orderIndex: number }[] = [];

    if (generatedOutline?.chapters && Array.isArray(generatedOutline.chapters)) {
      for (let i = 0; i < generatedOutline.chapters.length; i++) {
        const chapter = generatedOutline.chapters[i];
        const chapterId = uuidv4();

        db.prepare(
          `INSERT INTO chapters (id, project_id, title, summary, order_index, status, word_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
        ).run(chapterId, newProjectId, chapter.title || `Chapter ${i + 1}`, chapter.summary || '', i);

        chaptersToGenerate.push({
          id: chapterId,
          title: chapter.title || `Chapter ${i + 1}`,
          summary: chapter.summary || '',
          orderIndex: i
        });
      }
    } else {
      // Fallback template chapters
      const fallbackTitles = isItalian
        ? ['Il Risveglio', 'Ombre del Passato', 'La Scoperta', 'Nuove Alleanze', 'Il Conflitto', 'La Rivelazione', 'Il Sacrificio', 'La Battaglia', 'La Rinascita', 'Il Nuovo Inizio']
        : ['The Awakening', 'Shadows of the Past', 'The Discovery', 'New Alliances', 'The Conflict', 'The Revelation', 'The Sacrifice', 'The Battle', 'The Rebirth', 'A New Beginning'];

      const numChaptersToCreate = Math.min(numChapters, fallbackTitles.length);

      for (let i = 0; i < numChaptersToCreate; i++) {
        const chapterId = uuidv4();
        const title = fallbackTitles[i];

        db.prepare(
          `INSERT INTO chapters (id, project_id, title, summary, order_index, status, word_count, created_at, updated_at)
           VALUES (?, ?, ?, '', ?, 'draft', 0, datetime('now'), datetime('now'))`
        ).run(chapterId, newProjectId, title, i);

        chaptersToGenerate.push({
          id: chapterId,
          title,
          summary: '',
          orderIndex: i
        });
      }
    }

    sendEvent('outline_complete', {
      message: isItalian ? `Outline completato con ${chaptersToGenerate.length} capitoli` : `Outline completed with ${chaptersToGenerate.length} chapters`,
      totalChapters: chaptersToGenerate.length
    });

    // Now generate full content for each chapter
    let totalWordsGenerated = 0;
    let chaptersWithContent = 0;
    let chaptersFailed = 0;

    if (!provider) {
      sendEvent('warning', {
        message: isItalian
          ? 'Nessun provider AI configurato. I capitoli sono stati creati con solo titolo.'
          : 'No AI provider configured. Chapters were created with titles only.'
      });
    } else {
      for (const chapter of chaptersToGenerate) {
        sendEvent('phase', {
          phase: 'generating',
          message: isItalian
            ? `Generazione capitolo ${chapter.orderIndex + 1}/${chaptersToGenerate.length}: "${chapter.title}"`
            : `Generating chapter ${chapter.orderIndex + 1}/${chaptersToGenerate.length}: "${chapter.title}"`,
          chapterIndex: chapter.orderIndex + 1,
          totalChapters: chaptersToGenerate.length,
          chapterTitle: chapter.title
        });

        try {
          // Build context for this chapter
          const previousChapterContent = chapter.orderIndex > 0
            ? db.prepare('SELECT title, content FROM chapters WHERE project_id = ? AND order_index = ?')
                .get(newProjectId, chapter.orderIndex - 1) as { title: string; content: string } | undefined
            : null;

          const nextChapter = chapter.orderIndex < chaptersToGenerate.length - 1
            ? chaptersToGenerate[chapter.orderIndex + 1]
            : null;

          // Build chapter generation prompt
          let chapterSystemPrompt = isItalian
            ? `Sei uno scrittore professionista che aiuta a creare capitoli di romanzi.

PROGETTO: "${sanitizeSensitiveWords(sequelTitle)}"
GENERE: ${originalProject.genre || 'Narrativa'}
TONO: ${originalProject.tone || 'Neutro'}
PUBBLICO: ${originalProject.target_audience || 'Adulti'}

CAPITOLO CORRENTE: "${sanitizeSensitiveWords(chapter.title)}" (Capitolo ${chapter.orderIndex + 1})${chapter.summary ? `\n\nSINOSSI DEL CAPITOLO (ISTRUZIONE PRINCIPALE):\n${chapter.summary}\n\nIMPORTANTE: Devi seguire fedelmente questa sinossi. Il contenuto generato deve espandere tutti gli elementi narrativi descritti nella sinossi mantenendo coerenza con la trama prevista.` : ''}`
            : `You are a professional writer helping create novel chapters.

PROJECT: "${sanitizeSensitiveWords(sequelTitle)}"
GENRE: ${originalProject.genre || 'Fiction'}
TONE: ${originalProject.tone || 'Neutral'}
AUDIENCE: ${originalProject.target_audience || 'Adults'}

CURRENT CHAPTER: "${sanitizeSensitiveWords(chapter.title)}" (Chapter ${chapter.orderIndex + 1})${chapter.summary ? `\n\nCHAPTER SYNOPSIS (PRIMARY INSTRUCTION):\n${chapter.summary}\n\nIMPORTANT: You must faithfully follow this synopsis. The generated content must expand all narrative elements described in the synopsis while maintaining coherence with the planned plot.` : ''}`;

          // Add character context
          // Feature #275: Include character status (alive/dead) in sequel generation
          const sequelCharacters = db.prepare('SELECT name, description, traits, status_at_end, status_notes FROM characters WHERE project_id = ?').all(newProjectId) as any[];
          if (sequelCharacters.length > 0) {
            // Separate alive and dead characters
            const aliveChars = sequelCharacters.filter(c => c.status_at_end !== 'dead');
            const deadChars = sequelCharacters.filter(c => c.status_at_end === 'dead');

            // Add alive characters
            if (aliveChars.length > 0) {
              const charList = aliveChars.map(c => {
                let charText = `- ${c.name}: ${c.description || 'No description'} ${c.traits ? `(${c.traits})` : ''}`;
                // Add status notes for special states
                if (c.status_at_end && c.status_at_end !== 'alive' && c.status_at_end !== 'unknown') {
                  charText += ` [Status: ${c.status_at_end}]`;
                }
                if (c.status_notes) {
                  charText += ` [Note: ${c.status_notes}]`;
                }
                return charText;
              }).join('\n');
              chapterSystemPrompt += isItalian
                ? `\n\nPERSONAGGI DISPONIBILI:\n${charList}`
                : `\n\nAVAILABLE CHARACTERS:\n${charList}`;
            }

            // Add dead characters warning
            if (deadChars.length > 0) {
              const deadList = deadChars.map(c => {
                let deadText = `- ${c.name}`;
                if (c.status_notes) {
                  deadText += ` (${c.status_notes})`;
                }
                return deadText;
              }).join('\n');
              chapterSystemPrompt += isItalian
                ? `\n\nPERSONAGGI MORTI (NON USARE - SONO MORTI):\n${deadList}\n\nIMPORTANTE: Questi personaggi sono morti e NON devono apparire nel sequel.`
                : `\n\nDEAD CHARACTERS (DO NOT USE - THEY ARE DEAD):\n${deadList}\n\nIMPORTANT: These characters are dead and MUST NOT appear in this sequel.`;
            }
          }

          // Add location context
          const sequelLocations = db.prepare('SELECT name, description FROM locations WHERE project_id = ?').all(newProjectId) as any[];
          if (sequelLocations.length > 0) {
            const locList = sequelLocations.map(l =>
              `- ${l.name}: ${l.description || 'No description'}`
            ).join('\n');
            chapterSystemPrompt += isItalian
              ? `\n\nLUOGHI:\n${locList}`
              : `\n\nLOCATIONS:\n${locList}`;
          }

          const chapterUserPrompt = isItalian
            ? (chapter.summary
              ? `Basandoti sulla seguente sinossi, scrivi il capitolo completo "${sanitizeSensitiveWords(chapter.title)}" che espande tutti gli eventi narrativi descritti.

SINOSSI DA ESPANDERE:
${chapter.summary}

${previousChapterContent ? `CAPITOLO PRECEDENTE: "${sanitizeSensitiveWords(previousChapterContent.title)}"` : 'Questo è il primo capitolo del seguito.'}
${nextChapter ? `PROSSIMO CAPITOLO: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'Questo è l\'ultimo capitolo.'}

Scrivi un capitolo coinvolgente di circa 2000-3000 parole in italiano, mantenendo tutti gli elementi narrativi della sinossi e continuando la storia dal romanzo precedente.`
              : `Scrivi il contenuto completo del capitolo "${sanitizeSensitiveWords(chapter.title)}".

${previousChapterContent ? `CAPITOLO PRECEDENTE: "${sanitizeSensitiveWords(previousChapterContent.title)}"` : 'Questo è il primo capitolo del seguito.'}
${nextChapter ? `PROSSIMO CAPITOLO: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'Questo è l\'ultimo capitolo.'}

Scrivi un capitolo coinvolgente di circa 2000-3000 parole in italiano che continui la storia dal romanzo precedente.`)
            : (chapter.summary
              ? `Based on the following synopsis, write the complete chapter "${sanitizeSensitiveWords(chapter.title)}" expanding all the narrative events described.

SYNOPSIS TO EXPAND:
${chapter.summary}

${previousChapterContent ? `PREVIOUS CHAPTER: "${sanitizeSensitiveWords(previousChapterContent.title)}"` : 'This is the first chapter of the sequel.'}
${nextChapter ? `NEXT CHAPTER: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'This is the last chapter.'}

Write an engaging chapter of approximately 2000-3000 words in English, maintaining all narrative elements from the synopsis and continuing the story from the previous novel.`
              : `Write the complete content for chapter "${sanitizeSensitiveWords(chapter.title)}".

${previousChapterContent ? `PREVIOUS CHAPTER: "${sanitizeSensitiveWords(previousChapterContent.title)}"` : 'This is the first chapter of the sequel.'}
${nextChapter ? `NEXT CHAPTER: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'This is the last chapter.'}

Write an engaging chapter of approximately 2000-3000 words in English that continues the story from the previous novel.`);

          // Generate chapter content
          let chapterContent = '';
          try {
            for await (const event of provider.stream([
              { role: 'system', content: chapterSystemPrompt },
              { role: 'user', content: chapterUserPrompt }
            ], { maxTokens: 4000 })) {
              if (event.type === 'delta' && event.content) {
                chapterContent += event.content;
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Generation failed');
              }
            }
          } catch (streamErr: any) {
            // Check for moderation error and try simplified prompt
            if (isModerationError(streamErr)) {
              console.log('[Projects-Stream] Moderation error, using simplified prompt for chapter', chapter.orderIndex + 1);
              const simplifiedPrompt = isItalian
                ? `Scrivi un capitolo di circa 2000 parole per il romanzo "${sanitizeSensitiveWords(sequelTitle)}".
Il capitolo si intitola: "${sanitizeSensitiveWords(chapter.title)}"
Ordine: Capitolo ${chapter.orderIndex + 1} di ${chaptersToGenerate.length}.`
                : `Write a chapter of approximately 2000 words for the novel "${sanitizeSensitiveWords(sequelTitle)}".
Chapter title: "${sanitizeSensitiveWords(chapter.title)}"
Order: Chapter ${chapter.orderIndex + 1} of ${chaptersToGenerate.length}.`;

              for await (const event of provider.stream([
                { role: 'user', content: simplifiedPrompt }
              ], { maxTokens: 4000 })) {
                if (event.type === 'delta' && event.content) {
                  chapterContent += event.content;
                } else if (event.type === 'error') {
                  throw new Error(event.error || 'Simplified generation failed');
                }
              }
            } else {
              throw streamErr;
            }
          }

          if (chapterContent) {
            const wordCount = chapterContent.split(/\s+/).filter(w => w.length > 0).length;
            const now = new Date().toISOString();

            db.prepare(`
              UPDATE chapters
              SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
              WHERE id = ?
            `).run(chapterContent, wordCount, now, chapter.id);

            totalWordsGenerated += wordCount;
            chaptersWithContent++;

            sendEvent('chapter_complete', {
              chapterIndex: chapter.orderIndex + 1,
              chapterTitle: chapter.title,
              wordCount,
              totalWordsGenerated
            });

            console.log(`[Projects-Stream] Generated chapter ${chapter.orderIndex + 1}: "${chapter.title}" (${wordCount} words)`);
          } else {
            chaptersFailed++;
            sendEvent('chapter_warning', {
              chapterIndex: chapter.orderIndex + 1,
              chapterTitle: chapter.title,
              message: isItalian ? 'Contenuto vuoto generato' : 'Empty content generated'
            });
          }
        } catch (chapterErr: any) {
          chaptersFailed++;
          console.error(`[Projects-Stream] Failed to generate chapter ${chapter.orderIndex + 1}:`, chapterErr.message);
          sendEvent('chapter_warning', {
            chapterIndex: chapter.orderIndex + 1,
            chapterTitle: chapter.title,
            message: chapterErr.message || 'Generation failed'
          });
          // Continue with next chapter
        }
      }
    }

    // Update project word count
    db.prepare('UPDATE projects SET word_count = ? WHERE id = ?').run(totalWordsGenerated, newProjectId);

    // Fetch and return the final project
    const sequelProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(newProjectId);
    console.log('[Projects-Stream] Sequel project created with full content:', newProjectId);

    sendEvent('done', {
      message: isItalian ? 'Seguito creato con successo!' : 'Sequel created successfully!',
      project: sequelProject,
      sagaId,
      charactersCopied: characters.length,
      locationsCopied: locations.length,
      sourcesCopied: sources.length,
      proposalGenerated: !!sequelProposal,
      chaptersGenerated: chaptersToGenerate.length,
      chaptersWithContent,
      chaptersFailed,
      totalWordsGenerated
    });

    return res.end();
  } catch (error) {
    console.error('[Projects-Stream] Sequel creation error:', error instanceof Error ? error.message : 'Unknown error');
    // Try to send error via SSE if headers already sent
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal server error' })}\n\n`);
    } catch {
      // Headers not sent yet, send as JSON
      res.status(500).json({ message: 'Internal server error' });
    }
    return res.end();
  }
});

/**
 * Generate AI sequel proposal based on original project content
 */
async function generateSequelProposal(
  originalProject: any,
  characters: any[],
  locations: any[],
  plotEvents: any[],
  chapters: any[],
  userId: string,
  language: 'it' | 'en'
): Promise<any> {
  const isItalian = language === 'it';

  // Get AI provider for user
  const provider = await getProviderForUser(userId);
  if (!provider) {
    console.log('[Projects] No AI provider available for sequel proposal');
    return null;
  }

  // Build context for AI
  const synopsis = originalProject.synopsis || '';

  // Separate alive from dead characters
  const aliveChars = characters.filter(c => c.status_at_end !== 'dead');
  const deadChars = characters.filter(c => c.status_at_end === 'dead');

  const statusInfo = (c: any) => {
    if (!c.status_at_end || c.status_at_end === 'unknown') return '';
    const labels: Record<string, string> = isItalian
      ? { alive: 'Vivo', injured: 'Ferito', missing: 'Disperso' }
      : { alive: 'Alive', injured: 'Injured', missing: 'Missing' };
    return labels[c.status_at_end] ? ` [${labels[c.status_at_end]}${c.status_notes ? ': ' + c.status_notes : ''}]` : '';
  };

  const characterSummaries = aliveChars.slice(0, 10).map(c =>
    `- ${c.name}: ${c.description || ''} (${c.role_in_story || 'role unknown'})${statusInfo(c)}`
  ).join('\n');

  const deadCharSummaries = deadChars.map(c =>
    `- ${c.name}: ${c.status_notes || (isItalian ? 'Morto nel romanzo precedente' : 'Died in previous novel')}`
  ).join('\n');

  const locationSummaries = locations.slice(0, 10).map(l =>
    `- ${l.name}: ${l.description || ''}`
  ).join('\n');

  const plotSummaries = plotEvents.slice(0, 10).map(e =>
    `- ${e.title}: ${e.description || ''}`
  ).join('\n');

  // Get chapter summaries (first 500 chars of each)
  const chapterSummaries = chapters.slice(0, 5).map((ch, idx) =>
    `Chapter ${idx + 1} - ${ch.title}: ${ch.content?.substring(0, 300) || ''}...`
  ).join('\n\n');

  const systemPrompt = isItalian
    ? `Sei un esperto scrittore e consulente editoriale specializzato in narrativa.
Il tuo compito è analizzare un romanzo esistente e proporre idee creative per un sequel.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.`
    : `You are an expert writer and editorial consultant specializing in fiction.
Your task is to analyze an existing novel and propose creative ideas for a sequel.
Respond ONLY with valid JSON, without additional text.`;

  const userPrompt = isItalian
    ? `Analizza il seguente romanzo e proponi un sequel creativo.

TITOLO ORIGINALE: ${originalProject.title}

SINOPSI:
${synopsis || 'Non disponibile'}

PERSONAGGI DISPONIBILI (vivi/attivi):
${characterSummaries || 'Nessun personaggio registrato'}
${deadCharSummaries ? `\nPERSONAGGI MORTI (NON possono apparire vivi nel sequel):\n${deadCharSummaries}` : ''}

LUOGHI:
${locationSummaries || 'Nessun luogo registrato'}

EVENTI DI TRAMA:
${plotSummaries || 'Nessun evento registrato'}

RIASSUNTO CAPITOLI:
${chapterSummaries || 'Nessun capitolo disponibile'}

Genera una proposta per il sequel con la seguente struttura JSON:
{
  "plotDirections": [
    {"title": "Titolo direzione 1", "description": "Descrizione della possibile direzione della trama"},
    {"title": "Titolo direzione 2", "description": "Descrizione della possibile direzione della trama"},
    {"title": "Titolo direzione 3", "description": "Descrizione della possibile direzione della trama"}
  ],
  "characterArcs": [
    {"character": "Nome personaggio", "arc": "Come il personaggio potrebbe evolversi"}
  ],
  "newCharacters": [
    {"name": "Nome nuovo personaggio", "role": "Ruolo (antagonista, alleato, ecc.)", "description": "Descrizione"}
  ],
  "settingSuggestions": [
    {"name": "Nome luogo", "type": "nuovo/ritornante", "description": "Perché questo luogo è interessante"}
  ],
  "chapterOutline": [
    {"chapter": 1, "title": "Titolo capitolo", "summary": "Riassunto di cosa accade"}
  ],
  "themes": ["Tema 1", "Tema 2", "Tema 3"]
}

Suggerimenti creativi e specifici basati sul contenuto del romanzo originale.`
    : `Analyze the following novel and propose a creative sequel.

ORIGINAL TITLE: ${originalProject.title}

SYNOPSIS:
${synopsis || 'Not available'}

CHARACTERS AVAILABLE (alive/active):
${characterSummaries || 'No characters registered'}
${deadCharSummaries ? `\nCHARACTERS WHO DIED (must NOT appear alive in the sequel):\n${deadCharSummaries}` : ''}

LOCATIONS:
${locationSummaries || 'No locations registered'}

PLOT EVENTS:
${plotSummaries || 'No plot events registered'}

CHAPTER SUMMARIES:
${chapterSummaries || 'No chapters available'}

Generate a sequel proposal with the following JSON structure:
{
  "plotDirections": [
    {"title": "Direction title 1", "description": "Description of possible plot direction"},
    {"title": "Direction title 2", "description": "Description of possible plot direction"},
    {"title": "Direction title 3", "description": "Description of possible plot direction"}
  ],
  "characterArcs": [
    {"character": "Character name", "arc": "How the character could evolve"}
  ],
  "newCharacters": [
    {"name": "New character name", "role": "Role (antagonist, ally, etc.)", "description": "Description"}
  ],
  "settingSuggestions": [
    {"name": "Location name", "type": "new/returning", "description": "Why this location is interesting"}
  ],
  "chapterOutline": [
    {"chapter": 1, "title": "Chapter title", "summary": "Summary of what happens"}
  ],
  "themes": ["Theme 1", "Theme 2", "Theme 3"]
}

Be creative and specific based on the original novel's content.`;

  try {
    const response = await provider.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.8, maxTokens: 3000 }
    );

    // Parse JSON from response
    let jsonStr = response.content || '';
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const proposal = JSON.parse(jsonStr);
    console.log('[Projects] Generated sequel proposal successfully');
    return proposal;
  } catch (err) {
    console.error('[Projects] Failed to generate sequel proposal:', err);
    return null;
  }
}

/**
 * Format sequel proposal as readable text
 */
function formatSequelProposal(proposal: any, language: 'it' | 'en'): string {
  const isItalian = language === 'it';

  let content = isItalian
    ? `# Proposta per il Sequel\n\nGenerato automaticamente da OmniWriter AI\n\n`
    : `# Sequel Proposal\n\nAutomatically generated by OmniWriter AI\n\n`;

  if (proposal.plotDirections?.length > 0) {
    content += isItalian ? `## Direzioni di Trama Possibili\n\n` : `## Possible Plot Directions\n\n`;
    proposal.plotDirections.forEach((dir: any, idx: number) => {
      content += `### ${idx + 1}. ${dir.title}\n${dir.description}\n\n`;
    });
  }

  if (proposal.characterArcs?.length > 0) {
    content += isItalian ? `## Archi dei Personaggi\n\n` : `## Character Arcs\n\n`;
    proposal.characterArcs.forEach((arc: any) => {
      content += `**${arc.character}**: ${arc.arc}\n\n`;
    });
  }

  if (proposal.newCharacters?.length > 0) {
    content += isItalian ? `## Nuovi Personaggi Suggeriti\n\n` : `## Suggested New Characters\n\n`;
    proposal.newCharacters.forEach((char: any) => {
      content += `**${char.name}** (${char.role}): ${char.description}\n\n`;
    });
  }

  if (proposal.settingSuggestions?.length > 0) {
    content += isItalian ? `## Suggerimenti per le Ambientazioni\n\n` : `## Setting Suggestions\n\n`;
    proposal.settingSuggestions.forEach((setting: any) => {
      content += `**${setting.name}** (${setting.type}): ${setting.description}\n\n`;
    });
  }

  if (proposal.chapterOutline?.length > 0) {
    content += isItalian ? `## Schema dei Capitoli Suggeriti\n\n` : `## Suggested Chapter Outline\n\n`;
    proposal.chapterOutline.forEach((ch: any) => {
      content += `**Capitolo ${ch.chapter}: ${ch.title}**\n${ch.summary}\n\n`;
    });
  }

  if (proposal.themes?.length > 0) {
    content += isItalian ? `## Temi da Esplorare\n\n` : `## Themes to Explore\n\n`;
    content += proposal.themes.map((t: string) => `- ${t}`).join('\n');
    content += '\n\n';
  }

  return content;
}

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
        `INSERT INTO chapters (id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', ?, 'imported', ?, datetime('now'), datetime('now'))`
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
  const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  const mimeType = file.mimetype;

  console.log('[TextExtraction] Extracting text from file:', file.originalname, 'type:', mimeType, 'ext:', fileExtension);

  // Plain text file
  if (mimeType === 'text/plain' || fileExtension === '.txt') {
    return file.buffer.toString('utf-8');
  }

  // PDF file
  if (mimeType === 'application/pdf' || fileExtension === '.pdf') {
    const PDFParser = (await import('pdf2json')).default;
    return new Promise((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, 1);
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('[Projects] PDF parsing error:', errData.parserError);
        reject(new Error('Failed to parse PDF file'));
      });
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages with safe decoding
          const pages = pdfData?.Pages || [];
          const text = pages.map((page: any) => {
            const texts = page?.Texts || [];
            return texts.map((textItem: any) => {
              try {
                // Safely access nested properties
                const rawText = textItem?.R?.[0]?.T;
                if (!rawText) return '';
                try {
                  return decodeURIComponent(rawText);
                } catch {
                  // If decodeURIComponent fails, return raw text
                  return rawText;
                }
              } catch {
                return '';
              }
            }).join(' ');
          }).join('\n');
          console.log('[TextExtraction] Extracted', text.length, 'characters from PDF');
          resolve(text);
        } catch (parseError) {
          console.error('[TextExtraction] PDF text extraction error:', parseError);
          reject(new Error('Failed to extract text from PDF'));
        }
      });
      pdfParser.parseBuffer(file.buffer);
    });
  }

  // DOCX file - use mammoth to extract text
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      fileExtension === '.docx' ||
      fileExtension === '.doc') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      console.log('[TextExtraction] Extracted', result.value.length, 'characters from DOCX');
      return result.value;
    } catch (docxError) {
      console.error('[TextExtraction] DOCX extraction error:', docxError);
      throw new Error('Failed to extract text from DOCX file. Please ensure the file is a valid Word document.');
    }
  }

  // RTF file - regex-based extraction
  if (mimeType === 'application/rtf' || fileExtension === '.rtf') {
    let content = file.buffer.toString('utf-8');
    // Remove RTF control words and extract plain text
    content = content.replace(/\{\\rtf1[^}]*\}/g, '');
    content = content.replace(/\{\\fonttbl[^}]*\}/g, '');
    content = content.replace(/\{\\colortbl[^}]*\}/g, '');
    content = content.replace(/\{\\stylesheet[^}]*\}/g, '');
    content = content.replace(/\\[a-z]+\d*/g, '');
    content = content.replace(/[{}]/g, '');
    content = content.replace(/\\'/g, "'");
    content = content.replace(/\s+/g, ' ').trim();
    return content;
  }

  // Fallback - try to decode as UTF-8 text
  console.warn('[TextExtraction] Unknown file type, attempting UTF-8 decode');
  return file.buffer.toString('utf-8');
}

// ============================================================================
// AI-Based Novel Analysis (Feature #249)
// Replaces regex-based extraction with intelligent AI analysis
// ============================================================================

/**
 * Maximum characters per chunk for AI analysis
 */
const MAX_ANALYSIS_CHUNK_SIZE = 12000;

/**
 * Split text into chunks for AI processing
 */
function chunkTextForAnalysis(text: string, maxSize: number = MAX_ANALYSIS_CHUNK_SIZE): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }

    // Try to find a good break point (end of paragraph or sentence)
    let breakPoint = remaining.lastIndexOf('\n\n', maxSize);
    if (breakPoint < maxSize * 0.5) {
      breakPoint = remaining.lastIndexOf('.\n', maxSize);
    }
    if (breakPoint < maxSize * 0.5) {
      breakPoint = remaining.lastIndexOf('. ', maxSize);
    }
    if (breakPoint < maxSize * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', maxSize);
    }
    if (breakPoint < maxSize * 0.3) {
      breakPoint = maxSize; // Force break if no good point found
    }

    chunks.push(remaining.substring(0, breakPoint + 1));
    remaining = remaining.substring(breakPoint + 1).trim();
  }

  return chunks;
}

/**
 * Build the AI prompt for novel analysis based on language
 */
function buildNovelAnalysisPrompt(chunk: string, language: 'it' | 'en'): { systemPrompt: string; userPrompt: string } {
  const isItalian = language === 'it';

  if (isItalian) {
    return {
      systemPrompt: `Sei un esperto analista letterario specializzato nell'estrazione di personaggi, luoghi ed eventi di trama dai romanzi.
Il tuo compito è analizzare il testo fornito ed estrarre TUTTI i personaggi, luoghi ed eventi di trama significativi.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.
Ogni entità deve avere descrizioni basate ESCLUSIVAMENTE sul testo fornito.`,
      userPrompt: `Analizza il seguente estratto di un romanzo ed estrai personaggi, luoghi ed eventi di trama.

TESTO:
"""
${chunk}
"""

Rispondi con un JSON con la seguente struttura:
{
  "synopsis": "Una sinossi del testo in 300-500 parole che riassuma la trama principale, i personaggi chiave e i temi centrali",
  "characters": [
    {
      "name": "Nome completo del personaggio",
      "description": "Descrizione fisica e comportamentale basata sul testo",
      "role_in_story": "Ruolo nella storia (es: protagonista, antagonista, comprimario)",
      "traits": "Tratti caratteriali emersi dal testo",
      "backstory": "Eventi passati menzionati nel testo",
      "status_at_end": "Stato finale del personaggio alla fine del romanzo (alive, dead, injured, missing, unknown)",
      "status_notes": "Dettagli specifici sullo stato finale del personaggio (es: 'morto in battaglia', 'sopravvissuto ma ferito', 'sparito nel finale')",
      "relationships": [
        {
          "relatedTo": "Nome del personaggio correlato",
          "type": "Tipo di relazione (es: family, friend, enemy, romantic, mentor, ally)",
          "description": "Breve descrizione della relazione basata sul testo"
        }
      ]
    }
  ],
  "locations": [
    {
      "name": "Nome del luogo",
      "description": "Descrizione del luogo basata sul testo",
      "significance": "Importanza nella narrazione"
    }
  ],
  "plotEvents": [
    {
      "title": "Titolo breve dell'evento",
      "description": "Descrizione dettagliata dell'accaduto",
      "event_type": "Tipo (es: plot_event, character_introduction, conflict, resolution, turning_point)"
    }
  ]
}

IMPORTANTE:
- Estrai SOLO entità che appaiono chiaramente nel testo fornito
- Non inventare informazioni non presenti nel testo
- I nomi dei personaggi devono essere coerenti (usa lo stesso nome per lo stesso personaggio)
- Per ogni personaggio, estrai le relazioni con altri personaggi menzionate nel testo
- I tipi di relazione devono essere: family, friend, enemy, romantic, mentor, ally
- Per ogni personaggio, deduci lo stato finale alla fine del romanzo basandosi sul testo (alive, dead, injured, missing, unknown)
- Se non è chiaro lo stato finale, usa 'unknown'
- Se non trovi entità di un tipo, restituisci un array vuoto per quel tipo`
    };
  }

  return {
    systemPrompt: `You are an expert literary analyst specializing in extracting characters, locations, and plot events from novels.
Your task is to analyze the provided text and extract ALL significant characters, locations, and plot events.
Respond ONLY with valid JSON, no additional text.
Each entity must have descriptions based EXCLUSIVELY on the provided text.`,
    userPrompt: `Analyze the following novel excerpt and extract characters, locations, and plot events.

TEXT:
"""
${chunk}
"""

Respond with JSON in the following structure:
{
  "synopsis": "A synopsis of the text in 300-500 words that summarizes the main plot, key characters, and central themes",
  "characters": [
    {
      "name": "Full character name",
      "description": "Physical and behavioral description based on the text",
      "role_in_story": "Role in the story (e.g., protagonist, antagonist, supporting)",
      "traits": "Character traits that emerge from the text",
      "backstory": "Past events mentioned in the text",
      "status_at_end": "Character's final state at the end of the novel (alive, dead, injured, missing, unknown)",
      "status_notes": "Specific details about the character's final state (e.g., 'died in battle', 'survived but wounded', 'disappeared in the finale')",
      "relationships": [
        {
          "relatedTo": "Name of the related character",
          "type": "Relationship type (e.g., family, friend, enemy, romantic, mentor, ally)",
          "description": "Brief description of the relationship based on the text"
        }
      ]
    }
  ],
  "locations": [
    {
      "name": "Location name",
      "description": "Description of the location based on the text",
      "significance": "Importance in the narrative"
    }
  ],
  "plotEvents": [
    {
      "title": "Brief title of the event",
      "description": "Detailed description of what happened",
      "event_type": "Type (e.g., plot_event, character_introduction, conflict, resolution, turning_point)"
    }
  ]
}

IMPORTANT:
- Extract ONLY entities that clearly appear in the provided text
- Do not invent information not present in the text
- Character names should be consistent (use the same name for the same character)
- For each character, extract relationships with other characters mentioned in the text
- Relationship types should be: family, friend, enemy, romantic, mentor, ally
- For each character, deduce their final state at the end of the novel based on the text (alive, dead, injured, missing, unknown)
- If the final state is unclear, use 'unknown'
- If you find no entities of a type, return an empty array for that type`
  };
}

/**
 * Parsed entity types from AI response
 */
interface ParsedRelationship {
  relatedTo: string;
  type: string;
  description: string;
}

interface ParsedCharacter {
  name: string;
  description: string;
  role_in_story: string;
  traits: string;
  backstory: string;
  relationships: ParsedRelationship[];
  status_at_end?: string;  // 'alive', 'dead', 'injured', 'missing', 'unknown'
  status_notes?: string;    // Additional notes about final state
}

interface ParsedLocation {
  name: string;
  description: string;
  significance: string;
}

interface ParsedPlotEvent {
  title: string;
  description: string;
  event_type: string;
}

interface ParsedAnalysis {
  synopsis: string;
  characters: ParsedCharacter[];
  locations: ParsedLocation[];
  plotEvents: ParsedPlotEvent[];
}

/**
 * Parse AI response for novel analysis
 */
function parseNovelAnalysisResponse(response: string): ParsedAnalysis {
  const defaultResult: ParsedAnalysis = {
    synopsis: '',
    characters: [],
    locations: [],
    plotEvents: []
  };

  try {
    // Try to extract JSON from the response
    let jsonStr = response;

    // If response contains markdown code blocks, extract the JSON
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse the JSON
    const parsed = JSON.parse(jsonStr);

    // Log synopsis extraction for debugging
    console.log(`[NovelAnalysis] parseNovelAnalysisResponse - synopsis found: ${parsed.synopsis ? 'YES (' + String(parsed.synopsis).length + ' chars)' : 'NO'}`);

    return {
      synopsis: String(parsed.synopsis || '').trim(),
      characters: (parsed.characters || []).map((c: any) => ({
        name: String(c.name || '').trim(),
        description: String(c.description || '').trim(),
        role_in_story: String(c.role_in_story || '').trim(),
        traits: String(c.traits || '').trim(),
        backstory: String(c.backstory || '').trim(),
        status_at_end: String(c.status_at_end || 'unknown').trim().toLowerCase(),
        status_notes: String(c.status_notes || '').trim(),
        relationships: (c.relationships || []).map((r: any) => ({
          relatedTo: String(r.relatedTo || r.related_to || r.name || '').trim(),
          type: String(r.type || r.relationshipType || 'ally').trim().toLowerCase(),
          description: String(r.description || '').trim()
        })).filter((r: ParsedRelationship) => r.relatedTo.length > 0)
      })).filter((c: ParsedCharacter) => c.name.length > 0),
      locations: (parsed.locations || []).map((l: any) => ({
        name: String(l.name || '').trim(),
        description: String(l.description || '').trim(),
        significance: String(l.significance || '').trim()
      })).filter((l: ParsedLocation) => l.name.length > 0),
      plotEvents: (parsed.plotEvents || parsed.plot_events || []).map((e: any) => ({
        title: String(e.title || '').trim(),
        description: String(e.description || '').trim(),
        event_type: String(e.event_type || e.eventType || 'plot_event').trim()
      })).filter((e: ParsedPlotEvent) => e.title.length > 0)
    };
  } catch (error) {
    console.error('[NovelAnalysis] Failed to parse AI response:', error);
    console.error('[NovelAnalysis] Response was:', response.substring(0, 500));
    return defaultResult;
  }
}

/**
 * Normalize a name for comparison (lowercase, remove accents, etc.)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);

  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.8;

  // Simple character overlap similarity
  const charsA = new Set(normA.split(''));
  const charsB = new Set(normB.split(''));
  const intersection = new Set([...charsA].filter(x => charsB.has(x)));
  const union = new Set([...charsA, ...charsB]);

  return intersection.size / union.size;
}

/**
 * Deduplicate characters by merging similar ones
 */
function deduplicateCharacters(characters: ParsedCharacter[]): ParsedCharacter[] {
  const merged: ParsedCharacter[] = [];
  const used = new Set<number>();

  for (let i = 0; i < characters.length; i++) {
    if (used.has(i)) continue;

    const current = { ...characters[i], relationships: [...(characters[i].relationships || [])] };

    // Find similar characters
    for (let j = i + 1; j < characters.length; j++) {
      if (used.has(j)) continue;

      const similarity = stringSimilarity(current.name, characters[j].name);
      if (similarity > 0.7) {
        // Merge character j into current
        if (characters[j].description && !current.description.includes(characters[j].description)) {
          current.description = current.description
            ? `${current.description} ${characters[j].description}`
            : characters[j].description;
        }
        if (characters[j].role_in_story && !current.role_in_story) {
          current.role_in_story = characters[j].role_in_story;
        }
        if (characters[j].traits && !current.traits.includes(characters[j].traits)) {
          current.traits = current.traits
            ? `${current.traits}, ${characters[j].traits}`
            : characters[j].traits;
        }
        if (characters[j].backstory && !current.backstory.includes(characters[j].backstory)) {
          current.backstory = current.backstory
            ? `${current.backstory} ${characters[j].backstory}`
            : characters[j].backstory;
        }
        // Merge relationships from duplicate character
        if (characters[j].relationships && characters[j].relationships.length > 0) {
          for (const rel of characters[j].relationships) {
            const existing = current.relationships.find(
              r => normalizeName(r.relatedTo) === normalizeName(rel.relatedTo) && r.type === rel.type
            );
            if (!existing) {
              current.relationships.push(rel);
            }
          }
        }
        // Merge status_at_end with priority: dead > injured > missing > alive > unknown
        const statusPriority = ['unknown', 'alive', 'missing', 'injured', 'dead'];
        const currentStatusPriority = statusPriority.indexOf(current.status_at_end || 'unknown');
        const newStatusPriority = statusPriority.indexOf(characters[j].status_at_end || 'unknown');
        if (newStatusPriority > currentStatusPriority) {
          current.status_at_end = characters[j].status_at_end;
          current.status_notes = characters[j].status_notes || '';
        } else if (newStatusPriority === currentStatusPriority && characters[j].status_notes) {
          // Same priority but has notes - append if different
          if (characters[j].status_notes && !current.status_notes?.includes(characters[j].status_notes)) {
            current.status_notes = current.status_notes
              ? `${current.status_notes} ${characters[j].status_notes}`
              : characters[j].status_notes;
          }
        }
        used.add(j);
      }
    }

    merged.push(current);
    used.add(i);
  }

  return merged;
}

/**
 * Deduplicate locations by merging similar ones
 */
function deduplicateLocations(locations: ParsedLocation[]): ParsedLocation[] {
  const merged: ParsedLocation[] = [];
  const used = new Set<number>();

  for (let i = 0; i < locations.length; i++) {
    if (used.has(i)) continue;

    const current = { ...locations[i] };

    // Find similar locations
    for (let j = i + 1; j < locations.length; j++) {
      if (used.has(j)) continue;

      const similarity = stringSimilarity(current.name, locations[j].name);
      if (similarity > 0.7) {
        // Merge location j into current
        if (locations[j].description && !current.description.includes(locations[j].description)) {
          current.description = current.description
            ? `${current.description} ${locations[j].description}`
            : locations[j].description;
        }
        if (locations[j].significance && !current.significance) {
          current.significance = locations[j].significance;
        }
        used.add(j);
      }
    }

    merged.push(current);
    used.add(i);
  }

  return merged;
}

/**
 * Deduplicate plot events by merging similar ones
 */
function deduplicatePlotEvents(events: ParsedPlotEvent[]): ParsedPlotEvent[] {
  const merged: ParsedPlotEvent[] = [];
  const used = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (used.has(i)) continue;

    const current = { ...events[i] };

    // Find similar events
    for (let j = i + 1; j < events.length; j++) {
      if (used.has(j)) continue;

      const similarity = stringSimilarity(current.title, events[j].title);
      if (similarity > 0.8) {
        // Merge event j into current - prefer longer descriptions
        if (events[j].description.length > current.description.length) {
          current.description = events[j].description;
        }
        if (events[j].event_type && events[j].event_type !== 'plot_event') {
          current.event_type = events[j].event_type;
        }
        used.add(j);
      }
    }

    merged.push(current);
    used.add(i);
  }

  return merged;
}

/**
 * Phase 2: Consolidate multiple chunk synopses into a single comprehensive synopsis.
 * Takes all mini-synopses from individual chunks and sends them to AI to produce
 * a coherent, complete synopsis of 800-1500 words covering the entire novel.
 */
async function consolidateSynopsis(
  synopses: string[],
  language: 'it' | 'en',
  provider: any
): Promise<string> {
  const isItalian = language === 'it';

  // If only one synopsis, still consolidate to expand it
  const numberedSynopses = synopses
    .map((s, i) => `--- ${isItalian ? 'Sezione' : 'Section'} ${i + 1}/${synopses.length} ---\n${s}`)
    .join('\n\n');

  const systemPrompt = isItalian
    ? `Sei un esperto analista letterario. Il tuo compito è comporre una sinossi unica, completa e coerente di un romanzo partendo dalle sinossi parziali di diverse sezioni del testo. La sinossi finale deve essere di 800-1500 parole, scritta in modo fluido e narrativo, coprendo tutta la trama dall'inizio alla fine.`
    : `You are an expert literary analyst. Your task is to compose a single, complete, and coherent synopsis of a novel based on partial synopses from different sections of the text. The final synopsis must be 800-1500 words, written in a fluid and narrative style, covering the entire plot from beginning to end.`;

  const userPrompt = isItalian
    ? `Di seguito trovi le sinossi parziali estratte da diverse sezioni di un romanzo, in ordine sequenziale. Componi una sinossi unica, completa e coerente che:

1. Copra TUTTA la trama dall'inizio alla fine del romanzo
2. Includa i personaggi chiave e le loro evoluzioni
3. Descriva i temi centrali dell'opera
4. Sia scritta in modo fluido e narrativo (non come elenco puntato)
5. Sia lunga 800-1500 parole
6. Mantenga l'ordine cronologico degli eventi

SINOSSI PARZIALI:

${numberedSynopses}

Scrivi SOLO la sinossi consolidata, senza titoli, intestazioni o commenti aggiuntivi.`
    : `Below you will find partial synopses extracted from different sections of a novel, in sequential order. Compose a single, complete, and coherent synopsis that:

1. Covers the ENTIRE plot from beginning to end of the novel
2. Includes the key characters and their development
3. Describes the central themes of the work
4. Is written in a fluid, narrative style (not as bullet points)
5. Is 800-1500 words long
6. Maintains the chronological order of events

PARTIAL SYNOPSES:

${numberedSynopses}

Write ONLY the consolidated synopsis, without titles, headers, or additional comments.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  console.log(`[NovelAnalysis] Consolidating ${synopses.length} mini-synopses into comprehensive synopsis (${language})`);

  const response = await provider.chat(messages, {
    temperature: 0.4,
    maxTokens: 7000 // Allow 6000-8000 range for full 800-1500 word synopsis
  });

  const consolidated = response.content.trim();
  const wordCount = consolidated.split(/\s+/).length;
  console.log(`[NovelAnalysis] Consolidated synopsis: ${consolidated.length} chars, ~${wordCount} words`);

  return consolidated;
}

/**
 * Phase 3: Consolidate character final status using the full synopsis.
 * Individual chunks cannot determine a character's final fate because they only see
 * a portion of the story. This function sends the complete synopsis + character list
 * to the AI to determine the definitive final status of each character.
 */
async function consolidateCharacterStatus(
  characters: ParsedCharacter[],
  synopsis: string,
  language: 'it' | 'en',
  provider: any
): Promise<Array<{ name: string; status_at_end: string; status_notes: string }>> {
  const characterNames = characters.map(c => c.name).join(', ');

  const isItalian = language === 'it';

  const systemPrompt = isItalian
    ? `Sei un esperto analista letterario. Il tuo compito è determinare lo stato finale di ogni personaggio alla fine della storia.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.`
    : `You are an expert literary analyst. Your task is to determine the final status of each character at the end of the story.
Respond ONLY with valid JSON, no additional text.`;

  const userPrompt = isItalian
    ? `Basandoti sulla seguente sinossi completa di un romanzo, determina lo stato finale di ciascun personaggio.

SINOSSI COMPLETA:
"""
${synopsis}
"""

PERSONAGGI DA VALUTARE: ${characterNames}

Per ciascun personaggio, determina:
- "status_at_end": uno tra "alive" (vivo alla fine), "dead" (morto durante la storia), "injured" (ferito/menomato alla fine), "missing" (scomparso/disperso), "unknown" (non è chiaro dal testo)
- "status_notes": una breve nota in italiano che spiega lo stato (es: "Muore nella battaglia finale", "Sopravvive ma perde un braccio", "Scompare nel capitolo 8 e non viene più menzionato")

IMPORTANTE:
- Analizza ATTENTAMENTE la sinossi per capire cosa succede a ogni personaggio
- Se un personaggio muore, ferito gravemente o scompare, è fondamentale indicarlo
- Se dalla sinossi non emerge chiaramente cosa succede al personaggio, usa "alive" se sembra partecipare attivamente alla fine, oppure "unknown" se non viene più menzionato
- Preferisci "alive" a "unknown" quando il personaggio è attivo nelle scene finali

Rispondi con JSON:
{
  "characters": [
    { "name": "Nome", "status_at_end": "alive|dead|injured|missing|unknown", "status_notes": "Nota sullo stato" }
  ]
}`
    : `Based on the following complete synopsis of a novel, determine the final status of each character.

COMPLETE SYNOPSIS:
"""
${synopsis}
"""

CHARACTERS TO EVALUATE: ${characterNames}

For each character, determine:
- "status_at_end": one of "alive" (alive at the end), "dead" (dies during the story), "injured" (injured/maimed at the end), "missing" (disappeared/missing), "unknown" (unclear from the text)
- "status_notes": a brief note explaining the status (e.g., "Dies in the final battle", "Survives but loses an arm", "Disappears in chapter 8 and is never mentioned again")

IMPORTANT:
- Carefully analyze the synopsis to understand what happens to each character
- If a character dies, is seriously injured, or disappears, it is crucial to indicate this
- If the synopsis does not clearly show what happens to the character, use "alive" if they seem active at the end, or "unknown" if they are not mentioned again
- Prefer "alive" over "unknown" when the character is active in the final scenes

Respond with JSON:
{
  "characters": [
    { "name": "Name", "status_at_end": "alive|dead|injured|missing|unknown", "status_notes": "Status note" }
  ]
}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await provider.chat(messages, {
    temperature: 0.2,
    maxTokens: 4000
  });

  // Parse response
  let jsonStr = response.content;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonStr);
  const results = (parsed.characters || []).map((c: any) => ({
    name: String(c.name || '').trim(),
    status_at_end: ['alive', 'dead', 'injured', 'missing', 'unknown'].includes(String(c.status_at_end || '').trim().toLowerCase())
      ? String(c.status_at_end).trim().toLowerCase()
      : 'unknown',
    status_notes: String(c.status_notes || '').trim()
  }));

  console.log(`[NovelAnalysis] Character status consolidation returned ${results.length} results`);
  return results;
}

/**
 * Main function to analyze a novel using AI
 */
async function analyzeNovelWithAI(
  novelContent: string,
  userId: string,
  language: 'it' | 'en'
): Promise<ParsedAnalysis> {
  // Get AI provider for user
  const provider = getProviderForUser(userId);

  if (!provider) {
    throw new Error('No AI provider available. Please configure an AI provider in your settings.');
  }

  console.log(`[NovelAnalysis] Using ${provider.getProviderType()} provider for analysis in ${language}`);

  // Split into chunks if necessary
  const chunks = chunkTextForAnalysis(novelContent);
  console.log(`[NovelAnalysis] Split into ${chunks.length} chunk(s)`);

  // Analyze each chunk
  const allAnalyses: ParsedAnalysis[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[NovelAnalysis] Analyzing chunk ${i + 1}/${chunks.length}`);

    try {
      const prompts = buildNovelAnalysisPrompt(chunks[i], language);

      const messages: ChatMessage[] = [
        { role: 'system', content: prompts.systemPrompt },
        { role: 'user', content: prompts.userPrompt }
      ];

      const response = await provider.chat(messages, {
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 4000
      });

      // Log raw AI response for debugging (first 500 chars)
      console.log(`[NovelAnalysis] Chunk ${i + 1} raw AI response (first 500 chars):`, response.content.substring(0, 500));

      const parsed = parseNovelAnalysisResponse(response.content);
      console.log(`[NovelAnalysis] Chunk ${i + 1} extracted: ${parsed.characters.length} characters, ${parsed.locations.length} locations, ${parsed.plotEvents.length} events, synopsis: ${parsed.synopsis.length} chars`);

      allAnalyses.push(parsed);
    } catch (chunkError) {
      console.error(`[NovelAnalysis] Error analyzing chunk ${i + 1}:`, chunkError);
      // Continue with other chunks
    }
  }

  if (allAnalyses.length === 0) {
    throw new Error('Failed to analyze any text chunks. Please check your AI provider configuration.');
  }

  // Consolidate results from all chunks
  const allCharacters = allAnalyses.flatMap(a => a.characters);
  const allLocations = allAnalyses.flatMap(a => a.locations);
  const allEvents = allAnalyses.flatMap(a => a.plotEvents);
  // Collect all synopsis parts from individual chunks
  const allSynopses = allAnalyses.map(a => a.synopsis).filter(s => s.length > 0);

  // Debug: log synopsis status from all chunks
  console.log(`[NovelAnalysis] Synopsis consolidation: ${allAnalyses.length} chunks analyzed, ${allSynopses.length} chunks returned synopsis`);
  allAnalyses.forEach((a, idx) => {
    console.log(`[NovelAnalysis] Chunk ${idx + 1} synopsis length: ${a.synopsis.length}`);
  });

  // Phase 2: Consolidate all mini-synopses into a comprehensive synopsis (800-1500 words)
  let bestSynopsis = '';
  if (allSynopses.length > 0) {
    // Fallback: longest single synopsis (used if consolidation fails)
    const longestSynopsis = allSynopses.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    , '');

    if (allSynopses.length >= 2) {
      // Multiple chunks: use AI to consolidate into a comprehensive synopsis
      try {
        console.log(`[NovelAnalysis] Phase 2: Consolidating ${allSynopses.length} mini-synopses via AI...`);
        bestSynopsis = await consolidateSynopsis(allSynopses, language, provider);
        console.log(`[NovelAnalysis] Phase 2 SUCCESS: Consolidated synopsis ${bestSynopsis.length} chars (~${bestSynopsis.split(/\s+/).length} words)`);
      } catch (consolidationError) {
        console.warn(`[NovelAnalysis] Phase 2 FALLBACK: Consolidation failed, using longest single synopsis.`, consolidationError);
        bestSynopsis = longestSynopsis;
      }
    } else {
      // Single chunk: use the only available synopsis directly
      console.log(`[NovelAnalysis] Single chunk - using synopsis directly (${longestSynopsis.length} chars)`);
      bestSynopsis = longestSynopsis;
    }
  }

  console.log(`[NovelAnalysis] Before deduplication: ${allCharacters.length} characters, ${allLocations.length} locations, ${allEvents.length} events`);
  if (bestSynopsis) {
    console.log(`[NovelAnalysis] Final synopsis: ${bestSynopsis.length} chars (~${bestSynopsis.split(/\s+/).length} words)`);
  } else {
    console.warn(`[NovelAnalysis] WARNING: No synopsis extracted from any chunk!`);
  }

  // Deduplicate and merge
  const dedupedCharacters = deduplicateCharacters(allCharacters);
  const dedupedLocations = deduplicateLocations(allLocations);
  const dedupedEvents = deduplicatePlotEvents(allEvents);

  console.log(`[NovelAnalysis] After deduplication: ${dedupedCharacters.length} characters, ${dedupedLocations.length} locations, ${dedupedEvents.length} events`);

  // Phase 3: Consolidate character final status using the full synopsis
  // Each chunk only sees a portion of the story, so individual chunks cannot determine
  // if a character dies/is injured at the end. We use the consolidated synopsis + character list
  // to ask AI for the definitive final status of each character.
  if (bestSynopsis && dedupedCharacters.length > 0) {
    try {
      console.log(`[NovelAnalysis] Phase 3: Consolidating character final status via AI...`);
      const updatedCharacters = await consolidateCharacterStatus(dedupedCharacters, bestSynopsis, language, provider);
      // Update dedupedCharacters with the consolidated status
      for (const updated of updatedCharacters) {
        const match = dedupedCharacters.find(c => normalizeName(c.name) === normalizeName(updated.name));
        if (match) {
          match.status_at_end = updated.status_at_end;
          match.status_notes = updated.status_notes;
        }
      }
      const nonUnknown = dedupedCharacters.filter(c => c.status_at_end && c.status_at_end !== 'unknown').length;
      console.log(`[NovelAnalysis] Phase 3 SUCCESS: ${nonUnknown}/${dedupedCharacters.length} characters have definitive status`);
    } catch (statusError) {
      console.warn(`[NovelAnalysis] Phase 3 FALLBACK: Character status consolidation failed, keeping chunk-level status.`, statusError);
    }
  }

  console.log(`[NovelAnalysis] Final results: ${dedupedCharacters.length} characters, ${dedupedLocations.length} locations, ${dedupedEvents.length} events`);

  return {
    synopsis: bestSynopsis,
    characters: dedupedCharacters,
    locations: dedupedLocations,
    plotEvents: dedupedEvents
  };
}

// Helper function to extract entities using simple pattern matching
// In production, this would use AI for more accurate extraction
// Supports both English and Italian text patterns
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

  // Common words to exclude from character detection (articles, prepositions, etc.)
  const excludeWords = new Set([
    // English
    'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'What', 'Which', 'Who', 'When', 'Where', 'Why', 'How',
    'In', 'On', 'At', 'To', 'For', 'Of', 'With', 'By', 'From', 'Up', 'Down', 'Out', 'Over', 'Under',
    'He', 'She', 'It', 'They', 'We', 'You', 'I', 'His', 'Her', 'Its', 'Their', 'Our', 'Your', 'My',
    'But', 'And', 'Or', 'Nor', 'So', 'Yet', 'Both', 'Either', 'Neither',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
    // Italian
    'Il', 'Lo', 'La', 'Gli', 'Le', 'Un', 'Uno', 'Una', 'Questo', 'Questa', 'Quello', 'Quella',
    'In', 'A', 'Da', 'Per', 'Di', 'Con', 'Su', 'Tra', 'Fra', 'Verso', 'Attraverso',
    'Lui', 'Lei', 'Essi', 'Esse', 'Noi', 'Voi', 'Io', 'Suo', 'Sua', 'Loro', 'Nostro', 'Nostra', 'Vostro', 'Vostra', 'Mio', 'Mia',
    'Ma', 'E', 'Ed', 'O', 'Oppure', 'Però', 'Dunque', 'Quindi', 'Perciò',
    'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica',
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
    'Quando', 'Dove', 'Come', 'Perché', 'Chi', 'Quale', 'Cosa', 'Quanto'
  ]);

  // Extract potential character names (capitalized words followed by action/dialogue verbs)
  // English: said, asked, replied, thought, walked, ran, looked, felt
  // Italian: disse, chiese, rispose, pensò, camminò, corse, guardò, sentì
  // Also include common verb endings in Italian (accented forms)
  const characterPattern = /\b([A-Z][a-zàèéìòù]+)\s+(said|asked|replied|thought|walked|ran|looked|felt|disse|chiese|rispose|pensò|pensarono|camminò|corse|guardò|guardarono|sentì|sentirono|rispose|esclamò|mormorò|sussurrò|gridò|urlò|aggiunse|continuò|osservò|notò|vide|videro|udì|affermò|confessò|spiegò|domandò|rispose|scattò|sorride|sorrise|sospirò|scosse|annuì| Scrollò|alzò|abbassò|strinse|aprì|chiuse)\b/gi;
  const characterMatches = new Set();
  let match;
  while ((match = characterPattern.exec(novelContent)) !== null) {
    const name = match[1];
    // Only add if not in exclude list
    if (!excludeWords.has(name)) {
      characterMatches.add(name);
    }
  }

  // Also try pattern for Italian dialogue (Nome: "dialogo" or - Nome, - dialogo)
  const italianDialoguePattern = /(?:^|\n)\s*[-–—]?\s*([A-Z][a-zàèéìòù]+)\s*[,:]|\b([A-Z][a-zàèéìòù]+)\s+disse\s*:|\b([A-Z][a-zàèéìòù]+)\s+esclamò\s*:/gm;
  while ((match = italianDialoguePattern.exec(novelContent)) !== null) {
    const name = match[1] || match[2] || match[3];
    if (name && !excludeWords.has(name)) {
      characterMatches.add(name);
    }
  }

  // Convert to character objects
  characterMatches.forEach((name: any) => {
    characters.push({
      name,
      description: `Personaggio estratto dal romanzo caricato`,
      traits: '',
      backstory: '',
      role_in_story: 'Personaggio'
    });
  });

  // Extract locations (words following prepositions)
  // English: in, at, to
  // Italian: in, a, da, verso, dentro, fuori, presso, presso
  const locationPattern = /\b(?:in|at|to|a|da|verso|dentro|fuori|presso|attraverso)\s+([A-Z][a-zàèéìòù]+(?:\s+[A-Z][a-zàèéìòù]+)?)\b/g;
  const locationMatches = new Set();
  while ((match = locationPattern.exec(novelContent)) !== null) {
    const location = match[1];
    // Exclude common non-location words
    if (!excludeWords.has(location) && !excludeWords.has(location.split(' ')[0])) {
      locationMatches.add(location);
    }
  }

  // Also look for specific location indicators (Italian: "città di", "paese di", "castello di")
  const locationIndicators = /\b(?:città|paese|villaggio|castello|palazzo|chiesa|foresta|bosco|montagna|fiume|lago|mare|isola|regno|casa|villa|giardino|piazza|strada|via)\s+(?:di|del|della|dei|degli)\s+([A-Z][a-zàèéìòù]+)/gi;
  while ((match = locationIndicators.exec(novelContent)) !== null) {
    locationMatches.add(match[1]);
  }

  // Convert to location objects (limit to reasonable number)
  locationMatches.forEach((name: any) => {
    if (locations.length < 20) {
      locations.push({
        name,
        description: `Luogo estratto dal romanzo caricato`,
        significance: 'Ambientazione'
      });
    }
  });

  // Extract plot events (sentences with action/dramatic verbs)
  // English: discovered, realized, found, lost, won, escaped, died, fought, kissed, married, betrayed, saved
  // Italian: scoprì, realizzò, trovò, perse, vinse, fuggì, morì, combatté, baciò, sposò, tradì, salvò
  // Also accept sentences ending with . or ! or ?
  const eventPattern = /([A-Z][^.!?\n]*?\b(?:discovered|realized|found|lost|won|escaped|died|fought|kissed|married|betrayed|saved|scoprì|scoprirono|realizzò|capì|trovò|perse|vinse|fuggì|morì|combatté|baciò|sposò|tradì|salvò|uccise|ferì|amò|odiarono|incontrò|lasciò|arrivò|partì|tornò|entrò|uscì|cadde|salì|discese|presero|fuggirono|morirono|vinsero|persero|amarono)\b[^.!?\n]*[.!?\n])/gi;
  while ((match = eventPattern.exec(novelContent)) !== null) {
    if (plotEvents.length < 30) {
      const sentence = match[1].trim();
      plotEvents.push({
        title: sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''),
        description: sentence,
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
    // Get language parameter from request body (form field), default to Italian
    const language = (req.body.language === 'en' ? 'en' : 'it') as 'it' | 'en';

    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    console.log('[Projects] Analyzing novel file:', file.originalname, 'size:', file.size, 'type:', file.mimetype, 'language:', language);

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

    // Use AI-based analysis (Feature #249)
    let characters: Array<{ name: string; description: string; traits: string; backstory: string; role_in_story: string; relationships?: ParsedRelationship[]; status_at_end?: string; status_notes?: string }>;
    let locations: Array<{ name: string; description: string; significance: string }>;
    let plotEvents: Array<{ title: string; description: string; event_type: string }>;
    let synopsis = '';

    try {
      const aiResult = await analyzeNovelWithAI(novelContent, userId || '', language);
      characters = aiResult.characters;
      locations = aiResult.locations;
      plotEvents = aiResult.plotEvents;
      synopsis = aiResult.synopsis;
      console.log('[Projects] AI analysis extracted', characters.length, 'characters,', locations.length, 'locations,', plotEvents.length, 'plot events, synopsis:', synopsis.length, 'chars');
    } catch (aiError) {
      console.error('[Projects] AI analysis failed, falling back to regex:', aiError);
      // Fall back to regex-based extraction if AI fails
      const regexResult = extractEntities(novelContent);
      characters = regexResult.characters;
      locations = regexResult.locations;
      plotEvents = regexResult.plotEvents;
      synopsis = '';
      console.log('[Projects] Regex fallback extracted', characters.length, 'characters,', locations.length, 'locations,', plotEvents.length, 'plot events');
    }

    // Clear existing extracted entities for this project
    db.prepare('DELETE FROM characters WHERE project_id = ? AND extracted_from_upload = 1').run(projectId);
    db.prepare('DELETE FROM locations WHERE project_id = ? AND extracted_from_upload = 1').run(projectId);
    db.prepare('DELETE FROM plot_events WHERE project_id = ? AND extracted_from_upload = 1').run(projectId);

    // Insert extracted characters (two-pass: first insert, then resolve relationships)
    let charactersCreated = 0;
    // Map character name -> generated UUID for relationship resolution
    const charNameToId: Map<string, string> = new Map();
    const charInsertData: Array<{ id: string; character: typeof characters[0] }> = [];

    // Pass 1: Insert characters with empty relationships
    for (const character of characters) {
      try {
        const characterId = uuidv4();
        db.prepare(
          `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, '[]', ?, ?, 1, datetime('now'), datetime('now'))`
        ).run(
          characterId,
          projectId,
          character.name,
          character.description,
          character.traits,
          character.backstory,
          character.role_in_story,
          character.status_at_end || 'unknown',
          character.status_notes || ''
        );
        charNameToId.set(normalizeName(character.name), characterId);
        charInsertData.push({ id: characterId, character });
        charactersCreated++;
      } catch (err) {
        // Skip duplicates
        console.warn('[Projects] Failed to insert character:', character.name, err);
      }
    }

    // Pass 2: Resolve and save relationships using character IDs
    for (const { id: fromCharId, character } of charInsertData) {
      if (!character.relationships || character.relationships.length === 0) continue;

      const resolvedRelationships = [];
      for (const rel of character.relationships) {
        // Find the target character ID by normalized name matching
        let targetId: string | undefined;
        const normalizedRelName = normalizeName(rel.relatedTo);

        // Try exact match first
        targetId = charNameToId.get(normalizedRelName);

        // Try partial match if exact didn't work
        if (!targetId) {
          for (const [name, cId] of charNameToId.entries()) {
            if (name.includes(normalizedRelName) || normalizedRelName.includes(name)) {
              targetId = cId;
              break;
            }
          }
        }

        if (targetId && targetId !== fromCharId) {
          resolvedRelationships.push({
            characterId: fromCharId,
            relatedCharacterId: targetId,
            relationshipType: rel.type || 'ally'
          });
        }
      }

      if (resolvedRelationships.length > 0) {
        try {
          db.prepare('UPDATE characters SET relationships_json = ? WHERE id = ?').run(
            JSON.stringify(resolvedRelationships),
            fromCharId
          );
          console.log(`[Projects] Saved ${resolvedRelationships.length} relationships for character "${character.name}"`);
        } catch (err) {
          console.warn('[Projects] Failed to update relationships for:', character.name, err);
        }
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
          plotEventsCreated,
          event.event_type
        );
        plotEventsCreated++;
      } catch (err) {
        console.warn('[Projects] Failed to insert plot event:', event.title, err);
      }
    }

    // Save synopsis to project if generated
    console.log('[Projects] Synopsis to save:', synopsis ? `${synopsis.length} chars` : 'EMPTY');
    if (synopsis) {
      try {
        db.prepare('UPDATE projects SET synopsis = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(synopsis, projectId, userId);
        console.log('[Projects] Synopsis saved to project successfully');
      } catch (synopsisErr) {
        console.warn('[Projects] Failed to save synopsis:', synopsisErr);
      }
    } else {
      console.warn('[Projects] Synopsis is empty, not saving to database');
    }

    console.log('[Projects] Novel analysis completed:', {
      characters: charactersCreated,
      locations: locationsCreated,
      plotEvents: plotEventsCreated,
      synopsis: synopsis ? 'generated' : 'none'
    });

    res.json({
      message: 'Novel analyzed successfully',
      extracted: {
        characters: charactersCreated,
        locations: locationsCreated,
        plotEvents: plotEventsCreated,
        synopsis: synopsis ? true : false
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
    // Also get user's preferred_language for localization
    const project = db.prepare(`
      SELECT p.id, p.title, p.area, p.settings_json, p.genre, p.tone, p.target_audience, p.pov, p.word_count_target,
             u.preferred_language
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.user_id = ?
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
      preferred_language: string;
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

    // Get user's preferred language (default to Italian for backward compatibility)
    const userLang = project.preferred_language || 'it';

    // Story structure templates based on genre - localized for IT and EN
    const genreStructuresLocalized: Record<string, Record<string, string[]>> = {
      fantasy: {
        en: [
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
        it: [
          'Il Risveglio',
          'La Chiamata all\'Avventura',
          'Oltre la Soglia',
          'La Prima Prova',
          'Alleati e Nemici',
          'La Foresta Oscura',
          'La Rivelazione',
          'La Perdita',
          'Lo Scontro Finale',
          'Risoluzione'
        ]
      },
      romance: {
        en: [
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
        it: [
          'L\'Incontro',
          'Prime Impressioni',
          'Avvicinamento',
          'L\'Ostacolo',
          'Malintesi',
          'Il Rivale',
          'Il Cuore Spezzato',
          'La Consapevolezza',
          'Il Grande Gesto',
          'Per Sempre'
        ]
      },
      thriller: {
        en: [
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
        it: [
          'Il Crimine',
          'L\'Indagine Inizia',
          'Primi Indizi',
          'La Falsa Pista',
          'Le Stakes Salgono',
          'Un Brivido Vicino',
          'La Svolta',
          'La Trappola',
          'Confronto',
          'Giustizia'
        ]
      },
      mystery: {
        en: [
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
        it: [
          'La Scoperta',
          'Raccolta Prove',
          'Interrogatori',
          'Segreti Rivelati',
          'Il Secondo Corpo',
          'Collegare i Punti',
          'L\'Accusa',
          'L\'Alibi',
          'La Verità',
          'Caso Chiuso'
        ]
      },
      scifi: {
        en: [
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
        it: [
          'La Scoperta',
          'L\'Esperimento',
          'Qualcosa va Storto',
          'Il Nuovo Mondo',
          'Primo Contatto',
          'Il Conflitto',
          'Il Viaggio',
          'Il Sacrificio',
          'Il Ritorno',
          'Un Nuovo Inizio'
        ]
      },
      historical: {
        en: [
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
        it: [
          'Scena Storica',
          'Il Catalizzatore',
          'La Guerra Dichiarata',
          'Il Fronte Domestico',
          'La Battaglia',
          'Le Conseguenze',
          'Perdita Personale',
          'Il Vento Gira',
          'Vittoria',
          'Ricostruzione'
        ]
      },
      default: {
        en: [
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
        ],
        it: [
          'Introduzione',
          'Incidente Scatenante',
          'Azione Crescente',
          'Primo Punto di Svolta',
          'Il Viaggio',
          'Il Punto Medio',
          'Complicazioni',
          'Il Climax',
          'Azione Discendente',
          'Risoluzione'
        ]
      }
    };

    // Get chapter titles based on genre and language
    const genre = (project.genre || 'default').toLowerCase();
    const genreStructure = genreStructuresLocalized[genre as keyof typeof genreStructuresLocalized] || genreStructuresLocalized.default;
    const chapterTitles = genreStructure[userLang as keyof typeof genreStructure] || genreStructure.en;

    // Generate chapter summaries based on tone - localized
    const toneAdjectives: Record<string, Record<string, string>> = {
      dark: { en: 'ominous', it: 'ominoso' },
      light: { en: 'hopeful', it: 'speranzoso' },
      serious: { en: 'grave', it: 'serio' },
      humorous: { en: 'witty', it: 'spiritoso' },
      dramatic: { en: 'intense', it: 'intenso' },
      romantic: { en: 'passionate', it: 'appassionato' }
    };

    const toneKey = (project.tone || 'dramatic').toLowerCase() as keyof typeof toneAdjectives;
    const tone = toneAdjectives[toneKey] ? toneAdjectives[toneKey][userLang as keyof typeof toneAdjectives['dark']] : (userLang === 'it' ? 'coinvolgente' : 'engaging');

    // Localized summary templates
    const summaryTemplates = {
      en: {
        first: (toneAdj: string) => `Introduce the main character and their world. Establish the ${toneAdj} tone and the central conflict that will drive the narrative forward.`,
        midpoint: () => `The midpoint of the story. A major revelation or plot twist shifts the direction of the narrative. The stakes are raised significantly.`,
        last: (genreName: string) => `The conclusion. All plot threads are resolved. The character arc completes, and the thematic elements of the ${genreName || 'story'} find fulfillment.`,
        middle: (toneAdj: string) => `Develop the narrative with ${toneAdj} pacing. Advance both plot and character development while building tension toward the story's climax.`
      },
      it: {
        first: (toneAdj: string) => `Introduci il personaggio principale e il suo mondo. Stabilisci il tono ${toneAdj} e il conflitto centrale che guiderà la narrazione in avanti.`,
        midpoint: () => `Il punto medio della storia. Una rivelazione importante o un colpo di scena cambia la direzione della narrazione. Le poste in gioco aumentano significativamente.`,
        last: (genreName: string) => `La conclusione. Tutti i fili della trama vengono risolti. L'arco del personaggio si completa e gli elementi tematici del ${genreName || 'racconto'} trovano compimento.`,
        middle: (toneAdj: string) => `Sviluppa la narrazione con un ritmo ${toneAdj}. Fai avanzare sia la trama che lo sviluppo del personaggio, costruendo tensione verso il climax della storia.`
      }
    };

    const templates = summaryTemplates[userLang as keyof typeof summaryTemplates] || summaryTemplates.en;

    // Generate outline chapters
    for (let i = 0; i < numChapters; i++) {
      const titleIndex = i % chapterTitles.length;
      const title = chapterTitles[titleIndex];
      const chapterNum = i + 1;

      // Generate contextual summary
      let summary = '';
      if (i === 0) {
        summary = templates.first(tone);
      } else if (i === Math.floor(numChapters / 2)) {
        summary = templates.midpoint();
      } else if (i === numChapters - 1) {
        summary = templates.last(project.genre || '');
      } else {
        summary = templates.middle(tone);
      }

      chapters.push({ title, summary });
    }

    // Localized content templates
    const contentTemplates = {
      en: {
        outlineSummary: 'Outline Summary',
        notes: 'Notes',
        notesContent: (toneAdj: string) => `Write this chapter focusing on character development and advancing the main plot. Use the ${toneAdj} tone established in the project settings.`,
        targetWordCount: (words: number) => `Target word count: ${words} words`
      },
      it: {
        outlineSummary: 'Riassunto dell\'Indice',
        notes: 'Note',
        notesContent: (toneAdj: string) => `Scrivi questo capitolo concentrandoti sullo sviluppo del personaggio e sull'avanzamento della trama principale. Usa il tono ${toneAdj} stabilito nelle impostazioni del progetto.`,
        targetWordCount: (words: number) => `Numero di parole obiettivo: ${words} parole`
      }
    };

    const contentTmpl = contentTemplates[userLang as keyof typeof contentTemplates] || contentTemplates.en;

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

        // Build localized chapter content
        const chapterContent = `# ${title}\n\n**${contentTmpl.outlineSummary}:**\n${summary}\n\n**${contentTmpl.notes}:**\n${contentTmpl.notesContent(tone)}\n\n${contentTmpl.targetWordCount(avgChapterWords)}`;

        db.prepare(
          `INSERT INTO chapters (id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
        ).run(
          chapterId,
          projectId,
          title,
          chapterContent,
          summary || '',
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

// ============================================================================
// POST /api/projects/:id/generate/sequel-outline - Generate Sequel Outline (Feature #260)
// Generates chapters for a sequel project based on the previous novel in the saga
// ============================================================================

interface SequelOutlineRequestBody {
  language?: 'it' | 'en';
  numChapters?: number;
}

// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/generate/sequel-outline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const sequelProjectId = req.params.id;
    const { language = 'it', numChapters = 10 } = req.body as SequelOutlineRequestBody;

    console.log('[Projects] Generating sequel outline for project:', sequelProjectId);

    // Fetch the sequel project
    const sequelProject = db.prepare(`
      SELECT p.id, p.title, p.area, p.saga_id, p.genre, p.tone, p.target_audience, p.pov,
             p.word_count_target, p.description, u.preferred_language
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.user_id = ?
    `).get(sequelProjectId, userId) as {
      id: string;
      title: string;
      area: string;
      saga_id: string | null;
      genre: string;
      tone: string;
      target_audience: string;
      pov: string;
      word_count_target: number;
      description: string;
      preferred_language: string;
    } | undefined;

    if (!sequelProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (sequelProject.area !== 'romanziere') {
      res.status(400).json({ message: 'Sequel outline generation is only available for Romanziere projects' });
      return;
    }

    if (!sequelProject.saga_id) {
      res.status(400).json({ message: 'This project is not part of a saga. Sequel generation requires a saga.' });
      return;
    }

    // Find the previous project(s) in the saga
    const sagaProjects = db.prepare(`
      SELECT id, title, created_at, synopsis, genre, tone
      FROM projects
      WHERE saga_id = ? AND user_id = ? AND id != ?
      ORDER BY created_at ASC
    `).all(sequelProject.saga_id, userId, sequelProjectId) as Array<{
      id: string;
      title: string;
      created_at: string;
      synopsis: string | null;
      genre: string;
      tone: string;
    }>;

    if (sagaProjects.length === 0) {
      res.status(400).json({ message: 'No previous novel found in this saga. The sequel must have at least one preceding novel.' });
      return;
    }

    // Get the most recent previous project (the immediate predecessor)
    const previousProject = sagaProjects[sagaProjects.length - 1];
    console.log('[Projects] Found previous novel in saga:', previousProject.title);

    // Gather context from the previous novel
    const previousCharacters = db.prepare(`
      SELECT name, description, traits, backstory, role_in_story
      FROM characters WHERE project_id = ?
    `).all(previousProject.id) as Array<{
      name: string;
      description: string;
      traits: string;
      backstory: string;
      role_in_story: string;
    }>;

    const previousLocations = db.prepare(`
      SELECT name, description, significance
      FROM locations WHERE project_id = ?
    `).all(previousProject.id) as Array<{
      name: string;
      description: string;
      significance: string;
    }>;

    const previousPlotEvents = db.prepare(`
      SELECT title, description, event_type
      FROM plot_events WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(previousProject.id) as Array<{
      title: string;
      description: string;
      event_type: string;
    }>;

    const previousChapters = db.prepare(`
      SELECT title FROM chapters WHERE project_id = ? ORDER BY order_index
    `).all(previousProject.id) as Array<{
      title: string;
    }>;

    // Get existing characters/locations already copied to sequel
    const sequelCharacters = db.prepare(`
      SELECT name, description FROM characters WHERE project_id = ?
    `).all(sequelProjectId) as Array<{
      name: string;
      description: string;
    }>;

    const sequelLocations = db.prepare(`
      SELECT name, description FROM locations WHERE project_id = ?
    `).all(sequelProjectId) as Array<{
      name: string;
      description: string;
    }>;

    // Build AI prompt for sequel generation
    const isItalian = language === 'it';

    const characterSummaries = previousCharacters.slice(0, 15).map(c =>
      `- ${c.name}: ${c.description || 'No description'} ${c.role_in_story ? `(${c.role_in_story})` : ''}`
    ).join('\n');

    const locationSummaries = previousLocations.slice(0, 10).map(l =>
      `- ${l.name}: ${l.description || 'No description'} ${l.significance ? `- ${l.significance}` : ''}`
    ).join('\n');

    const plotSummary = previousPlotEvents.slice(0, 10).map(e =>
      `- ${e.title}: ${e.description || 'No description'}`
    ).join('\n');

    const chapterSummary = previousChapters.slice(0, 10).map((ch, idx) =>
      `Chapter ${idx + 1}: ${ch.title}`
    ).join('\n');

    const systemPrompt = isItalian
      ? `Sei un esperto scrittore e consulente editoriale specializzato in narrativa seriale.
Il tuo compito è creare un outline per il seguito di un romanzo esistente.
Devi mantenere la coerenza con i personaggi e la trama precedente, continuando la storia in modo naturale e coinvolgente.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.
Ogni capitolo deve avere un titolo contestuale (non generico) e un riassunto che colleghi al romanzo precedente.`
      : `You are an expert writer and editorial consultant specializing in serialized fiction.
Your task is to create an outline for the sequel to an existing novel.
You must maintain consistency with characters and previous plot, continuing the story naturally and engagingly.
Respond ONLY with valid JSON, without additional text.
Each chapter must have a contextual title (not generic) and a summary that links to the previous novel.`;

    const userPrompt = isItalian
      ? `Crea un outline per il sequel del seguente romanzo.

ROMANZO PRECEDENTE: "${previousProject.title}"
${previousProject.synopsis ? `SINOPSI:\n${previousProject.synopsis}\n` : ''}

PERSONAGGI DISPONIBILI PER IL SEQUEL (vivi/attivi):
${characterSummaries || 'Nessun personaggio registrato'}
${deadCharacterSummaries ? `\nPERSONAGGI MORTI NEL ROMANZO PRECEDENTE (NON devono apparire come vivi nel sequel):\n${deadCharacterSummaries}` : ''}

LUOGHI DAL ROMANZO PRECEDENTE:
${locationSummaries || 'Nessun luogo registrato'}

EVENTI DI TRAMA PRINCIPALI:
${plotSummary || 'Nessun evento registrato'}

RIASSUNTO CAPITOLI PRECEDENTI:
${chapterSummary || 'Nessun capitolo disponibile'}

TITOLO DEL SEQUEL: "${sequelProject.title}"
${sequelProject.description ? `DESCRIZIONE SEQUEL: ${sequelProject.description}\n` : ''}

Genera un outline con ${numChapters} capitoli nel seguente formato JSON:
{
  "chapters": [
    {
      "title": "Titolo del capitolo (contestuale, non generico)",
      "summary": "Riassunto di cosa accade, includendo riferimenti a personaggi e eventi del romanzo precedente",
      "returning_characters": ["Nome personaggio che ritorna"],
      "new_elements": ["Nuovi elementi introdotti in questo capitolo"],
      "connection_to_previous": "Come questo capitolo si collega al finale del romanzo precedente"
    }
  ],
  "themes_to_explore": ["Temi da esplorare nel sequel"],
  "character_arcs_to_continue": ["Archi narrativi da continuare"]
}

Sii creativo e specifico. I titoli devono essere evocativi e contestuali.
Continua la storia dal punto in cui è terminata.`
      : `Create an outline for the sequel to the following novel.

PREVIOUS NOVEL: "${previousProject.title}"
${previousProject.synopsis ? `SYNOPSIS:\n${previousProject.synopsis}\n` : ''}

CHARACTERS AVAILABLE FOR THE SEQUEL (alive/active):
${characterSummaries || 'No characters registered'}
${deadCharacterSummaries ? `\nCHARACTERS WHO DIED IN THE PREVIOUS NOVEL (must NOT appear alive in the sequel):\n${deadCharacterSummaries}` : ''}

LOCATIONS FROM PREVIOUS NOVEL:
${locationSummaries || 'No locations registered'}

MAIN PLOT EVENTS:
${plotSummary || 'No plot events registered'}

PREVIOUS CHAPTERS SUMMARY:
${chapterSummary || 'No chapters available'}

SEQUEL TITLE: "${sequelProject.title}"
${sequelProject.description ? `SEQUEL DESCRIPTION: ${sequelProject.description}\n` : ''}

Generate an outline with ${numChapters} chapters in the following JSON format:
{
  "chapters": [
    {
      "title": "Chapter title (contextual, not generic)",
      "summary": "Summary of what happens, including references to characters and events from the previous novel",
      "returning_characters": ["Name of returning character"],
      "new_elements": ["New elements introduced in this chapter"],
      "connection_to_previous": "How this chapter connects to the previous novel's ending"
    }
  ],
  "themes_to_explore": ["Themes to explore in the sequel"],
  "character_arcs_to_continue": ["Character arcs to continue"]
}

Be creative and specific. Titles should be evocative and contextual.
Continue the story from where it ended.`;

    // Get AI provider
    const provider = await getProviderForUser(userId);
    let generatedOutline: any = null;

    if (provider) {
      try {
        console.log('[Projects] Calling AI for sequel outline generation...');
        const response = await provider.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          { temperature: 0.8, maxTokens: 4000 }
        );

        // Parse JSON from response
        let jsonStr = response.content || '';
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        generatedOutline = JSON.parse(jsonStr);
        console.log('[Projects] AI generated sequel outline successfully');
      } catch (aiErr) {
        console.error('[Projects] AI sequel outline generation failed:', aiErr);
        // Fall back to template generation
      }
    }

    // Create chapters based on generated outline or fallback template
    const createdChapters: Array<{ id: string; title: string; summary: string }> = [];

    if (generatedOutline?.chapters && Array.isArray(generatedOutline.chapters)) {
      // Create chapters from AI-generated outline
      for (let i = 0; i < generatedOutline.chapters.length; i++) {
        const chapter = generatedOutline.chapters[i];
        const chapterId = uuidv4();
        const orderIndex = i;

        try {
          db.prepare(
            `INSERT INTO chapters (id, project_id, title, summary, order_index, status, word_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
          ).run(
            chapterId,
            sequelProjectId,
            chapter.title || `Chapter ${i + 1}`,
            chapter.summary || '',
            orderIndex
          );

          createdChapters.push({
            id: chapterId,
            title: chapter.title || `Chapter ${i + 1}`,
            summary: chapter.summary || ''
          });
        } catch (insertErr) {
          console.warn('[Projects] Failed to insert chapter:', chapter.title, insertErr);
        }
      }
    } else {
      // Fallback: Create template-based chapters
      const fallbackTitles = isItalian
        ? ['Il Risveglio', 'Ombre del Passato', 'La Scoperta', 'Nuove Alleanze', 'Il Conflitto', 'La Rivelazione', 'Il Sacrificio', 'La Battaglia', 'La Rinascita', 'Il Nuovo Inizio']
        : ['The Awakening', 'Shadows of the Past', 'The Discovery', 'New Alliances', 'The Conflict', 'The Revelation', 'The Sacrifice', 'The Battle', 'The Rebirth', 'A New Beginning'];

      const numChaptersToCreate = Math.min(numChapters, fallbackTitles.length);

      for (let i = 0; i < numChaptersToCreate; i++) {
        const chapterId = uuidv4();
        const title = fallbackTitles[i];
        const summary = isItalian
          ? `Capitolo ${i + 1} del sequel di "${previousProject.title}"`
          : `Chapter ${i + 1} of the sequel to "${previousProject.title}"`;

        try {
          db.prepare(
            `INSERT INTO chapters (id, project_id, title, summary, order_index, status, word_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
          ).run(chapterId, sequelProjectId, title, summary, i);

          createdChapters.push({ id: chapterId, title, summary });
        } catch (insertErr) {
          console.warn('[Projects] Failed to insert fallback chapter:', title, insertErr);
        }
      }
    }

    console.log('[Projects] Sequel outline generation completed:', {
      sequelProjectId,
      previousProjectTitle: previousProject.title,
      totalChapters: createdChapters.length,
      aiGenerated: !!generatedOutline
    });

    res.json({
      message: 'Sequel outline generated successfully',
      outline: {
        previous_novel: previousProject.title,
        total_chapters: createdChapters.length,
        chapters: createdChapters,
        themes: generatedOutline?.themes_to_explore || [],
        character_arcs: generatedOutline?.character_arcs_to_continue || []
      },
      created: createdChapters.length,
      aiGenerated: !!generatedOutline
    });
  } catch (error) {
    console.error('[Projects] Generate sequel outline error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to generate sequel outline' });
  }
});

// POST /api/projects/:id/detect-plot-holes - Detect plot holes and inconsistencies (Feature #182, #277)
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/detect-plot-holes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    // Get language from request body or Accept-Language header (default to 'it')
    const language: Language = req.body?.language ||
                 (req.headers['accept-language']?.startsWith('en') ? 'en' : 'it') as Language;

    console.log('[Projects] Detecting plot holes for project:', projectId, 'language:', language);

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
    const characters = db.prepare('SELECT name, description, status_at_end FROM characters WHERE project_id = ?').all(projectId) as Array<{ name: string; description: string; status_at_end: string | null }>;
    const locations = db.prepare('SELECT name, description FROM locations WHERE project_id = ?').all(projectId) as Array<{ name: string; description: string }>;
    const plotEvents = db.prepare('SELECT title, description, chapter_id FROM plot_events WHERE project_id = ?').all(projectId) as Array<{ title: string; description: string; chapter_id: string | null }>;

    // Feature #277: Try AI-powered analysis first
    let plotHoles: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      chapter_references: string[];
      suggestion: string;
    }> = [];

    // Feature #278: Add detailed logging for debugging
    console.log('[Plot Holes] Starting analysis for project:', projectId);
    console.log('[Plot Holes] User ID:', userId);
    console.log('[Plot Holes] Chapters found:', chapters.length);
    console.log('[Plot Holes] Registered characters:', characters.length);
    console.log('[Plot Holes] Language:', language);

    try {
      // Use the already imported getProviderForUser from the top of the file
      console.log('[Plot Holes] Calling getProviderForUser...');
      const provider = getProviderForUser(userId);
      console.log('[Plot Holes] Provider result:', provider ? provider.getProviderType() : 'null');

      if (provider) {
        console.log('[Projects] Using AI-powered plot hole detection with provider:', provider.getProviderType());

        const isItalian = language === 'it';

        // Build chapter summaries for the AI (truncate content to avoid token limits)
        const chapterSummaries = chapters.map((ch, idx) => {
          const contentPreview = ch.content.substring(0, 1500);
          return `CAPITOLO ${idx + 1}: "${ch.title}"\n${contentPreview}...`;
        }).join('\n\n---\n\n');

        // Build character list
        const characterList = characters.map(c =>
          `- ${c.name}: ${c.description || 'Nessuna descrizione'}${c.status_at_end ? ` [${c.status_at_end}]` : ''}`
        ).join('\n');

        // Build system prompt
        const systemPrompt = isItalian
          ? `Sei un esperto editor e analista narrativo. Il tuo compito è analizzare un romanzo per identificare buchi di trama, incongruenze e problemi narrativi.

Analizza SEMPRE il testo e identifica ALMENO 2-3 problemi potenziali, anche se minori. È molto raro che un romanzo sia perfetto.

Cerca questi tipi di problemi:
1. PERSONAGGI: Personaggi che scompaiono senza spiegazione, cambiamenti di personalità ingiustificati, nomi inconsistenti, personaggi che agiscono fuori carattere
2. TIMELINE: Contraddizioni temporali, eventi che si verificano nell'ordine sbagliato, riferimenti a eventi futuri
3. LOGICA: Eventi non giustificati, coincidenze eccessive, soluzioni troppo facili, motivazioni mancanti
4. TRAMA: Archi narrativi incompleti, sottotrame dimenticate, conflitti non risolti
5. COERENZA: Contraddizioni tra capitoli, dettagli che cambiano (es. colore occhi, età)

Rispondi SOLO con JSON valido nel formato:
{
  "plot_holes": [
    {
      "type": "character|timeline|logical|plot|consistency",
      "severity": "low|medium|high",
      "description": "Descrizione chiara del problema",
      "chapter_references": ["Titolo capitolo coinvolto"],
      "suggestion": "Suggerimento pratico per risolvere"
    }
  ]
}`
          : `You are an expert editor and narrative analyst. Your task is to analyze a novel to identify plot holes, inconsistencies, and narrative issues.

ALWAYS analyze the text and identify AT LEAST 2-3 potential issues, even if minor. It's very rare for a novel to be perfect.

Look for these types of issues:
1. CHARACTER: Characters disappearing without explanation, unjustified personality changes, inconsistent names, characters acting out of character
2. TIMELINE: Temporal contradictions, events occurring in wrong order, references to future events
3. LOGIC: Unjustified events, excessive coincidences, too-easy solutions, missing motivations
4. PLOT: Incomplete narrative arcs, forgotten subplots, unresolved conflicts
5. CONSISTENCY: Contradictions between chapters, changing details (e.g., eye color, age)

Respond ONLY with valid JSON in the format:
{
  "plot_holes": [
    {
      "type": "character|timeline|logical|plot|consistency",
      "severity": "low|medium|high",
      "description": "Clear description of the problem",
      "chapter_references": ["Chapter title involved"],
      "suggestion": "Practical suggestion to fix"
    }
  ]
}`;

        const userPrompt = isItalian
          ? `Analizza questo romanzo intitolato "${project.title}" per buchi di trama e incongristenze.

PERSONAGGI REGISTRATI:
${characterList || 'Nessun personaggio registrato'}

LUOGHI:
${locations.map(l => `- ${l.name}`).join('\n') || 'Nessun luogo registrato'}

CONTENUTO DEI CAPITOLI:
${chapterSummaries}

Identifica tutti i problemi narrativi, anche minori. È importante trovare aree di miglioramento.`
          : `Analyze this novel titled "${project.title}" for plot holes and inconsistencies.

REGISTERED CHARACTERS:
${characterList || 'No characters registered'}

LOCATIONS:
${locations.map(l => `- ${l.name}`).join('\n') || 'No locations registered'}

CHAPTER CONTENT:
${chapterSummaries}

Identify all narrative issues, even minor ones. It's important to find areas for improvement.`;

        const response = await provider.chat(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          { temperature: 0.3, maxTokens: 3000 }
        );

        // Parse AI response
        let jsonStr = response.content || '';
        console.log('[Plot Holes] Raw AI response length:', jsonStr.length);
        console.log('[Plot Holes] Raw AI response preview:', jsonStr.substring(0, 500));

        // Extract JSON from markdown code blocks if present
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
          console.log('[Plot Holes] Extracted JSON from code block');
        }

        // Feature #278: Add detailed JSON parsing error handling
        let aiResult;
        try {
          aiResult = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('[Plot Holes] JSON parse error:', parseError instanceof Error ? parseError.message : String(parseError));
          console.error('[Plot Holes] Attempting to parse string (first 1000 chars):', jsonStr.substring(0, 1000));
          throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
        }

        if (aiResult.plot_holes && Array.isArray(aiResult.plot_holes)) {
          plotHoles = aiResult.plot_holes.map((hole: any) => ({
            type: hole.type || 'logical',
            severity: hole.severity || 'medium',
            description: hole.description || '',
            chapter_references: Array.isArray(hole.chapter_references) ? hole.chapter_references : [],
            suggestion: hole.suggestion || ''
          }));
        } else {
          console.warn('[Plot Holes] AI response missing plot_holes array, got:', Object.keys(aiResult));
        }

        console.log('[Projects] AI plot hole detection completed:', {
          total_issues: plotHoles.length,
          method: 'AI-powered'
        });

      } else {
        // Fallback to algorithmic analysis if no AI provider
        console.log('[Plot Holes] No AI provider available, falling back to algorithmic analysis');
        console.log('[Plot Holes] Algorithmic analysis input - chapters:', chapters.length, 'characters:', characters.length, 'locations:', locations.length);
        plotHoles = await runAlgorithmicAnalysis(chapters, characters, locations, plotEvents, language);
        console.log('[Plot Holes] Algorithmic analysis found', plotHoles.length, 'issues');
      }
    } catch (aiError) {
      console.warn('[Projects] AI analysis failed, falling back to algorithmic:', aiError instanceof Error ? aiError.message : String(aiError));
      if (aiError instanceof Error && aiError.stack) {
        console.warn('[Projects] Stack trace:', aiError.stack);
      }
      // Fallback to algorithmic analysis on AI error
      plotHoles = await runAlgorithmicAnalysis(chapters, characters, locations, plotEvents, language);
    }

    console.log('[Projects] Plot hole detection completed:', {
      total_issues: plotHoles.length,
      breakdown: {
        character: plotHoles.filter(h => h.type === 'character').length,
        timeline: plotHoles.filter(h => h.type === 'timeline').length,
        logical: plotHoles.filter(h => h.type === 'logical').length,
        plot: plotHoles.filter(h => h.type === 'plot').length,
        consistency: plotHoles.filter(h => h.type === 'consistency').length,
      }
    });

    // Feature #278: Include analysis method in response for debugging
    const usedAI = plotHoles.length > 0 || characters.length > 0;
    const analysisMethod = usedAI ? 'ai_powered' : 'algorithmic_fallback';

    // Feature #283: Save analysis results to database
    try {
      const analysisId = uuidv4();
      const summary = plotHoles.length === 0
        ? 'No plot holes detected'
        : `${plotHoles.length} issue${plotHoles.length > 1 ? 's' : ''} found: ${plotHoles.filter(h => h.severity === 'high').length} high, ${plotHoles.filter(h => h.severity === 'medium').length} medium, ${plotHoles.filter(h => h.severity === 'low').length} low severity`;

      // Delete any existing analysis for this project (only keep the latest)
      db.prepare('DELETE FROM plot_hole_analyses WHERE project_id = ?').run(projectId);

      // Insert the new analysis
      db.prepare(`
        INSERT INTO plot_hole_analyses (id, project_id, results_json, summary, analysis_method, chapters_analyzed, total_issues)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        analysisId,
        projectId,
        JSON.stringify(plotHoles),
        summary,
        analysisMethod,
        chapters.length,
        plotHoles.length
      );

      console.log('[Projects] Saved plot hole analysis to database:', analysisId);
    } catch (saveError) {
      // Log but don't fail the request if saving fails
      console.error('[Projects] Failed to save plot hole analysis:', saveError instanceof Error ? saveError.message : 'Unknown error');
    }

    res.json({
      message: 'Plot hole detection completed',
      plot_holes: plotHoles,
      total_issues: plotHoles.length,
      analysis_info: {
        method: analysisMethod,
        chapters_analyzed: chapters.length,
        registered_characters: characters.length,
        registered_locations: locations.length,
        ai_provider_available: !!getProviderForUser(userId)
      }
    });
  } catch (error) {
    console.error('[Projects] Plot hole detection error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to detect plot holes' });
  }
});

// GET /api/projects/:id/plot-hole-analysis - Get the latest saved plot hole analysis (Feature #283)
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/:id/plot-hole-analysis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Verify project belongs to user
    const project = db.prepare('SELECT id, title, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string; title: string; area: string } | undefined;
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Get the latest analysis for this project
    const analysis = db.prepare(`
      SELECT id, analysis_date, results_json, summary, analysis_method, chapters_analyzed, total_issues, created_at
      FROM plot_hole_analyses
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as {
      id: string;
      analysis_date: string;
      results_json: string;
      summary: string;
      analysis_method: string;
      chapters_analyzed: number;
      total_issues: number;
      created_at: string;
    } | undefined;

    if (!analysis) {
      res.json({
        has_analysis: false,
        message: 'No analysis found for this project'
      });
      return;
    }

    // Parse the results JSON
    let plotHoles = [];
    try {
      plotHoles = JSON.parse(analysis.results_json);
    } catch (parseError) {
      console.error('[Projects] Failed to parse plot hole results JSON:', parseError);
      plotHoles = [];
    }

    res.json({
      has_analysis: true,
      id: analysis.id,
      analysis_date: analysis.analysis_date,
      plot_holes: plotHoles,
      total_issues: analysis.total_issues,
      summary: analysis.summary,
      analysis_method: analysis.analysis_method,
      chapters_analyzed: analysis.chapters_analyzed,
      created_at: analysis.created_at
    });
  } catch (error) {
    console.error('[Projects] Get plot hole analysis error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to get plot hole analysis' });
  }
});

// Feature #277: Helper function for algorithmic analysis fallback
async function runAlgorithmicAnalysis(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  characters: Array<{ name: string; description: string; status_at_end: string | null }>,
  locations: Array<{ name: string; description: string }>,
  plotEvents: Array<{ title: string; description: string; chapter_id: string | null }>,
  lang: Language
): Promise<Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapter_references: string[];
  suggestion: string;
}>> {
  const plotHoles: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapter_references: string[];
    suggestion: string;
  }> = [];

  const fullText = chapters.map(ch => ch.content).join('\n\n');

  // 1. Check for character inconsistencies
  const characterNames = characters.map(c => c.name.toLowerCase());
  const characterInconsistencies = analyzeCharacterConsistency(chapters, characterNames, lang);
  plotHoles.push(...characterInconsistencies);

  // 2. Check for timeline inconsistencies
  const timelineIssues = analyzeTimelineConsistency(chapters, plotEvents, lang);
  plotHoles.push(...timelineIssues);

  // 3. Check for unexplained plot developments
  const unexplainedEvents = analyzeUnexplainedDevelopments(chapters, plotEvents, lang);
  plotHoles.push(...unexplainedEvents);

  // 4. Check for logical inconsistencies
  const logicalInconsistencies = analyzeLogicalInconsistencies(chapters, fullText, lang);
  plotHoles.push(...logicalInconsistencies);

  // 5. Check for resolution gaps
  const resolutionGaps = analyzeResolutionGaps(chapters, lang);
  plotHoles.push(...resolutionGaps);

  return plotHoles;
}

// Helper function to analyze character consistency
function analyzeCharacterConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  characterNames: string[],
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
        description: isItalian
          ? `Il personaggio "${charName}" scompare dalla storia dopo il capitolo "${lastAppearance.title}" senza una risoluzione`
          : `Character "${charName}" disappears from the story after chapter "${lastAppearance.title}" without resolution`,
        chapter_references: chapters.filter((_, i) => appearances.includes(i)).map(ch => ch.title),
        suggestion: isItalian
          ? `Considera di far tornare ${charName} per una risoluzione o di spiegare la sua assenza`
          : `Consider bringing ${charName} back for a resolution or explaining their absence`
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
            description: isItalian
              ? `Il personaggio "${charName}" riappare dopo una lunga assenza (${gap} capitoli)`
              : `Character "${charName}" reappears after a long absence (${gap} chapters)`,
            chapter_references: [chapters[appearances[i]].title, chapters[appearances[i + 1]].title],
            suggestion: isItalian
              ? `Aggiungi un breve riferimento a ${charName} durante la sua assenza per mantenere la continuità`
              : `Add a brief reference to ${charName} during their absence to maintain continuity`
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
  plotEvents: Array<{ title: string; description: string; chapter_id: string | null }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
            description: isItalian
              ? `Possibile incoerenza temporale tra "${prevChapter.title}" e "${chapter.title}"`
              : `Possible timeline inconsistency between "${prevChapter.title}" and "${chapter.title}"`,
            chapter_references: [prevChapter.title, chapter.title],
            suggestion: isItalian
              ? 'Chiarisci la transizione temporale o modifica l\'interruzione della scena per rendere chiaro il salto temporale'
              : 'Clarify the time transition or adjust the scene break to make the time jump clear'
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
        description: isItalian
          ? `Il capitolo "${chapter.title}" ha frequenti cambiamenti di orario che potrebbero confondere`
          : `Chapter "${chapter.title}" has frequent time-of-day shifts that may be confusing`,
        chapter_references: [chapter.title],
        suggestion: isItalian
          ? 'Considera di strutturare le scene in modo più chiaro o di aggiungere interruzioni per indicare i cambiamenti temporali'
          : 'Consider structuring scenes more clearly or adding scene breaks to indicate time changes'
      });
    }
  });

  return issues;
}

// Helper function to analyze unexplained plot developments
function analyzeUnexplainedDevelopments(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  plotEvents: Array<{ title: string; description: string; chapter_id: string | null }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
            description: isItalian
              ? `Un importante sviluppo in "${chapter.title}" potrebbe mancare di una preparazione adeguata`
              : `Major development in "${chapter.title}" may lack proper setup`,
            chapter_references: [chapter.title],
            suggestion: isItalian
              ? 'Aggiungi sottili indizi nei capitoli precedenti per rendere questo sviluppo più naturale'
              : 'Add subtle foreshadowing in earlier chapters to make this development feel earned'
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
  fullText: string,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

  // Check for contradictory statements
  const contradictions = [
    { pattern: /didn't know.*but knew/gi, descriptionIt: 'contraddizione della conoscenza del personaggio', descriptionEn: 'Character knowledge contradiction' },
    { pattern: /never.*but always/gi, descriptionIt: 'contraddizione di affermazione assoluta', descriptionEn: 'Absolute statement contradiction' },
    { pattern: /impossible.*but happened/gi, descriptionIt: 'impossibilità logica', descriptionEn: 'Logical impossibility' },
  ];

  chapters.forEach(chapter => {
    contradictions.forEach(({ pattern, descriptionIt, descriptionEn }) => {
      const matches = chapter.content.match(pattern);
      if (matches) {
        issues.push({
          type: 'logical',
          severity: 'high',
          description: isItalian
            ? `Possibile contraddizione logica in "${chapter.title}": ${descriptionIt}`
            : `Possible logical contradiction in "${chapter.title}": ${descriptionEn}`,
          chapter_references: [chapter.title],
          suggestion: isItalian
            ? 'Rivedi il contesto per assicurarti che l\'affermazione abbia senso'
            : 'Review the context to ensure the statement makes sense'
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
          description: isItalian
            ? `Incoerenza nella conoscenza del personaggio in "${chapter.title}"`
            : `Character knowledge inconsistency in "${chapter.title}"`,
          chapter_references: [chapter.title],
          suggestion: isItalian
            ? 'Assicurati che gli stati di conoscenza del personaggio siano coerenti'
            : 'Ensure character knowledge states are consistent'
        });
      }
    });
  });

  return issues;
}

// Helper function to analyze resolution gaps
function analyzeResolutionGaps(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
          description: isItalian
            ? `Potenziale punto di trama irrisolto da "${chapter.title}"`
            : `Potential unresolved plot point from "${chapter.title}"`,
          chapter_references: [chapter.title],
          suggestion: isItalian
            ? 'Considera di affrontare questo punto della trama nella risoluzione della storia'
            : 'Consider addressing this plot point in the story\'s resolution'
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
    // Get language from request body or Accept-Language header (default to 'it')
    const language: Language = req.body?.language ||
                 (req.headers['accept-language']?.startsWith('en') ? 'en' : 'it') as Language;

    console.log('[Projects] Checking consistency for project:', projectId, 'language:', language);

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
    const characterIssues = analyzeCharacterDescriptionConsistency(chapters, characters, language);
    inconsistencies.push(...characterIssues);

    // 2. Check location description consistency
    const locationIssues = analyzeLocationDescriptionConsistency(chapters, locations, language);
    inconsistencies.push(...locationIssues);

    // 3. Check character trait consistency
    const traitIssues = analyzeCharacterTraitConsistency(chapters, characters, language);
    inconsistencies.push(...traitIssues);

    // 4. Check timeline continuity
    const timelineIssues = analyzeTimelineContinuity(chapters, language);
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
  characters: Array<{ name: string; description: string; traits: string }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
        description: isItalian
          ? 'Descrizioni del colore dei capelli incoerenti'
          : 'Inconsistent hair color descriptions',
        chapter_references: appearances.map(ch => ch.title),
        suggestion: isItalian
          ? `Rivedi le descrizioni fisiche di ${charName} per coerenza`
          : `Review ${charName}'s physical descriptions for consistency`
      });
    }
  });

  return issues;
}

// Helper function to analyze location description consistency
function analyzeLocationDescriptionConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  locations: Array<{ name: string; description: string; significance: string }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
          description: isItalian
            ? 'La posizione potrebbe essere descritta in modo ambiguo come sia interna che esterna'
            : 'Location may be ambiguously described as both indoor and outdoor',
          chapter_references: appearances.map(ch => ch.title),
          suggestion: isItalian
            ? `Chiarisci l'ambientazione di ${locName} o usa nomi di posizione più specifici`
            : `Clarify ${locName}'s setting or use more specific location names`
        });
      }
    }
  });

  return issues;
}

// Helper function to analyze character trait consistency
function analyzeCharacterTraitConsistency(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  characters: Array<{ name: string; description: string; traits: string }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
          description: isItalian
            ? 'Il comportamento del personaggio contraddice il tratto "coraggioso"'
            : 'Character behavior contradicts "brave" trait',
          chapter_references: cowardlyActs.map(ch => ch.title),
          suggestion: isItalian
            ? `Considera se la paura di ${charName} è giustificata (crescita del personaggio) o se il tratto deve essere modificato`
            : `Consider if ${charName}'s fear is justified (character growth) or if trait needs adjustment`
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
          description: isItalian
            ? 'Il personaggio agisce in modo audace nonostante il tratto "timido"'
            : 'Character consistently acts boldly despite "shy" trait',
          chapter_references: boldActs.map(ch => ch.title),
          suggestion: isItalian
            ? `Considera se ${charName} ha superato la timidezza (arco del personaggio) o se il tratto deve essere aggiornato`
            : `Consider if ${charName} has overcome shyness (character arc) or if trait needs updating`
        });
      }
    }
  });

  return issues;
}

// Helper function to analyze timeline continuity
function analyzeTimelineContinuity(
  chapters: Array<{ id: string; title: string; content: string; order_index: number }>,
  lang: Language = 'it'
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

  const isItalian = lang === 'it';

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
          entity_name: isItalian ? `Capitolo ${idx + 1}` : `Chapter ${idx + 1}`,
          description: isItalian
            ? 'Il salto temporale potrebbe non essere chiaramente indicato'
            : 'Time jump may not be clearly indicated',
          chapter_references: [previousChapter.title, chapter.title],
          suggestion: isItalian
            ? 'Aggiungi un\'interruzione di scena o una transizione più chiara per indicare il passaggio del tempo'
            : 'Add a scene break or clearer transition to indicate the time passage'
        });
      }
    }
  });

  return issues;
}

// ============================================================================
// POST /api/projects/:id/sequel/outline - Generate Sequel Outline (Feature #267)
// Returns the chapter outline WITHOUT creating the project yet (for preview)
// ============================================================================

// ============================================================================
// POST /api/projects/:id/sequel/proposals - Generate 3 Plot Proposals
// Phase 1: Generates 3 distinct plot directions for the sequel
// ============================================================================

interface SequelProposalsRequestBody {
  title?: string;
  language?: 'it' | 'en';
}

// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/sequel/proposals', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const { title: customTitle, language = 'it' } = req.body as SequelProposalsRequestBody;

    console.log('[Sequel-Proposals] Generating 3 plot proposals for:', projectId);

    const originalProject = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!originalProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (originalProject.area !== 'romanziere') {
      res.status(400).json({ message: 'Sequels can only be created for romanziere (novel) projects' });
      return;
    }

    const isItalian = language === 'it';
    const sequelTitle = customTitle || `${originalProject.title} - Part 2`;

    // Get context data WITH status information
    const characters = db.prepare('SELECT name, description, traits, role_in_story, status_at_end, status_notes FROM characters WHERE project_id = ?').all(projectId) as any[];
    const locations = db.prepare('SELECT name, description, significance FROM locations WHERE project_id = ?').all(projectId) as any[];
    const plotEvents = db.prepare('SELECT title, description, event_type FROM plot_events WHERE project_id = ? ORDER BY order_index').all(projectId) as any[];

    // Separate alive/dead characters
    const aliveChars = characters.filter((c: any) => c.status_at_end !== 'dead');
    const deadChars = characters.filter((c: any) => c.status_at_end === 'dead');

    const statusInfo = (c: any) => {
      if (!c.status_at_end || c.status_at_end === 'unknown') return '';
      const labels: Record<string, string> = isItalian
        ? { alive: 'Vivo', injured: 'Ferito', missing: 'Disperso' }
        : { alive: 'Alive', injured: 'Injured', missing: 'Missing' };
      return labels[c.status_at_end] ? ` [${labels[c.status_at_end]}${c.status_notes ? ': ' + c.status_notes : ''}]` : '';
    };

    const charSummaries = aliveChars.slice(0, 15).map((c: any) =>
      `- ${c.name}: ${c.description || ''} (${c.role_in_story || ''})${statusInfo(c)}`
    ).join('\n');

    const deadCharSummaries = deadChars.map((c: any) =>
      `- ${c.name}: ${c.status_notes || (isItalian ? 'Morto nel romanzo precedente' : 'Died in previous novel')}`
    ).join('\n');

    const locSummaries = locations.slice(0, 10).map((l: any) =>
      `- ${l.name}: ${l.description || ''}`
    ).join('\n');

    const eventSummaries = plotEvents.slice(0, 15).map((e: any) =>
      `- ${e.title}: ${e.description || ''}`
    ).join('\n');

    const systemPrompt = isItalian
      ? `Sei un esperto scrittore e consulente editoriale specializzato in narrativa seriale.
Il tuo compito è proporre 3 direzioni creative e distinte per il seguito di un romanzo.
Ogni proposta deve essere originale, coerente con la storia precedente, e sufficientemente dettagliata da capire dove andrebbe la trama.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.`
      : `You are an expert writer and editorial consultant specializing in serialized fiction.
Your task is to propose 3 creative and distinct directions for the sequel to a novel.
Each proposal must be original, consistent with the previous story, and detailed enough to understand where the plot would go.
Respond ONLY with valid JSON, without additional text.`;

    const userPrompt = isItalian
      ? `Proponi 3 direzioni di trama DIVERSE e CREATIVE per il sequel del seguente romanzo.

ROMANZO PRECEDENTE: "${originalProject.title}"
${originalProject.synopsis ? `\nSINOPSI COMPLETA:\n${originalProject.synopsis}\n` : ''}

PERSONAGGI DISPONIBILI (vivi/attivi):
${charSummaries || 'Nessun personaggio registrato'}
${deadCharSummaries ? `\nPERSONAGGI MORTI (NON possono apparire vivi nel sequel):\n${deadCharSummaries}` : ''}

LUOGHI:
${locSummaries || 'Nessun luogo registrato'}

EVENTI DI TRAMA PRINCIPALI:
${eventSummaries || 'Nessun evento registrato'}

TITOLO DEL SEQUEL: "${sequelTitle}"

Genera 3 proposte di trama DISTINTE nel seguente formato JSON:
{
  "proposals": [
    {
      "title": "Titolo evocativo della direzione di trama",
      "synopsis": "Sinossi dettagliata della trama proposta (200-400 parole). Descrivi l'arco narrativo principale, i conflitti centrali, come si evolve la storia dal punto in cui è terminata, quali personaggi hanno un ruolo chiave e come si conclude idealmente.",
      "themes": ["Tema 1", "Tema 2", "Tema 3"],
      "key_characters": ["Personaggio chiave 1", "Personaggio chiave 2"],
      "tone": "Tono narrativo (es: cupo, avventuroso, riflessivo, action)"
    }
  ]
}

REGOLE IMPORTANTI:
- Le 3 proposte devono essere MOLTO diverse tra loro (genere, tono, conflitto centrale)
- I personaggi morti NON devono apparire come vivi
- I personaggi feriti devono avere il loro stato considerato nella trama
- Ogni sinossi deve essere dettagliata e coprire l'intero arco della storia proposta
- Continua la storia dal punto in cui è terminato il romanzo precedente
- Sii creativo e sorprendente`
      : `Propose 3 DIFFERENT and CREATIVE plot directions for the sequel to the following novel.

PREVIOUS NOVEL: "${originalProject.title}"
${originalProject.synopsis ? `\nCOMPLETE SYNOPSIS:\n${originalProject.synopsis}\n` : ''}

AVAILABLE CHARACTERS (alive/active):
${charSummaries || 'No characters registered'}
${deadCharSummaries ? `\nDEAD CHARACTERS (must NOT appear alive in the sequel):\n${deadCharSummaries}` : ''}

LOCATIONS:
${locSummaries || 'No locations registered'}

MAIN PLOT EVENTS:
${eventSummaries || 'No plot events registered'}

SEQUEL TITLE: "${sequelTitle}"

Generate 3 DISTINCT plot proposals in the following JSON format:
{
  "proposals": [
    {
      "title": "Evocative title for the plot direction",
      "synopsis": "Detailed synopsis of the proposed plot (200-400 words). Describe the main narrative arc, central conflicts, how the story evolves from where it ended, which characters play key roles, and how it ideally concludes.",
      "themes": ["Theme 1", "Theme 2", "Theme 3"],
      "key_characters": ["Key character 1", "Key character 2"],
      "tone": "Narrative tone (e.g., dark, adventurous, reflective, action)"
    }
  ]
}

IMPORTANT RULES:
- The 3 proposals must be VERY different from each other (genre, tone, central conflict)
- Dead characters must NOT appear alive
- Injured characters should have their state considered in the plot
- Each synopsis must be detailed and cover the entire proposed story arc
- Continue the story from where the previous novel ended
- Be creative and surprising`;

    // Call AI
    const provider = await getProviderForUser(userId);

    if (!provider) {
      res.status(400).json({ message: isItalian ? 'Nessun provider AI configurato. Configura un provider nelle impostazioni.' : 'No AI provider configured. Please configure one in settings.' });
      return;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await provider.chat(messages, {
      temperature: 0.8,  // Higher temperature for creative diversity
      maxTokens: 6000
    });

    const responseText = response.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const proposals = parsed.proposals || [];

    if (proposals.length === 0) {
      throw new Error('AI did not generate any proposals');
    }

    console.log(`[Sequel-Proposals] Generated ${proposals.length} plot proposals successfully`);

    res.json({
      success: true,
      sequelTitle,
      proposals: proposals.map((p: any, idx: number) => ({
        id: idx,
        title: String(p.title || '').trim(),
        synopsis: String(p.synopsis || '').trim(),
        themes: (p.themes || []).map((t: any) => String(t).trim()),
        key_characters: (p.key_characters || []).map((c: any) => String(c).trim()),
        tone: String(p.tone || '').trim()
      })),
      context: {
        originalTitle: originalProject.title,
        aliveCharactersCount: aliveChars.length,
        deadCharactersCount: deadChars.length,
        locationsCount: locations.length,
        plotEventsCount: plotEvents.length
      }
    });

  } catch (error) {
    console.error('[Sequel-Proposals] Error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate sequel proposals' });
  }
});

// ============================================================================
// POST /api/projects/:id/sequel/outline - Generate Chapter Outline (Feature #267)
// Phase 2: Takes the chosen plot proposal and generates a detailed chapter outline
// ============================================================================

interface SequelOutlineRequestBody {
  title?: string;
  language?: 'it' | 'en';
  numChapters?: number;
  chosenPlot?: string;  // The chosen plot synopsis from Phase 1
}

// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/sequel/outline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const {
      title: customTitle,
      language = 'it',
      numChapters = 10,
      chosenPlot
    } = req.body as SequelOutlineRequestBody;

    console.log('[Sequel-Outline] Generating chapter outline for:', projectId, 'chapters:', numChapters);

    const originalProject = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!originalProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (originalProject.area !== 'romanziere') {
      res.status(400).json({ message: 'Sequels can only be created for romanziere (novel) projects' });
      return;
    }

    const isItalian = language === 'it';
    const sequelTitle = customTitle || `${originalProject.title} - Part 2`;

    // Get context data WITH status information
    const characters = db.prepare('SELECT name, description, traits, role_in_story, status_at_end, status_notes FROM characters WHERE project_id = ?').all(projectId) as any[];
    const locations = db.prepare('SELECT name, description, significance FROM locations WHERE project_id = ?').all(projectId) as any[];
    const plotEvents = db.prepare('SELECT title, description, event_type FROM plot_events WHERE project_id = ? ORDER BY order_index').all(projectId) as any[];

    // Separate alive/dead characters
    const aliveChars = characters.filter((c: any) => c.status_at_end !== 'dead');
    const deadChars = characters.filter((c: any) => c.status_at_end === 'dead');

    const statusInfo = (c: any) => {
      if (!c.status_at_end || c.status_at_end === 'unknown') return '';
      const labels: Record<string, string> = isItalian
        ? { alive: 'Vivo', injured: 'Ferito', missing: 'Disperso' }
        : { alive: 'Alive', injured: 'Injured', missing: 'Missing' };
      return labels[c.status_at_end] ? ` [${labels[c.status_at_end]}${c.status_notes ? ': ' + c.status_notes : ''}]` : '';
    };

    const characterSummaries = aliveChars.slice(0, 15).map((c: any) =>
      `- ${c.name}: ${c.description || ''} (${c.role_in_story || ''})${statusInfo(c)}`
    ).join('\n');

    const deadCharacterSummaries = deadChars.map((c: any) =>
      `- ${c.name}: ${c.status_notes || (isItalian ? 'Morto nel romanzo precedente' : 'Died in previous novel')}`
    ).join('\n');

    const locationSummaries = locations.slice(0, 10).map((l: any) =>
      `- ${l.name}: ${l.description || ''}`
    ).join('\n');

    const plotSummary = plotEvents.slice(0, 15).map((e: any) =>
      `- ${e.title}: ${e.description || ''}`
    ).join('\n');

    // The chosen plot from Phase 1 is the key context for generating chapters
    const chosenPlotSection = chosenPlot
      ? (isItalian
        ? `\nTRAMA SCELTA PER IL SEQUEL (DEVI seguire questa direzione):\n${chosenPlot}\n`
        : `\nCHOSEN PLOT FOR THE SEQUEL (you MUST follow this direction):\n${chosenPlot}\n`)
      : '';

    const systemPrompt = isItalian
      ? `Sei un esperto scrittore e consulente editoriale specializzato in narrativa seriale.
Il tuo compito è creare un outline dettagliato capitolo per capitolo per il seguito di un romanzo, seguendo la trama scelta dall'utente.
Devi mantenere la coerenza con i personaggi e la trama precedente.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.`
      : `You are an expert writer and editorial consultant specializing in serialized fiction.
Your task is to create a detailed chapter-by-chapter outline for the sequel to a novel, following the user's chosen plot direction.
You must maintain consistency with characters and the previous plot.
Respond ONLY with valid JSON, without additional text.`;

    const userPrompt = isItalian
      ? `Crea un outline dettagliato per il sequel del seguente romanzo.

ROMANZO PRECEDENTE: "${originalProject.title}"
${originalProject.synopsis ? `SINOPSI DEL ROMANZO PRECEDENTE:\n${originalProject.synopsis}\n` : ''}
${chosenPlotSection}
PERSONAGGI DISPONIBILI (vivi/attivi):
${characterSummaries || 'Nessun personaggio registrato'}
${deadCharacterSummaries ? `\nPERSONAGGI MORTI (NON devono apparire come vivi):\n${deadCharacterSummaries}` : ''}

LUOGHI:
${locationSummaries || 'Nessun luogo registrato'}

EVENTI DI TRAMA PRINCIPALI DEL ROMANZO PRECEDENTE:
${plotSummary || 'Nessun evento registrato'}

TITOLO DEL SEQUEL: "${sequelTitle}"

Genera un outline con ESATTAMENTE ${numChapters} capitoli nel seguente formato JSON:
{
  "chapters": [
    {
      "title": "Titolo evocativo del capitolo (non generico come 'Capitolo 1')",
      "summary": "Sinossi dettagliata di cosa accadrà (150-250 parole): eventi principali, conflitti, rivelazioni, sviluppi dei personaggi",
      "returning_characters": ["Nome di ogni personaggio che appare in questo capitolo"],
      "new_elements": ["Nuovi personaggi, luoghi o elementi introdotti"],
      "connection_to_previous": "Collegamento con il romanzo precedente"
    }
  ],
  "themes_to_explore": ["Temi esplorati nel sequel"],
  "character_arcs_to_continue": ["Archi narrativi dei personaggi"]
}

REGOLE:
- Segui FEDELMENTE la trama scelta
- I titoli devono essere evocativi e specifici
- Le sinossi devono essere DETTAGLIATE (150-250 parole), non vaghe
- Ogni capitolo deve avere personaggi DIVERSI e appropriati alla scena
- I personaggi morti NON devono apparire come vivi
- Distribuisci l'arco narrativo in modo equilibrato tra i ${numChapters} capitoli`
      : `Create a detailed outline for the sequel to the following novel.

PREVIOUS NOVEL: "${originalProject.title}"
${originalProject.synopsis ? `PREVIOUS NOVEL SYNOPSIS:\n${originalProject.synopsis}\n` : ''}
${chosenPlotSection}
AVAILABLE CHARACTERS (alive/active):
${characterSummaries || 'No characters registered'}
${deadCharacterSummaries ? `\nDEAD CHARACTERS (must NOT appear alive):\n${deadCharacterSummaries}` : ''}

LOCATIONS:
${locationSummaries || 'No locations registered'}

MAIN PLOT EVENTS FROM PREVIOUS NOVEL:
${plotSummary || 'No plot events registered'}

SEQUEL TITLE: "${sequelTitle}"

Generate an outline with EXACTLY ${numChapters} chapters in the following JSON format:
{
  "chapters": [
    {
      "title": "Evocative chapter title (not generic like 'Chapter 1')",
      "summary": "Detailed synopsis of what will happen (150-250 words): main events, conflicts, revelations, character developments",
      "returning_characters": ["Name of each character appearing in this chapter"],
      "new_elements": ["New characters, locations or elements introduced"],
      "connection_to_previous": "Connection to the previous novel"
    }
  ],
  "themes_to_explore": ["Themes explored in the sequel"],
  "character_arcs_to_continue": ["Character narrative arcs"]
}

RULES:
- FAITHFULLY follow the chosen plot direction
- Titles must be evocative and specific
- Summaries must be DETAILED (150-250 words), not vague
- Each chapter must have DIFFERENT and appropriate characters
- Dead characters must NOT appear alive
- Distribute the narrative arc evenly across the ${numChapters} chapters`;

    // Get AI provider
    const provider = await getProviderForUser(userId);

    if (!provider) {
      res.status(400).json({ message: isItalian ? 'Nessun provider AI configurato.' : 'No AI provider configured.' });
      return;
    }

    console.log('[Sequel-Outline] Calling AI for chapter outline...');
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await provider.chat(aiMessages, {
      temperature: 0.5,
      maxTokens: 8000
    });

    const responseText = response.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const generatedOutline = JSON.parse(jsonMatch[0]);

    if (!generatedOutline.chapters || generatedOutline.chapters.length === 0) {
      throw new Error('AI did not generate any chapters');
    }

    console.log(`[Sequel-Outline] Generated ${generatedOutline.chapters.length} chapters successfully`);

    res.json({
      success: true,
      outline: {
        sequelTitle,
        chapters: generatedOutline.chapters || [],
        themes: generatedOutline.themes_to_explore || [],
        characterArcs: generatedOutline.character_arcs_to_continue || []
      },
      context: {
        originalTitle: originalProject.title,
        aliveCharactersCount: aliveChars.length,
        deadCharactersCount: deadChars.length,
        locationsCount: locations.length,
        plotEventsCount: plotEvents.length
      }
    });

  } catch (error) {
    console.error('[Sequel-Outline] Error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate sequel outline' });
  }
});

// ============================================================================
// POST /api/projects/:id/sequel/confirm - Create Sequel After Confirmation (Feature #267)
// Creates the sequel project with the confirmed outline
// ============================================================================

interface SequelConfirmRequestBody {
  title?: string;
  outline: {
    chapters: Array<{
      title: string;
      summary: string;
      returning_characters?: string[];
      new_elements?: string[];
      connection_to_previous?: string;
    }>;
    themes?: string[];
    characterArcs?: string[];
  };
  language?: 'it' | 'en';
  generateContent?: boolean;
}

// @ts-expect-error - AuthRequest type compatibility with router
router.post('/:id/sequel/confirm', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const {
      title: customTitle,
      outline,
      language = 'it',
      generateContent = false
    } = req.body as SequelConfirmRequestBody;

    if (!outline || !outline.chapters || outline.chapters.length === 0) {
      res.status(400).json({ message: 'Outline with chapters is required' });
      return;
    }

    console.log('[Projects] Creating sequel after confirmation:', projectId);

    // Fetch the original project
    const originalProject = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!originalProject) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Only romanziere projects can have sequels
    if (originalProject.area !== 'romanziere') {
      res.status(400).json({ message: 'Sequels can only be created for romanziere (novel) projects' });
      return;
    }

    const sequelTitle = customTitle || `${originalProject.title} - Part 2`;
    const newProjectId = uuidv4();

    // Get or create saga
    let sagaId = originalProject.saga_id;

    if (!sagaId) {
      sagaId = uuidv4();
      const sagaTitle = originalProject.title.includes(' - ')
        ? originalProject.title.split(' - ')[0] + ' Series'
        : originalProject.title + ' Series';

      db.prepare(
        `INSERT INTO sagas (id, user_id, title, description, area, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(sagaId, userId, sagaTitle, `Series containing "${originalProject.title}" and its sequels`, 'romanziere');

      db.prepare('UPDATE projects SET saga_id = ? WHERE id = ?').run(sagaId, projectId);
      console.log('[Projects-Confirm] Created new saga:', sagaId);
    }

    // Create the sequel project
    db.prepare(
      `INSERT INTO projects (
        id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov,
        word_count_target, status, settings_json, word_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, datetime('now'), datetime('now'))`
    ).run(
      newProjectId,
      userId,
      sagaId,
      sequelTitle,
      `Sequel to "${originalProject.title}"`,
      originalProject.area,
      originalProject.genre || '',
      originalProject.tone || '',
      originalProject.target_audience || '',
      originalProject.pov || '',
      originalProject.word_count_target || 0,
      originalProject.settings_json || '{}'
    );

    console.log('[Projects-Confirm] Created sequel project:', newProjectId);

    // Copy characters (exclude dead characters)
    const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[];
    let charsCopiedConfirm = 0;
    let charsSkippedConfirm = 0;
    for (const character of characters) {
      if (character.status_at_end === 'dead') {
        charsSkippedConfirm++;
        console.log(`[Projects-Confirm] Skipping dead character: ${character.name}`);
        continue;
      }
      const newCharacterId = uuidv4();
      db.prepare(
        `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).run(
        newCharacterId,
        newProjectId,
        sagaId,
        character.name,
        character.description || '',
        character.traits || '',
        character.backstory || '',
        character.role_in_story || '',
        character.relationships_json || '[]',
        'unknown',  // Reset status for sequel
        character.status_notes || ''  // Keep notes for reference
      );
      charsCopiedConfirm++;
    }
    console.log(`[Projects-Confirm] Copied ${charsCopiedConfirm} characters (skipped ${charsSkippedConfirm} dead)`);

    // Copy locations
    const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(projectId) as any[];
    for (const location of locations) {
      const newLocationId = uuidv4();
      db.prepare(
        `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).run(
        newLocationId,
        newProjectId,
        sagaId,
        location.name,
        location.description || '',
        location.significance || ''
      );
    }
    console.log('[Projects-Confirm] Copied', locations.length, 'locations to sequel');

    // Copy synopsis as source
    if (originalProject.synopsis) {
      const synopsisSourceId = uuidv4();
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, '', 'reference', 'text', ?, ?, 'upload', '', '["synopsis", "reference"]', 1.0, datetime('now'))`
      ).run(
        synopsisSourceId,
        newProjectId,
        sagaId,
        userId,
        originalProject.synopsis.length,
        `Synopsis of "${originalProject.title}":\n\n${originalProject.synopsis}`
      );
    }

    // Copy sources
    const sources = db.prepare('SELECT * FROM sources WHERE project_id = ?').all(projectId) as any[];
    for (const source of sources) {
      const newSourceId = uuidv4();
      const validSourceType = ['upload', 'web_search'].includes(source.source_type) ? source.source_type : 'upload';
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        newSourceId,
        newProjectId,
        sagaId,
        userId,
        source.file_name,
        source.file_path || '',
        source.file_type,
        source.file_size || 0,
        source.content_text || '',
        validSourceType,
        source.url || '',
        source.tags_json || '[]',
        source.relevance_score || 0.0
      );
    }
    console.log('[Projects-Confirm] Copied', sources.length, 'sources to sequel');

    // Create chapters from the confirmed outline
    const isItalian = language === 'it';
    for (let i = 0; i < outline.chapters.length; i++) {
      const chapterData = outline.chapters[i];
      const chapterId = uuidv4();

      // Store the summary in both the summary field and optionally in content for non-generated chapters
      const chapterContent = generateContent ? '' : (chapterData.summary || '');

      db.prepare(
        `INSERT INTO chapters (id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))`
      ).run(
        chapterId,
        newProjectId,
        chapterData.title,
        chapterContent,
        chapterData.summary || '',
        i,
        chapterContent.length
      );
    }
    console.log('[Projects-Confirm] Created', outline.chapters.length, 'chapters from outline');

    // Fetch and return the sequel project
    const sequelProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(newProjectId);

    res.status(201).json({
      message: isItalian ? 'Seguito creato con successo' : 'Sequel created successfully',
      project: sequelProject,
      chaptersCreated: outline.chapters.length,
      charactersCopied: characters.length,
      locationsCopied: locations.length,
      sourcesCopied: sources.length
    });

  } catch (error) {
    console.error('[Projects] Sequel confirm error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
