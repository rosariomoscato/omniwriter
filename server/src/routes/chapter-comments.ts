import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/chapters/:id/comments - Get all comments for a chapter
router.get('/chapters/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id: chapterId } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(chapterId, userId);

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const comments = db.prepare(`
      SELECT cc.id, cc.chapter_id, cc.text, cc.start_pos, cc.end_pos, cc.created_at, cc.updated_at,
             u.id as user_id, u.name as user_name, u.avatar_url as user_avatar
      FROM chapter_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.chapter_id = ?
      ORDER BY cc.created_at ASC
    `).all(chapterId);

    res.json({ comments });
  } catch (error) {
    console.error('[ChapterComments] Error fetching comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// POST /api/chapters/:id/comments - Create a new comment
router.post('/chapters/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id: chapterId } = req.params;
    const { text, start_pos, end_pos } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Validate required fields
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    if (typeof start_pos !== 'number' || typeof end_pos !== 'number') {
      return res.status(400).json({ message: 'start_pos and end_pos are required' });
    }

    if (start_pos < 0 || end_pos < 0 || start_pos > end_pos) {
      return res.status(400).json({ message: 'Invalid position values' });
    }

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.content
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(chapterId, userId) as { id: string; content: string } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Validate positions are within content length
    if (end_pos > chapter.content.length) {
      return res.status(400).json({ message: 'Position exceeds content length' });
    }

    // Create comment
    const commentId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO chapter_comments (id, chapter_id, user_id, text, start_pos, end_pos, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(commentId, chapterId, userId, text.trim(), start_pos, end_pos, now, now);

    // Fetch created comment with user info
    const comment = db.prepare(`
      SELECT cc.id, cc.chapter_id, cc.text, cc.start_pos, cc.end_pos, cc.created_at, cc.updated_at,
             u.id as user_id, u.name as user_name, u.avatar_url as user_avatar
      FROM chapter_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.id = ?
    `).get(commentId);

    console.log(`[ChapterComments] Created comment ${commentId} for chapter ${chapterId}`);
    res.status(201).json({ comment });
  } catch (error) {
    console.error('[ChapterComments] Error creating comment:', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

// PUT /api/chapter-comments/:id - Update a comment
router.put('/chapter-comments/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    // Verify comment exists and belongs to user
    const existingComment = db.prepare(`
      SELECT cc.id, cc.chapter_id, cc.user_id
      FROM chapter_comments cc
      JOIN chapters c ON cc.chapter_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE cc.id = ?
    `).get(id) as { id: string; chapter_id: string; user_id: string } | undefined;

    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    // Update comment
    db.prepare('UPDATE chapter_comments SET text = ?, updated_at = ? WHERE id = ?')
      .run(text.trim(), new Date().toISOString(), id);

    // Fetch updated comment
    const comment = db.prepare(`
      SELECT cc.id, cc.chapter_id, cc.text, cc.start_pos, cc.end_pos, cc.created_at, cc.updated_at,
             u.id as user_id, u.name as user_name, u.avatar_url as user_avatar
      FROM chapter_comments cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.id = ?
    `).get(id);

    console.log(`[ChapterComments] Updated comment ${id}`);
    res.json({ comment });
  } catch (error) {
    console.error('[ChapterComments] Error updating comment:', error);
    res.status(500).json({ message: 'Failed to update comment' });
  }
});

// DELETE /api/chapter-comments/:id - Delete a comment
router.delete('/chapter-comments/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify comment exists and belongs to user
    const existingComment = db.prepare(`
      SELECT cc.id, cc.user_id
      FROM chapter_comments cc
      JOIN chapters c ON cc.chapter_id = c.id
      JOIN projects p ON c.project_id = p.id
      WHERE cc.id = ?
    `).get(id) as { id: string; user_id: string } | undefined;

    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    // Delete comment
    db.prepare('DELETE FROM chapter_comments WHERE id = ?').run(id);

    console.log(`[ChapterComments] Deleted comment ${id}`);
    res.status(204).send();
  } catch (error) {
    console.error('[ChapterComments] Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

export default router;
