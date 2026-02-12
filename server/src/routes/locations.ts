// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/projects/:id/locations - List locations for a project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/projects/:id/locations', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Verify user owns project
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    console.log('[Locations] Fetching locations for project:', projectId);
    const locations = db.prepare(
      'SELECT * FROM locations WHERE project_id = ? ORDER BY created_at DESC'
    ).all(projectId);

    console.log('[Locations] Found', locations.length, 'locations');
    res.json({ locations, count: locations.length });
  } catch (error) {
    console.error('[Locations] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/projects/:id/locations - Create location
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/projects/:id/locations', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const { name, description, significance } = req.body;

    // Verify user owns project
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Location name is required' });
      return;
    }

    const locationId = uuidv4();

    console.log('[Locations] Creating location:', locationId, 'for project:', projectId);
    db.prepare(
      `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(
      locationId,
      projectId,
      name.trim(),
      description || '',
      significance || ''
    );

    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId);
    console.log('[Locations] Location created successfully:', locationId);

    res.status(201).json({ message: 'Location created successfully', location });
  } catch (error) {
    console.error('[Locations] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/locations/:id - Get single location
// @ts-expecterror - AuthRequest type compatibility with router
router.get('/locations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const locationId = req.params.id;

    console.log('[Locations] Fetching location:', locationId);
    const location = db.prepare(
      `SELECT l.* FROM locations l
       JOIN projects p ON l.project_id = p.id
       WHERE l.id = ? AND p.user_id = ?`
    ).get(locationId, userId);

    if (!location) {
      res.status(404).json({ message: 'Location not found' });
      return;
    }

    res.json({ location });
  } catch (error) {
    console.error('[Locations] Get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/locations/:id - Update location
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/locations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const locationId = req.params.id;
    const { name, description, significance } = req.body;

    // Verify ownership
    const existing = db.prepare(
      `SELECT l.id FROM locations l
       JOIN projects p ON l.project_id = p.id
       WHERE l.id = ? AND p.user_id = ?`
    ).get(locationId, userId);

    if (!existing) {
      res.status(404).json({ message: 'Location not found' });
      return;
    }

    console.log('[Locations] Updating location:', locationId);
    db.prepare(
      `UPDATE locations SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        significance = COALESCE(?, significance),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name || null,
      description || null,
      significance || null,
      locationId
    );

    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId);
    console.log('[Locations] Location updated successfully:', locationId);

    res.json({ message: 'Location updated successfully', location });
  } catch (error) {
    console.error('[Locations] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/locations/:id - Delete location
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/locations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const locationId = req.params.id;

    // Verify ownership
    const existing = db.prepare(
      `SELECT l.id FROM locations l
       JOIN projects p ON l.project_id = p.id
       WHERE l.id = ? AND p.user_id = ?`
    ).get(locationId, userId);

    if (!existing) {
      res.status(404).json({ message: 'Location not found' });
      return;
    }

    console.log('[Locations] Deleting location:', locationId);
    const result = db.prepare(
      `DELETE FROM locations
       WHERE id = ?`
    ).run(locationId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Location not found' });
      return;
    }

    console.log('[Locations] Location deleted successfully:', locationId);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('[Locations] Delete error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
