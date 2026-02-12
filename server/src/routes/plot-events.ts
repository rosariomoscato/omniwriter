// @ts-nocheck
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/projects/:id/plot-events - List plot events for a project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/projects/:id/plot-events', authenticateToken, (req: AuthRequest, res: Response) => {
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

    console.log('[PlotEvents] Fetching plot events for project:', projectId);
    const plotEvents = db.prepare(
      'SELECT * FROM plot_events WHERE project_id = ? ORDER BY order_index ASC, created_at DESC'
    ).all(projectId);

    console.log('[PlotEvents] Found', plotEvents.length, 'plot events');
    res.json({ plotEvents, count: plotEvents.length });
  } catch (error) {
    console.error('[PlotEvents] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/projects/:id/plot-events - Create plot event
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/projects/:id/plot-events', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const { title, description, chapter_id, event_type } = req.body;

    // Verify user owns project
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ message: 'Plot event title is required' });
      return;
    }

    // If chapter_id is provided, verify it belongs to this project
    if (chapter_id) {
      const chapter = db.prepare('SELECT id FROM chapters WHERE id = ? AND project_id = ?').get(chapter_id, projectId);
      if (!chapter) {
        res.status(400).json({ message: 'Chapter not found in this project' });
        return;
      }
    }

    // Get next order_index
    const maxOrder = db.prepare('SELECT MAX(order_index) as max_order FROM plot_events WHERE project_id = ?').get(projectId);
    const nextOrder = (maxOrder?.max_order || 0) + 1;

    const plotEventId = uuidv4();

    console.log('[PlotEvents] Creating plot event:', plotEventId, 'for project:', projectId);
    db.prepare(
      `INSERT INTO plot_events (id, project_id, saga_id, title, description, chapter_id, order_index, event_type, extracted_from_upload, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(
      plotEventId,
      projectId,
      title.trim(),
      description || '',
      chapter_id || null,
      nextOrder,
      event_type || ''
    );

    const plotEvent = db.prepare('SELECT * FROM plot_events WHERE id = ?').get(plotEventId);
    console.log('[PlotEvents] Plot event created successfully:', plotEventId);

    res.status(201).json({ message: 'Plot event created successfully', plotEvent });
  } catch (error) {
    console.error('[PlotEvents] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/plot-events/:id - Get single plot event
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/plot-events/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const plotEventId = req.params.id;

    console.log('[PlotEvents] Fetching plot event:', plotEventId);
    const plotEvent = db.prepare(
      `SELECT pe.* FROM plot_events pe
       JOIN projects p ON pe.project_id = p.id
       WHERE pe.id = ? AND p.user_id = ?`
    ).get(plotEventId, userId);

    if (!plotEvent) {
      res.status(404).json({ message: 'Plot event not found' });
      return;
    }

    res.json({ plotEvent });
  } catch (error) {
    console.error('[PlotEvents] Get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/plot-events/:id - Update plot event
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/plot-events/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const plotEventId = req.params.id;
    const { title, description, chapter_id, event_type } = req.body;

    // Verify ownership
    const existing = db.prepare(
      `SELECT pe.id, pe.project_id FROM plot_events pe
       JOIN projects p ON pe.project_id = p.id
       WHERE pe.id = ? AND p.user_id = ?`
    ).get(plotEventId, userId);

    if (!existing) {
      res.status(404).json({ message: 'Plot event not found' });
      return;
    }

    // If chapter_id is provided, verify it belongs to the same project
    if (chapter_id) {
      const chapter = db.prepare('SELECT id FROM chapters WHERE id = ? AND project_id = ?').get(chapter_id, existing.project_id);
      if (!chapter) {
        res.status(400).json({ message: 'Chapter not found in this project' });
        return;
      }
    }

    console.log('[PlotEvents] Updating plot event:', plotEventId);
    db.prepare(
      `UPDATE plot_events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        chapter_id = ?,
        event_type = COALESCE(?, event_type),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title || null,
      description || null,
      chapter_id !== undefined ? chapter_id : null,
      event_type || null,
      plotEventId
    );

    const plotEvent = db.prepare('SELECT * FROM plot_events WHERE id = ?').get(plotEventId);
    console.log('[PlotEvents] Plot event updated successfully:', plotEventId);

    res.json({ message: 'Plot event updated successfully', plotEvent });
  } catch (error) {
    console.error('[PlotEvents] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/plot-events/:id - Delete plot event
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/plot-events/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const plotEventId = req.params.id;

    // Verify ownership
    const existing = db.prepare(
      `SELECT pe.id FROM plot_events pe
       JOIN projects p ON pe.project_id = p.id
       WHERE pe.id = ? AND p.user_id = ?`
    ).get(plotEventId, userId);

    if (!existing) {
      res.status(404).json({ message: 'Plot event not found' });
      return;
    }

    console.log('[PlotEvents] Deleting plot event:', plotEventId);
    const result = db.prepare(
      `DELETE FROM plot_events
       WHERE id = ?`
    ).run(plotEventId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Plot event not found' });
      return;
    }

    console.log('[PlotEvents] Plot event deleted successfully:', plotEventId);
    res.json({ message: 'Plot event deleted successfully' });
  } catch (error) {
    console.error('[PlotEvents] Delete error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
