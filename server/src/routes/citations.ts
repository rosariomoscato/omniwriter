import { Router } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken } from '../middleware/auth';
import { param } from 'express-validator';

const router = Router();

// Get all citations for a project
router.get('/projects/:projectId/citations', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;

    // Verify project belongs to user
    const project = getDatabase().prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const citations = getDatabase().prepare(
      `SELECT * FROM citations WHERE project_id = ? ORDER BY order_index ASC`
    ).all(projectId);

    res.json({ citations });
  } catch (error) {
    console.error('Error fetching citations:', error);
    res.status(500).json({ message: 'Failed to fetch citations' });
  }
});

// Get citations for a specific chapter
router.get('/chapters/:chapterId/citations', authenticateToken, (req, res) => {
  try {
    const { chapterId } = req.params;
    const userId = (req as any).user.id;

    // Verify chapter belongs to user's project
    const chapter = getDatabase().prepare(
      `SELECT c.id FROM chapters c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.user_id = ?`
    ).get(chapterId, userId);

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const citations = getDatabase().prepare(
      `SELECT * FROM citations WHERE chapter_id = ? ORDER BY order_index ASC`
    ).all(chapterId);

    res.json({ citations });
  } catch (error) {
    console.error('Error fetching citations:', error);
    res.status(500).json({ message: 'Failed to fetch citations' });
  }
});

// Create a new citation
router.post('/projects/:projectId/citations', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;
    const { title, authors, publication_year, publisher, url, page_numbers, citation_type, notes, chapter_id } = req.body;

    // Verify project belongs to user
    const project = getDatabase().prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // If chapter_id is provided, verify it belongs to this project
    if (chapter_id) {
      const chapter = getDatabase().prepare(
        'SELECT id FROM chapters WHERE id = ? AND project_id = ?'
      ).get(chapter_id, projectId);

      if (!chapter) {
        return res.status(400).json({ message: 'Chapter not found in this project' });
      }
    }

    // Get the next order index
    const maxOrder = getDatabase().prepare(
      'SELECT MAX(order_index) as max_order FROM citations WHERE project_id = ?'
    ).get(projectId) as { max_order: number } | { max_order: null };

    const nextOrderIndex = (maxOrder || 0) + 1;

    const citationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const stmt = getDatabase().prepare(`
      INSERT INTO citations (
        id, project_id, chapter_id, title, authors, publication_year,
        publisher, url, page_numbers, citation_type, notes, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      citationId,
      projectId,
      chapter_id || null,
      title || '',
      authors || '',
      publication_year || null,
      publisher || '',
      url || '',
      page_numbers || '',
      citation_type || 'book',
      notes || '',
      nextOrderIndex
    );

    const citation = getDatabase().prepare('SELECT * FROM citations WHERE id = ?').get(citationId);

    res.status(201).json({ citation });
  } catch (error) {
    console.error('Error creating citation:', error);
    res.status(500).json({ message: 'Failed to create citation' });
  }
});

// Update a citation
router.put('/citations/:citationId', authenticateToken, (req, res) => {
  try {
    const { citationId } = req.params;
    const userId = (req as any).user.id;
    const { title, authors, publication_year, publisher, url, page_numbers, citation_type, notes } = req.body;

    // Verify citation belongs to user's project
    const citation = getDatabase().prepare(
      `SELECT c.id FROM citations c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.user_id = ?`
    ).get(citationId, userId);

    if (!citation) {
      return res.status(404).json({ message: 'Citation not found' });
    }

    const stmt = getDatabase().prepare(`
      UPDATE citations
      SET title = ?, authors = ?, publication_year = ?, publisher = ?,
          url = ?, page_numbers = ?, citation_type = ?, notes = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      title || '',
      authors || '',
      publication_year || null,
      publisher || '',
      url || '',
      page_numbers || '',
      citation_type || 'book',
      notes || '',
      citationId
    );

    const updatedCitation = getDatabase().prepare('SELECT * FROM citations WHERE id = ?').get(citationId);

    res.json({ citation: updatedCitation });
  } catch (error) {
    console.error('Error updating citation:', error);
    res.status(500).json({ message: 'Failed to update citation' });
  }
});

// Delete a citation
router.delete('/citations/:citationId', authenticateToken, (req, res) => {
  try {
    const { citationId } = req.params;
    const userId = (req as any).user.id;

    // Verify citation belongs to user's project
    const citation = getDatabase().prepare(
      `SELECT c.id FROM citations c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.user_id = ?`
    ).get(citationId, userId);

    if (!citation) {
      return res.status(404).json({ message: 'Citation not found' });
    }

    getDatabase().prepare('DELETE FROM citations WHERE id = ?').run(citationId);

    res.json({ message: 'Citation deleted successfully' });
  } catch (error) {
    console.error('Error deleting citation:', error);
    res.status(500).json({ message: 'Failed to delete citation' });
  }
});

// Reorder citations
router.put('/projects/:projectId/citations/reorder', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;
    const { citationIds } = req.body;

    // Verify project belongs to user
    const project = getDatabase().prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!Array.isArray(citationIds)) {
      return res.status(400).json({ message: 'citationIds must be an array' });
    }

    // Update order for each citation
    const stmt = getDatabase().prepare(
      'UPDATE citations SET order_index = ? WHERE id = ? AND project_id = ?'
    );

    citationIds.forEach((citationId: string, index: number) => {
      stmt.run(index, citationId, projectId);
    });

    res.json({ message: 'Citations reordered successfully' });
  } catch (error) {
    console.error('Error reordering citations:', error);
    res.status(500).json({ message: 'Failed to reorder citations' });
  }
});

// Generate bibliography for a project
router.get('/projects/:projectId/bibliography', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;

    // Verify project belongs to user
    const project = getDatabase().prepare(
      'SELECT id, title FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const citations = getDatabase().prepare(
      `SELECT * FROM citations WHERE project_id = ? ORDER BY order_index ASC`
    ).all(projectId);

    // Format citations based on type
    const formattedCitations = citations.map((citation: any) => {
      const authorsList = citation.authors || '';
      const year = citation.publication_year || '';
      const title = citation.title || '';

      switch (citation.citation_type) {
        case 'book':
          return `${authorsList} (${year}). ${title}. ${citation.publisher || ''}.`;

        case 'journal':
          return `${authorsList} (${year}). ${title}. ${citation.publisher || ''}.`;

        case 'website':
          return `${authorsList || 'Unknown Author'} (${year || 'n.d.'). ${title}. Retrieved from ${citation.url || 'Unknown URL'}`;

        case 'report':
          return `${authorsList} (${year}). ${title}. ${citation.publisher || ''}`;

        default:
          return `${authorsList} (${year}). ${title}`;
      }
    });

    res.json({
      project_title: project.title,
      citations: formattedCitations,
      total: formattedCitations.length
    });
  } catch (error) {
    console.error('Error generating bibliography:', error);
    res.status(500).json({ message: 'Failed to generate bibliography' });
  }
});

export default router;
