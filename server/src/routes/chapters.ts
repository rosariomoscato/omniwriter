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
      SELECT c.id, c.content, c.title
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; content: string; title: string } | undefined;

    if (!existingChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let contentChanged = false;

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (content !== undefined) {
      // Check if content actually changed
      if (content !== existingChapter.content) {
        contentChanged = true;
      }
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

    // If content changed, create a version entry before updating
    if (contentChanged && existingChapter.content) {
      const lastVersion = db.prepare(
        'SELECT version_number FROM chapter_versions WHERE chapter_id = ? ORDER BY version_number DESC LIMIT 1'
      ).get(id) as { version_number: number } | undefined;

      const nextVersionNumber = (lastVersion?.version_number ?? 0) + 1;

      const versionId = uuidv4();
      db.prepare(`
        INSERT INTO chapter_versions (id, chapter_id, content, version_number, created_at, change_description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        versionId,
        id,
        existingChapter.content,
        nextVersionNumber,
        new Date().toISOString(),
        `Auto-saved before edit`
      );

      console.log(`[ChapterVersions] Created version ${nextVersionNumber} for chapter ${id}`);
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

// GET /api/chapters/:id/versions - Get all versions of a chapter
router.get('/chapters/:id/versions', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId);

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const versions = db.prepare(`
      SELECT id, chapter_id, version_number, created_at, change_description
      FROM chapter_versions
      WHERE chapter_id = ?
      ORDER BY version_number DESC
    `).all(id);

    console.log(`[ChapterVersions] Fetched ${versions.length} versions for chapter ${id}`);
    res.json({ versions });
  } catch (error) {
    console.error('[ChapterVersions] Error fetching versions:', error);
    res.status(500).json({ message: 'Failed to fetch versions' });
  }
});

// GET /api/chapters/:id/versions/:versionId - Get a specific version
router.get('/chapters/:id/versions/:versionId', authenticateToken, (req, res) => {
  try {
    const { id, versionId } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId);

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const version = db.prepare(`
      SELECT id, chapter_id, content, version_number, created_at, change_description
      FROM chapter_versions
      WHERE id = ? AND chapter_id = ?
    `).get(versionId, id);

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    console.log(`[ChapterVersions] Fetched version ${version.version_number} for chapter ${id}`);
    res.json({ version });
  } catch (error) {
    console.error('[ChapterVersions] Error fetching version:', error);
    res.status(500).json({ message: 'Failed to fetch version' });
  }
});

// POST /api/chapters/:id/restore/:versionId - Restore a chapter to a specific version
router.post('/chapters/:id/restore/:versionId', authenticateToken, (req, res) => {
  try {
    const { id, versionId } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const existingChapter = db.prepare(`
      SELECT c.id, c.content
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; content: string } | undefined;

    if (!existingChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Get the version to restore
    const version = db.prepare(`
      SELECT id, content, version_number
      FROM chapter_versions
      WHERE id = ? AND chapter_id = ?
    `).get(versionId, id) as { id: string; content: string; version_number: number } | undefined;

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Create a version entry of current content before restoring
    const lastVersion = db.prepare(
      'SELECT version_number FROM chapter_versions WHERE chapter_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(id) as { version_number: number } | undefined;

    const nextVersionNumber = (lastVersion?.version_number ?? 0) + 1;
    const newVersionId = uuidv4();

    db.prepare(`
      INSERT INTO chapter_versions (id, chapter_id, content, version_number, created_at, change_description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      newVersionId,
      id,
      existingChapter.content,
      nextVersionNumber,
      new Date().toISOString(),
      `Auto-saved before restoring to version ${version.version_number}`
    );

    // Update chapter with restored content
    db.prepare('UPDATE chapters SET content = ?, updated_at = ? WHERE id = ?').run(
      version.content,
      new Date().toISOString(),
      id
    );

    // Fetch updated chapter
    const chapter = db.prepare(`
      SELECT id, project_id, title, content, order_index, status, word_count, created_at, updated_at
      FROM chapters WHERE id = ?
    `).get(id);

    console.log(`[ChapterVersions] Restored chapter ${id} to version ${version.version_number}`);
    res.json({ chapter });
  } catch (error) {
    console.error('[ChapterVersions] Error restoring version:', error);
    res.status(500).json({ message: 'Failed to restore version' });
  }
});

// POST /api/chapters/:id/generate-headlines - Generate headline options for Redattore articles
router.post('/chapters/:id/generate-headlines', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, p.area, p.settings_json
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; title: string; content: string; area: string; settings_json: string } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Only allow headline generation for Redattore area
    if (chapter.area !== 'redattore') {
      return res.status(400).json({ message: 'Headline generation is only available for Redattore articles' });
    }

    // Generate headline options (simulated AI response for now)
    // In production, this would call an AI service
    const contentToAnalyze = chapter.content || chapter.title || '';
    const settings = JSON.parse(chapter.settings_json || '{}');

    // Generate 5 headline variations
    const headlineOptions = [
      {
        id: 'h1',
        text: chapter.title || 'Titolo principale dell\'articolo',
        style: 'Diretto e chiaro'
      },
      {
        id: 'h2',
        text: `Scopri ${chapter.title ? 'tutto su ' + chapter.title.toLowerCase() : 'i dettagli dell\'articolo'}`,
        style: 'Informativo'
      },
      {
        id: 'h3',
        text: `Perché ${chapter.title ? chapter.title : 'questo argomento'} conta più di quanto pensi`,
        style: 'Coinvolgente'
      },
      {
        id: 'h4',
        text: `${chapter.title || 'L\'argomento'}: ${settings.seoKeywords ? 'una guida completa' : 'tutto quello che devi sapere'}`,
        style: 'Guida pratica'
      },
      {
        id: 'h5',
        text: `Analisi approfondita: ${chapter.title || 'tema dell\'articolo'}`,
        style: 'Professionale'
      }
    ];

    console.log(`[Redattore] Generated ${headlineOptions.length} headline options for chapter ${id}`);
    res.json({ headlines: headlineOptions });
  } catch (error) {
    console.error('[Redattore] Error generating headlines:', error);
    res.status(500).json({ message: 'Failed to generate headlines' });
  }
});

// POST /api/chapters/:id/generate-social-snippets - Generate social media snippets for Redattore articles
router.post('/chapters/:id/generate-social-snippets', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, p.area, p.settings_json
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; title: string; content: string; area: string; settings_json: string } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Only allow social snippet generation for Redattore area
    if (chapter.area !== 'redattore') {
      return res.status(400).json({ message: 'Social snippet generation is only available for Redattore articles' });
    }

    // Generate social media snippets (simulated AI response for now)
    const contentToAnalyze = chapter.content || chapter.title || '';
    const articleTitle = chapter.title || 'Articolo';

    // Extract key points from content (simplified)
    const excerpt = contentToAnalyze.length > 200
      ? contentToAnalyze.substring(0, 200) + '...'
      : contentToAnalyze;

    const socialSnippets = {
      twitter: [
        {
          id: 'tw1',
          text: `${articleTitle}\n\n🔗 Leggi tutto sull'articolo\n\n${excerpt.substring(0, 100)}...`,
          characterCount: `${articleTitle}\n\n🔗 Leggi tutto sull'articolo\n\n${excerpt.substring(0, 100)}...`.length,
          hashtags: ['#journalism', '#article', '#news']
        },
        {
          id: 'tw2',
          text: `🚀 Novità: ${articleTitle}\n\n${excerpt.substring(0, 80)}...`,
          characterCount: `🚀 Novità: ${articleTitle}\n\n${excerpt.substring(0, 80)}...`.length,
          hashtags: ['#breaking', '#update']
        }
      ],
      linkedin: [
        {
          id: 'li1',
          text: `${articleTitle}\n\nPubblichiamo regolarmente contenuti su questo argomento. Seguici per restare aggiornato!\n\n${excerpt.substring(0, 150)}...`,
          characterCount: `${articleTitle}\n\nPubblichiamo regolarmente contenuti su questo argomento. Seguici per restare aggiornato!\n\n${excerpt.substring(0, 150)}...`.length
        }
      ],
      facebook: [
        {
          id: 'fb1',
          text: `${articleTitle}\n\n${excerpt}\n\n👍 Metti like se ti piace questo contenuto!\n💬 Commenta e condividi la tua opinione`,
          characterCount: `${articleTitle}\n\n${excerpt}\n\n👍 Metti like se ti piace questo contenuto!\n💬 Commenta e condividi la tua opinione`.length
        }
      ],
      instagram: [
        {
          id: 'ig1',
          text: `${articleTitle}\n\n${excerpt.substring(0, 50)}...\n\nLink in bio 👆`,
          characterCount: `${articleTitle}\n\n${excerpt.substring(0, 50)}...\n\nLink in bio 👆`.length,
          hashtags: ['#content', '#creator', '#writing']
        }
      ]
    };

    console.log(`[Redattore] Generated social snippets for chapter ${id}`);
    res.json({ snippets: socialSnippets });
  } catch (error) {
    console.error('[Redattore] Error generating social snippets:', error);
    res.status(500).json({ message: 'Failed to generate social snippets' });
  }
});

export default router;
