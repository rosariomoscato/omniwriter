// @ts-nocheck
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/projects/:id/chapters - Get all chapters for a project
router.get('/projects/:id/chapters', authenticateToken, (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify project belongs to user
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const chapters = db.prepare(
      'SELECT id, project_id, title, content, order_index, status, word_count, created_at, updated_at FROM chapters WHERE project_id = ? ORDER BY order_index ASC'
    ).all(projectId);

    res.json({ chapters });
  } catch (error) {
    console.error('[Chapters] Error fetching chapters:', error);
    res.status(500).json({ message: 'Failed to fetch chapters' });
  }
});

// POST /api/projects/:id/chapters - Create a new chapter
router.post('/projects/:id/chapters', authenticateToken, (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { title } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Chapter title is required' });
    }

    // Verify project belongs to user
    const project = db.prepare('SELECT id, area FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get next order index
    const lastChapter = db.prepare('SELECT MAX(order_index) as max_order FROM chapters WHERE project_id = ?').get(projectId) as { max_order: number | null };
    const nextOrderIndex = (lastChapter?.max_order ?? -1) + 1;

    // Create chapter
    const chapterId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO chapters (id, project_id, title, content, order_index, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      chapterId,
      projectId,
      title.trim(),
      '',
      nextOrderIndex,
      'draft',
      0,
      now,
      now
    );

    // Fetch created chapter
    const chapter = db.prepare(
      'SELECT id, project_id, title, content, order_index, status, word_count, created_at, updated_at FROM chapters WHERE id = ?'
    ).get(chapterId);

    console.log(`[Chapters] Created chapter "${title}" for project ${projectId}`);
    res.status(201).json({ chapter });
  } catch (error) {
    console.error('[Chapters] Error creating chapter:', error);
    res.status(500).json({ message: 'Failed to create chapter' });
  }
});

// GET /api/chapters/:id - Get a single chapter
router.get('/chapters/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    const chapter = db.prepare(`
      SELECT c.id, c.project_id, c.title, c.content, c.order_index, c.status, c.word_count, c.created_at, c.updated_at
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId);

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    res.json({ chapter });
  } catch (error) {
    console.error('[Chapters] Error fetching chapter:', error);
    res.status(500).json({ message: 'Failed to fetch chapter' });
  }
});

// PUT /api/chapters/:id - Update a chapter
router.put('/chapters/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const existingChapter = db.prepare(`
      SELECT c.id
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId);

    if (!existingChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`UPDATE chapters SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    // Fetch updated chapter
    const chapter = db.prepare(`
      SELECT id, project_id, title, content, order_index, status, word_count, created_at, updated_at
      FROM chapters WHERE id = ?
    `).get(id);

    console.log(`[Chapters] Updated chapter ${id}`);
    res.json({ chapter });
  } catch (error) {
    console.error('[Chapters] Error updating chapter:', error);
    res.status(500).json({ message: 'Failed to update chapter' });
  }
});

// DELETE /api/chapters/:id - Delete a chapter
router.delete('/chapters/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const existingChapter = db.prepare(`
      SELECT c.id, c.project_id
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; project_id: string } | undefined;

    if (!existingChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Delete chapter
    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);

    // Reorder remaining chapters
    db.prepare(`
      UPDATE chapters SET order_index = order_index - 1
      WHERE project_id = ? AND order_index > (
        SELECT order_index FROM (SELECT order_index FROM chapters WHERE id = ?) AS tmp
      )
    `).run(existingChapter.project_id, id);

    console.log(`[Chapters] Deleted chapter ${id}`);
    res.status(204).send();
  } catch (error) {
    console.error('[Chapters] Error deleting chapter:', error);
    res.status(500).json({ message: 'Failed to delete chapter' });
  }
});

// PUT /api/chapters/:id/reorder - Reorder chapters
router.put('/chapters/:id/reorder', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { newOrderIndex } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    if (typeof newOrderIndex !== 'number' || newOrderIndex < 0) {
      return res.status(400).json({ message: 'Invalid order index' });
    }

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.project_id, c.order_index
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; project_id: string; order_index: number } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const oldOrderIndex = chapter.order_index;

    if (oldOrderIndex === newOrderIndex) {
      return res.json({ message: 'No change needed' });
    }

    // Update order indices
    if (newOrderIndex > oldOrderIndex) {
      // Moving down: decrement items between old and new position
      db.prepare(`
        UPDATE chapters SET order_index = order_index - 1
        WHERE project_id = ? AND order_index > ? AND order_index <= ?
      `).run(chapter.project_id, oldOrderIndex, newOrderIndex);
    } else {
      // Moving up: increment items between new and old position
      db.prepare(`
        UPDATE chapters SET order_index = order_index + 1
        WHERE project_id = ? AND order_index >= ? AND order_index < ?
      `).run(chapter.project_id, newOrderIndex, oldOrderIndex);
    }

    // Update moved chapter
    db.prepare('UPDATE chapters SET order_index = ? WHERE id = ?').run(newOrderIndex, id);

    console.log(`[Chapters] Reordered chapter ${id} from ${oldOrderIndex} to ${newOrderIndex}`);
    res.json({ message: 'Chapter reordered successfully' });
  } catch (error) {
    console.error('[Chapters] Error reordering chapter:', error);
    res.status(500).json({ message: 'Failed to reorder chapter' });
  }
});

export default router;
