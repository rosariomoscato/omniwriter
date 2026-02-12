// @ts-nocheck
import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePremium } from '../middleware/roles';

const router = express.Router();

// GET /api/sagas - List user's sagas
// Sagas are a premium feature
router.get('/', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const db = getDatabase();

    const sagas = db.prepare(
      'SELECT * FROM sagas WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);

    console.log('[Sagas] Found', sagas.length, 'sagas for user:', userId);
    res.json({ sagas, count: sagas.length });
  } catch (error) {
    console.error('[Sagas] List error:', error);
    res.status(500).json({ message: 'Failed to fetch sagas' });
  }
});

// POST /api/sagas - Create new saga (premium feature)
router.post('/', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, description, area } = req.body;
    const db = getDatabase();

    // Validation
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!area || !['romanziere', 'saggista', 'redattore'].includes(area)) {
      return res.status(400).json({ message: 'Area must be romanziere, saggista, or redattore' });
    }

    const sagaId = uuidv4();

    db.prepare(
      `INSERT INTO sagas (id, user_id, title, description, area, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(sagaId, userId, title.trim(), description || '', area);

    const saga = db.prepare('SELECT * FROM sagas WHERE id = ?').get(sagaId);

    console.log('[Sagas] Created saga:', sagaId, 'for user:', userId);
    res.status(201).json({ message: 'Saga created successfully', saga });
  } catch (error) {
    console.error('[Sagas] Create error:', error);
    res.status(500).json({ message: 'Failed to create saga' });
  }
});

// GET /api/sagas/:id - Get single saga
router.get('/:id', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDatabase();

    const saga = db.prepare(
      'SELECT * FROM sagas WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!saga) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    res.json({ saga });
  } catch (error) {
    console.error('[Sagas] Get error:', error);
    res.status(500).json({ message: 'Failed to fetch saga' });
  }
});

// PUT /api/sagas/:id - Update saga
router.put('/:id', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title, description, area } = req.body;
    const db = getDatabase();

    // Check ownership
    const existing = db.prepare(
      'SELECT id FROM sagas WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!existing) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    db.prepare(
      `UPDATE sagas SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        area = COALESCE(?, area),
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(title || null, description || null, area || null, id, userId);

    const saga = db.prepare('SELECT * FROM sagas WHERE id = ?').get(id);

    console.log('[Sagas] Updated saga:', id);
    res.json({ message: 'Saga updated successfully', saga });
  } catch (error) {
    console.error('[Sagas] Update error:', error);
    res.status(500).json({ message: 'Failed to update saga' });
  }
});

// DELETE /api/sagas/:id - Delete saga
router.delete('/:id', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDatabase();

    const result = db.prepare(
      'DELETE FROM sagas WHERE id = ? AND user_id = ?'
    ).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    console.log('[Sagas] Deleted saga:', id);
    res.json({ message: 'Saga deleted successfully' });
  } catch (error) {
    console.error('[Sagas] Delete error:', error);
    res.status(500).json({ message: 'Failed to delete saga' });
  }
});

// GET /api/sagas/:id/projects - Get projects in a saga
router.get('/:id/projects', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDatabase();

    // Verify saga ownership
    const saga = db.prepare(
      'SELECT id FROM sagas WHERE id = ? AND user_id = ?'
    ).get(id, userId);

    if (!saga) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    const projects = db.prepare(
      'SELECT * FROM projects WHERE saga_id = ? ORDER BY created_at DESC'
    ).all(id);

    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('[Sagas] Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch saga projects' });
  }
});

// POST /api/sagas/:id/projects - Create project within a saga
router.post('/:id/projects', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id: sagaId } = req.params;
    const userId = req.user?.id;
    const { title, description, area } = req.body;
    const db = getDatabase();

    // Verify saga ownership and area match
    const saga = db.prepare(
      'SELECT id, area FROM sagas WHERE id = ? AND user_id = ?'
    ).get(sagaId, userId);

    if (!saga) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    if (area !== saga.area) {
      return res.status(400).json({
        message: `Project area must match saga area (${saga.area})`
      });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const projectId = uuidv4();

    db.prepare(
      `INSERT INTO projects (id, user_id, saga_id, title, description, area, status, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, datetime('now'), datetime('now'))`
    ).run(projectId, userId, sagaId, title.trim(), description || '', area);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    console.log('[Sagas] Created project in saga:', projectId);
    res.status(201).json({ message: 'Project created in saga', project });
  } catch (error) {
    console.error('[Sagas] Create project error:', error);
    res.status(500).json({ message: 'Failed to create project in saga' });
  }
});

export default router;
