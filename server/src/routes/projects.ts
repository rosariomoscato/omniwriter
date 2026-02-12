import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

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

export default router;
