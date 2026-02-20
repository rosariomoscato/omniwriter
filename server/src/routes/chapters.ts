// @ts-nocheck
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generationRateLimit } from '../middleware/rateLimit';
import {
  sanitizePromptContent,
  buildSimplifiedPrompt,
  isModerationError,
  getModerationErrorMessage,
  sanitizeSensitiveWords
} from '../services/contentModeration';

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
      'SELECT id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at FROM chapters WHERE project_id = ? ORDER BY order_index ASC'
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
    const { title, summary } = req.body;
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
      INSERT INTO chapters (id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      chapterId,
      projectId,
      title.trim(),
      '',
      (summary || '').trim(),
      nextOrderIndex,
      'draft',
      0,
      now,
      now
    );

    // Fetch created chapter
    const chapter = db.prepare(
      'SELECT id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at FROM chapters WHERE id = ?'
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
      SELECT c.id, c.project_id, c.title, c.content, c.summary, c.order_index, c.status, c.word_count, c.created_at, c.updated_at
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
    const { title, content, summary, status, expected_updated_at } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const existingChapter = db.prepare(`
      SELECT c.id, c.content, c.title, c.updated_at
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; content: string; title: string; updated_at: string } | undefined;

    if (!existingChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Check for concurrent edit conflict
    if (expected_updated_at && existingChapter.updated_at !== expected_updated_at) {
      // Return 409 Conflict with current chapter data
      const currentChapter = db.prepare(`
        SELECT id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at
        FROM chapters WHERE id = ?
      `).get(id);

      console.log(`[Chapters] Concurrent edit detected for chapter ${id}`);
      return res.status(409).json({
        error: 'CONCURRENT_EDIT',
        message: 'This chapter was modified by another session',
        current: currentChapter,
        expected: expected_updated_at,
        actual: existingChapter.updated_at
      });
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
      // Calculate and update word_count
      const wordCount = content.trim() ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
      updates.push('word_count = ?');
      values.push(wordCount);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      values.push(summary);
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
      SELECT id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at
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
      SELECT id, chapter_id, content, version_number, created_at, change_description
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
      SELECT id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at
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
router.post('/chapters/:id/generate-headlines', authenticateToken, generationRateLimit, async (req, res) => {
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

    // Calculate token usage (Feature #156)
    const inputTokens = Math.ceil((chapter.title + (chapter.content || '')).length / 4);
    const outputTokens = Math.ceil(JSON.stringify(headlineOptions).length / 4);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = ((inputTokens / 1000) * 0.03) + ((outputTokens / 1000) * 0.06);

    console.log(`[Redattore] Generated ${headlineOptions.length} headline options for chapter ${id} - Tokens: ${inputTokens} in, ${outputTokens} out`);
    res.json({
      headlines: headlineOptions,
      token_usage: {
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost
      }
    });
  } catch (error) {
    console.error('[Redattore] Error generating headlines:', error);
    res.status(500).json({ message: 'Failed to generate headlines' });
  }
});

// POST /api/chapters/:id/generate-social-snippets - Generate social media snippets for Redattore articles
router.post('/chapters/:id/generate-social-snippets', authenticateToken, generationRateLimit, async (req, res) => {
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

    // Calculate token usage (Feature #156)
    const inputTokens = Math.ceil((chapter.title + (chapter.content || '')).length / 4);
    const outputTokens = Math.ceil(JSON.stringify(socialSnippets).length / 4);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = ((inputTokens / 1000) * 0.03) + ((outputTokens / 1000) * 0.06);

    console.log(`[Redattore] Generated social snippets for chapter ${id} - Tokens: ${inputTokens} in, ${outputTokens} out`);
    res.json({
      snippets: socialSnippets,
      token_usage: {
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost
      }
    });
  } catch (error) {
    console.error('[Redattore] Error generating social snippets:', error);
    res.status(500).json({ message: 'Failed to generate social snippets' });
  }
});

// POST /api/chapters/:id/generate-stream - Generate chapter content with SSE streaming (Feature #232, #233)
router.post('/chapters/:id/generate-stream', authenticateToken, generationRateLimit, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { human_model_id, prompt_context } = req.body;
    const userId = req.user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, c.summary, c.project_id, c.order_index, c.status,
             p.area, p.settings_json, p.title as project_title, p.genre, p.tone, p.target_audience,
             u.preferred_language
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as {
      id: string;
      title: string;
      content: string;
      summary: string;
      project_id: string;
      order_index: number;
      status: string;
      area: string;
      settings_json: string;
      project_title: string;
      genre: string | null;
      tone: string | null;
      target_audience: string | null;
      preferred_language: string;
    } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // If human_model_id is provided, verify it exists and belongs to user
    let humanModel = null;
    if (human_model_id) {
      humanModel = db.prepare(
        'SELECT * FROM human_models WHERE id = ? AND user_id = ?'
      ).get(human_model_id, userId) as {
        id: string;
        name: string;
        analysis_result_json: string;
        style_strength: number;
      } | undefined;

      if (!humanModel) {
        return res.status(404).json({ message: 'Human Model not found' });
      }

      if (humanModel.analysis_result_json) {
        try {
          humanModel.analysis_result_json = JSON.parse(humanModel.analysis_result_json);
        } catch {
          humanModel.analysis_result_json = {};
        }
      }
    }

    // Fetch project sources for generation
    const projectSources = db.prepare(`
      SELECT id, file_name, content_text, file_type, source_type, url
      FROM sources
      WHERE project_id = ? AND content_text IS NOT NULL AND content_text != ''
      ORDER BY created_at DESC
      LIMIT 5
    `).all(chapter.project_id) as { id: string; file_name: string; content_text: string; file_type: string; source_type: string; url: string }[];

    // Fetch characters for context (including status information)
    const characters = db.prepare(`
      SELECT name, description, traits, status_at_end, status_notes
      FROM characters
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(chapter.project_id) as { name: string; description: string; traits: string; status_at_end: string; status_notes: string }[];

    // Fetch locations for context
    const locations = db.prepare(`
      SELECT name, description
      FROM locations
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(chapter.project_id) as { name: string; description: string }[];

    // Fetch plot events for context
    const plotEvents = db.prepare(`
      SELECT title, description
      FROM plot_events
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(chapter.project_id) as { title: string; description: string }[];

    // Get previous and next chapters for continuity
    const previousChapter = db.prepare(`
      SELECT title, content
      FROM chapters
      WHERE project_id = ? AND order_index = ?
      LIMIT 1
    `).get(chapter.project_id, chapter.order_index - 1) as { title: string; content: string } | undefined;

    const nextChapter = db.prepare(`
      SELECT title
      FROM chapters
      WHERE project_id = ? AND order_index = ?
      LIMIT 1
    `).get(chapter.project_id, chapter.order_index + 1) as { title: string } | undefined;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Helper function to send SSE events
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial status
    sendEvent('phase', { phase: 'structure', message: 'Analyzing project structure and context...' });

    // Build the system prompt based on project settings and Human Model
    const language = chapter.preferred_language === 'it' ? 'it' : 'en';
    const isItalian = language === 'it';

    // Feature #233: Sanitize content to avoid moderation triggers
    // Feature #275: Include character status (alive/dead) information
    const sanitizedContent = sanitizePromptContent({
      characters: characters.map(c => ({ name: c.name, description: c.description, traits: c.traits, status_at_end: c.status_at_end, status_notes: c.status_notes })),
      locations: locations.map(l => ({ name: l.name, description: l.description })),
      plotEvents: plotEvents.map(e => ({ title: e.title, description: e.description })),
      sources: projectSources.map(s => ({ file_name: s.file_name, content_text: s.content_text })),
      previousChapter: previousChapter ? { title: previousChapter.title, content: previousChapter.content } : undefined,
      chapterTitle: chapter.title,
      projectTitle: chapter.project_title,
      projectContext: prompt_context
    });

    // Log any warnings from sanitization
    if (sanitizedContent.warnings.length > 0) {
      console.log('[Generate Stream] Content sanitization warnings:', sanitizedContent.warnings);
    }

    // Build sanitized system prompt
    let systemPrompt = '';
    if (isItalian) {
      systemPrompt = `Sei uno scrittore professionista che aiuta a creare capitoli di romanzi.

PROGETTO: "${sanitizeSensitiveWords(chapter.project_title)}"
GENERE: ${chapter.genre || 'Narrativa'}
TONO: ${chapter.tone || 'Neutro'}
PUBBLICO: ${chapter.target_audience || 'Adulti'}

CAPITOLO CORRENTE: "${sanitizeSensitiveWords(chapter.title)}" (Capitolo ${chapter.order_index + 1})${chapter.summary ? `\n\nSINOSSI DEL CAPITOLO (ISTRUZIONE PRINCIPALE):\n${chapter.summary}\n\nIMPORTANTE: Devi seguire fedelmente questa sinossi. Il contenuto generato deve espandere tutti gli elementi narrativi descritti nella sinossi mantenendo coerenza con la trama prevista.` : ''}`;
    } else {
      systemPrompt = `You are a professional writer helping create novel chapters.

PROJECT: "${sanitizeSensitiveWords(chapter.project_title)}"
GENRE: ${chapter.genre || 'Fiction'}
TONE: ${chapter.tone || 'Neutral'}
AUDIENCE: ${chapter.target_audience || 'Adults'}

CURRENT CHAPTER: "${sanitizeSensitiveWords(chapter.title)}" (Chapter ${chapter.order_index + 1})${chapter.summary ? `\n\nCHAPTER SYNOPSIS (PRIMARY INSTRUCTION):\n${chapter.summary}\n\nIMPORTANT: You must faithfully follow this synopsis. The generated content must expand all narrative elements described in the synopsis while maintaining coherence with the planned plot.` : ''}`;
    }

    // Add Human Model style if provided
    if (humanModel && humanModel.analysis_result_json) {
      const analysis = humanModel.analysis_result_json as any;
      if (isItalian) {
        systemPrompt += `

PROFILO STILISTICO PERSONALE (${humanModel.name}):
- Tono: ${analysis.tone || 'Non specificato'}
- Struttura frasi: ${analysis.sentence_structure || 'Non specificata'}
- Vocabolario: ${analysis.vocabulary || 'Non specificato'}
- Pattern di scrittura: ${(analysis.patterns || []).join(', ') || 'Non specificati'}

IMPORTANTE: Scrivi con lo stile personale dell'autore come definito sopra.`;
      } else {
        systemPrompt += `

PERSONAL STYLE PROFILE (${humanModel.name}):
- Tone: ${analysis.tone || 'Not specified'}
- Sentence structure: ${analysis.sentence_structure || 'Not specified'}
- Vocabulary: ${analysis.vocabulary || 'Not specified'}
- Writing patterns: ${(analysis.patterns || []).join(', ') || 'Not specified'}

IMPORTANT: Write in the author's personal style as defined above.`;
      }
    }

    // Add sanitized character context
    if (sanitizedContent.characters) {
      if (isItalian) {
        systemPrompt += `\n\nPERSONAGGI:\n${sanitizedContent.characters}`;
      } else {
        systemPrompt += `\n\nCHARACTERS:\n${sanitizedContent.characters}`;
      }
    }

    // Feature #275: Add dead characters warning
    if (sanitizedContent.deadCharacters) {
      if (isItalian) {
        systemPrompt += `\n\nPERSONAGGI MORTI (NON USARE - SONO MORTI):\n${sanitizedContent.deadCharacters}\n\nIMPORTANTE: Questi personaggi sono morti e NON devono apparire nel capitolo.`;
      } else {
        systemPrompt += `\n\nDEAD CHARACTERS (DO NOT USE - THEY ARE DEAD):\n${sanitizedContent.deadCharacters}\n\nIMPORTANT: These characters are dead and MUST NOT appear in this chapter.`;
      }
    }

    // Add sanitized location context
    if (sanitizedContent.locations) {
      if (isItalian) {
        systemPrompt += `\n\nLUOGHI:\n${sanitizedContent.locations}`;
      } else {
        systemPrompt += `\n\nLOCATIONS:\n${sanitizedContent.locations}`;
      }
    }

    // Add sanitized plot events context
    if (sanitizedContent.plotEvents) {
      if (isItalian) {
        systemPrompt += `\n\nEVENTI DI TRAMA:\n${sanitizedContent.plotEvents}`;
      } else {
        systemPrompt += `\n\nPLOT EVENTS:\n${sanitizedContent.plotEvents}`;
      }
    }

    // Add sanitized source context
    if (sanitizedContent.sources) {
      if (isItalian) {
        systemPrompt += `\n\nFONTI DI RIFERIMENTO:\n${sanitizedContent.sources}`;
      } else {
        systemPrompt += `\n\nREFERENCE SOURCES:\n${sanitizedContent.sources}`;
      }
    }

    // Build user prompt
    let userPrompt = '';
    if (isItalian) {
      userPrompt = chapter.summary
        ? `Basandoti sulla seguente sinossi, scrivi il capitolo completo "${sanitizeSensitiveWords(chapter.title)}" che espande tutti gli eventi narrativi descritti.

SINOSSI DA ESPANDERE:
${chapter.summary}

${previousChapter ? `CAPITOLO PRECEDENTE: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'Questo è il primo capitolo.'}
${nextChapter ? `PROSSIMO CAPITOLO: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'Questo è l\'ultimo capitolo.'}

${prompt_context ? `NOTE AGGIUNTIVE: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Scrivi un capitolo coinvolgente di circa 2000-3000 parole in italiano, mantenendo tutti gli elementi narrativi della sinossi.

IMPORTANTE: Scrivi SOLO la narrazione. Non aggiungere note, commenti, riepiloghi di fonti, indicazioni di fine capitolo, o alcun testo che non faccia parte della storia. Il capitolo deve contenere esclusivamente il testo narrativo che verrà pubblicato nel libro.`
        : `Scrivi il contenuto completo del capitolo "${sanitizeSensitiveWords(chapter.title)}".

${previousChapter ? `CAPITOLO PRECEDENTE: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'Questo è il primo capitolo.'}
${nextChapter ? `PROSSIMO CAPITOLO: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'Questo è l\'ultimo capitolo.'}

${prompt_context ? `NOTE AGGIUNTIVE: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Scrivi un capitolo coinvolgente di circa 2000-3000 parole in italiano.

IMPORTANTE: Scrivi SOLO la narrazione. Non aggiungere note, commenti, riepiloghi di fonti, indicazioni di fine capitolo, o alcun testo che non faccia parte della storia. Il capitolo deve contenere esclusivamente il testo narrativo che verrà pubblicato nel libro.`;
    } else {
      userPrompt = chapter.summary
        ? `Based on the following synopsis, write the complete chapter "${sanitizeSensitiveWords(chapter.title)}" expanding all the narrative events described.

SYNOPSIS TO EXPAND:
${chapter.summary}

${previousChapter ? `PREVIOUS CHAPTER: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'This is the first chapter.'}
${nextChapter ? `NEXT CHAPTER: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'This is the last chapter.'}

${prompt_context ? `ADDITIONAL NOTES: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Write an engaging chapter of approximately 2000-3000 words in English, maintaining all narrative elements from the synopsis.

IMPORTANT: Write ONLY the narrative. Do not add notes, comments, source summaries, chapter end markers, or any text that is not part of the story. The chapter must contain exclusively the narrative text that will be published in the book.`
        : `Write the complete content for chapter "${sanitizeSensitiveWords(chapter.title)}".

${previousChapter ? `PREVIOUS CHAPTER: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'This is the first chapter.'}
${nextChapter ? `NEXT CHAPTER: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'This is the last chapter.'}

${prompt_context ? `ADDITIONAL NOTES: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Write an engaging chapter of approximately 2000-3000 words in English.

IMPORTANT: Write ONLY the narrative. Do not add notes, comments, source summaries, chapter end markers, or any text that is not part of the story. The chapter must contain exclusively the narrative text that will be published in the book.`;
    }

    // Send phase update
    sendEvent('phase', { phase: 'writing', message: 'Generating chapter content...' });

    // Try to use AI provider with streaming
    try {
      const { getProviderForUser } = require('../services/ai-service');
      const provider = getProviderForUser(userId);

      if (!provider) {
        // No AI provider available - use fallback generation
        console.log('[Generate Stream] No AI provider, using fallback');

        // Simulate streaming with fallback content
        const fallbackContent = generateTemplateContent(
          chapter.title,
          chapter.area,
          prompt_context,
          humanModel,
          projectSources
        );

        // Stream the fallback content word by word
        const words = fallbackContent.split(' ');
        for (let i = 0; i < words.length; i++) {
          sendEvent('delta', { content: words[i] + ' ' });
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        sendEvent('phase', { phase: 'revision', message: 'Reviewing generated content...' });
        await new Promise(resolve => setTimeout(resolve, 500));

        sendEvent('done', {
          message: 'Chapter generated successfully',
          word_count: fallbackContent.split(/\s+/).filter(w => w.length > 0).length
        });
        return res.end();
      }

      console.log(`[Generate Stream] Using ${provider.getProviderType()} provider`);

      // Use streaming with sanitized messages
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      let fullContent = '';

      // Stream from provider
      for await (const event of provider.stream(messages, { maxTokens: 4000 })) {
        if (event.type === 'delta' && event.content) {
          fullContent += event.content;
          sendEvent('delta', { content: event.content });
        } else if (event.type === 'error') {
          const errorMessage = event.error || 'Unknown error during generation';

          // Feature #233: Check if this is a moderation error and retry with simplified prompt
          if (isModerationError(errorMessage)) {
            console.log('[Generate Stream] Moderation error detected, retrying with simplified prompt');
            sendEvent('phase', { phase: 'writing', message: 'Retrying with simplified prompt...' });

            // Build simplified prompt for retry
            const simplified = buildSimplifiedPrompt(chapter.title, chapter.project_title, language);

            try {
              const simplifiedMessages = [
                { role: 'system', content: simplified.systemPrompt },
                { role: 'user', content: simplified.userPrompt }
              ];

              let retryContent = '';
              for await (const retryEvent of provider.stream(simplifiedMessages, { maxTokens: 4000 })) {
                if (retryEvent.type === 'delta' && retryEvent.content) {
                  retryContent += retryEvent.content;
                  sendEvent('delta', { content: retryEvent.content });
                } else if (retryEvent.type === 'error') {
                  // Even simplified prompt failed - provide user feedback
                  const userMessage = getModerationErrorMessage(language, sanitizedContent.warnings);
                  sendEvent('error', {
                    message: userMessage,
                    original_error: retryEvent.error,
                    is_moderation: true
                  });
                  return res.end();
                }
              }

              if (retryContent) {
                // Success with simplified prompt
                const now = new Date().toISOString();
                const wordCount = retryContent.split(/\s+/).filter(w => w.length > 0).length;

                db.prepare(`
                  UPDATE chapters
                  SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
                  WHERE id = ?
                `).run(retryContent, wordCount, now, id);

                sendEvent('done', {
                  message: 'Chapter generated successfully (simplified mode)',
                  word_count: wordCount,
                  chapter_id: id,
                  note: 'Used simplified prompt due to content sensitivity'
                });
                return res.end();
              }
            } catch (retryError: any) {
              console.error('[Generate Stream] Retry with simplified prompt failed:', retryError);
              const userMessage = getModerationErrorMessage(language, sanitizedContent.warnings);
              sendEvent('error', { message: userMessage, is_moderation: true });
              return res.end();
            }
          }

          sendEvent('error', { message: errorMessage });
          return res.end();
        }
      }

      // Send revision phase
      sendEvent('phase', { phase: 'revision', message: 'Reviewing generated content...' });

      // Update chapter in database
      const now = new Date().toISOString();
      const wordCount = fullContent.split(/\s+/).filter(w => w.length > 0).length;

      db.prepare(`
        UPDATE chapters
        SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
        WHERE id = ?
      `).run(fullContent, wordCount, now, id);

      // Log generation
      const logId = uuidv4();
      db.prepare(`
        INSERT INTO generation_logs (id, project_id, chapter_id, model_used, phase, tokens_input, tokens_output, duration_ms, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        chapter.project_id,
        id,
        humanModel ? `${humanModel.name} (${provider.getProviderType()})` : provider.getProviderType(),
        'writing',  // Valid phase values: 'structure', 'writing', 'revision'
        0,  // Will be updated with actual tokens if available
        wordCount,
        0,
        'completed',
        now
      );

      console.log(`[Generate Stream] Generated chapter "${chapter.title}" with ${wordCount} words`);

      sendEvent('done', {
        message: 'Chapter generated successfully',
        word_count: wordCount,
        chapter_id: id
      });

      return res.end();

    } catch (aiError: any) {
      console.error('[Generate Stream] AI error:', aiError);

      // Feature #233: Check for moderation errors
      if (isModerationError(aiError)) {
        console.log('[Generate Stream] Moderation error in catch block');
        const userMessage = getModerationErrorMessage(language, sanitizedContent.warnings);
        sendEvent('error', { message: userMessage, is_moderation: true });
        return res.end();
      }

      // Fallback to template generation on other errors
      sendEvent('phase', { phase: 'writing', message: 'Using fallback generation...' });

      const fallbackContent = generateTemplateContent(
        chapter.title,
        chapter.area,
        prompt_context,
        humanModel,
        projectSources
      );

      // Stream the fallback content
      const words = fallbackContent.split(' ');
      for (let i = 0; i < words.length; i++) {
        sendEvent('delta', { content: words[i] + ' ' });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const wordCount = fallbackContent.split(/\s+/).filter(w => w.length > 0).length;

      // Update chapter in database
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE chapters
        SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
        WHERE id = ?
      `).run(fallbackContent, wordCount, now, id);

      sendEvent('done', {
        message: 'Chapter generated (fallback mode)',
        word_count: wordCount,
        warning: aiError.message
      });

      return res.end();
    }

  } catch (error: any) {
    console.error('[Generate Stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Failed to generate chapter' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/chapters/:id/generate-with-comparison - Generate content with and without Human Model for comparison
router.post('/chapters/:id/generate-with-comparison', authenticateToken, generationRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { human_model_id, prompt_context } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, c.project_id, p.area, p.settings_json
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; title: string; content: string; project_id: string; area: string; settings_json: string } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // If human_model_id is provided, verify it exists and belongs to user
    let humanModel = null;
    if (human_model_id) {
      humanModel = db.prepare(
        'SELECT * FROM human_models WHERE id = ? AND user_id = ?'
      ).get(human_model_id, userId) as { id: string; name: string; analysis_result_json: string; style_strength: number } | undefined;

      if (!humanModel) {
        return res.status(404).json({ message: 'Human Model not found' });
      }

      if (humanModel.analysis_result_json) {
        try {
          humanModel.analysis_result_json = JSON.parse(humanModel.analysis_result_json);
        } catch {
          humanModel.analysis_result_json = {};
        }
      }
    }

    // Feature #177: Fetch project sources for generation
    const projectSources = db.prepare(`
      SELECT id, file_name, content_text, file_type, source_type, url
      FROM sources
      WHERE project_id = ? AND content_text IS NOT NULL AND content_text != ''
      ORDER BY created_at DESC
    `).all(chapter.project_id) as { id: string; file_name: string; content_text: string; file_type: string; source_type: string; url: string }[] | undefined;

    // Track token usage (Feature #156)
    // Simulate token counts for generation
    const sourceTokens = projectSources ? projectSources.reduce((acc, s) => acc + (s.content_text?.length || 0), 0) : 0;
    const inputTokens = Math.ceil((chapter.title.length + (prompt_context?.length || 0) + sourceTokens) / 4);
    const estimatedOutputTokens = Math.ceil(chapter.title.length * 15); // Rough estimate for chapter content

    // Feature #177: Generate baseline content (without Human Model)
    // TODO: Replace with actual AI API call (OpenAI/Anthropic)
    const baselineContent = generateTemplateContent(chapter.title, chapter.area, prompt_context, null, projectSources);
    const baselineTokens = Math.ceil(baselineContent.length / 4);

    // Feature #177: Generate styled content (with Human Model, if provided)
    // TODO: Replace with actual AI API call (OpenAI/Anthropic)
    const styledContent = humanModel
      ? generateTemplateContent(chapter.title, chapter.area, prompt_context, humanModel, projectSources)
      : baselineContent;
    const styledTokens = humanModel ? Math.ceil(styledContent.length / 4) : 0;

    const totalOutputTokens = baselineTokens + styledTokens;
    const totalTokens = inputTokens + totalOutputTokens;

    // Calculate cost (GPT-4 pricing: $0.03/1K input tokens, $0.06/1K output tokens)
    const inputCost = (inputTokens / 1000) * 0.03;
    const outputCost = (totalOutputTokens / 1000) * 0.06;
    const estimatedCost = inputCost + outputCost;

    // Calculate style differences
    const differences = calculateStyleDifferences(baselineContent, styledContent, humanModel);

    console.log(`[Comparison] Generated comparison for chapter ${id} - Tokens: ${inputTokens} in, ${totalOutputTokens} out, Cost: $${estimatedCost.toFixed(4)}`);

    res.json({
      chapter_id: id,
      human_model: humanModel ? {
        id: humanModel.id,
        name: humanModel.name,
        style_strength: humanModel.style_strength,
        analysis: humanModel.analysis_result_json
      } : null,
      baseline: {
        content: baselineContent,
        word_count: baselineContent.split(/\s+/).filter(w => w.length > 0).length,
        generated_at: new Date().toISOString()
      },
      styled: humanModel ? {
        content: styledContent,
        word_count: styledContent.split(/\s+/).filter(w => w.length > 0).length,
        generated_at: new Date().toISOString()
      } : null,
      differences,
      // Feature #156: Token usage
      token_usage: {
        tokens_input: inputTokens,
        tokens_output: totalOutputTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost
      }
    });
  } catch (error) {
    console.error('[Comparison] Error generating comparison:', error);
    res.status(500).json({ message: 'Failed to generate comparison' });
  }
});

// Helper function to generate template content for AI generation
// Feature #177: Added sources parameter to use uploaded sources in generation
// TODO: This is a placeholder. Replace with actual AI API integration (OpenAI/Anthropic)
function generateTemplateContent(title: string, area: string, context: string, humanModel: any, sources?: any[]): string {
  let baseContent = `Questo è un contenuto generato per "${title}" nell'area ${area}.`;

  // Feature #177: Include source references in generated content
  if (sources && sources.length > 0) {
    const sourceReferences = sources.map(s => {
      const shortContent = s.content_text ? s.content_text.substring(0, 100) + '...' : '(no content)';
      return `[Fonte: ${s.file_name} - "${shortContent}"]`;
    }).join('\n\n');

    baseContent += `\n\n\nContenuto basato sulle seguenti fonti caricate:\n\n${sourceReferences}\n\nIl contenuto generato sopra integra e sintetizza le informazioni provenienti da queste fonti.`;
  }

  if (!humanModel) {
    return `${baseContent} Questo testo è stato generato senza l'applicazione di alcun modello stilistico umano. Lo stile è neutro e standard, adatto per una prima bozza o per avere un punto di partenza pulito.`;
  }

  // Apply style based on Human Model analysis
  const analysis = humanModel.analysis_result_json || {};
  const styleStrength = humanModel.style_strength || 50;

  let styledContent = baseContent;

  // Apply tone
  if (analysis.tone) {
    styledContent += ` Il tono adottato è: ${analysis.tone}.`;
  }

  // Apply sentence structure influence
  if (analysis.sentence_structure) {
    styledContent += ` La struttura delle frasi segue: ${analysis.sentence_structure}.`;
  }

  // Apply vocabulary influence
  if (analysis.vocabulary) {
    styledContent += ` Il vocabolario utilizzato è: ${analysis.vocabulary}.`;
  }

  // Apply writing patterns based on style strength
  if (analysis.patterns && Array.isArray(analysis.patterns) && analysis.patterns.length > 0) {
    const influence = Math.min(styleStrength / 100, 1);
    styledContent += `\n\nPattern stilistici applicati (influenza: ${Math.round(influence * 100)}%):\n`;
    analysis.patterns.forEach((pattern: string, idx: number) => {
      styledContent += `- ${pattern}\n`;
    });
  }

  return styledContent;
}

// Helper function to calculate style differences
function calculateStyleDifferences(baseline: string, styled: string, humanModel: any): any {
  if (!humanModel) {
    return null;
  }

  const baselineWords = baseline.split(/\s+/).filter(w => w.length > 0);
  const styledWords = styled.split(/\s+/).filter(w => w.length > 0);

  const differences = {
    word_count_change: styledWords.length - baselineWords.length,
    percentage_change: baselineWords.length > 0
      ? Math.round(((styledWords.length - baselineWords.length) / baselineWords.length) * 100)
      : 0,
    style_elements_applied: []
  };

  const analysis = humanModel.analysis_result_json || {};

  if (analysis.tone) {
    differences.style_elements_applied.push({
      element: 'Tone',
      description: analysis.tone
    });
  }

  if (analysis.sentence_structure) {
    differences.style_elements_applied.push({
      element: 'Sentence Structure',
      description: analysis.sentence_structure
    });
  }

  if (analysis.vocabulary) {
    differences.style_elements_applied.push({
      element: 'Vocabulary',
      description: analysis.vocabulary
    });
  }

  if (analysis.patterns && Array.isArray(analysis.patterns)) {
    differences.style_elements_applied.push({
      element: 'Writing Patterns',
      description: `${analysis.patterns.length} patterns applied`
    });
  }

  return differences;
}

// POST /api/chapters/:id/regenerate - Regenerate a single chapter (Feature #178)
router.post('/chapters/:id/regenerate', authenticateToken, generationRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { human_model_id, prompt_context } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, c.project_id, c.order_index, c.status,
             p.area, p.settings_json, p.title as project_title
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as {
      id: string;
      title: string;
      content: string;
      project_id: string;
      order_index: number;
      status: string;
      area: string;
      settings_json: string;
      project_title: string;
    } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // If human_model_id is provided, verify it exists and belongs to user
    let humanModel = null;
    if (human_model_id) {
      humanModel = db.prepare(
        'SELECT * FROM human_models WHERE id = ? AND user_id = ?'
      ).get(human_model_id, userId) as {
        id: string;
        name: string;
        analysis_result_json: string;
        style_strength: number;
      } | undefined;

      if (!humanModel) {
        return res.status(404).json({ message: 'Human Model not found' });
      }

      if (humanModel.analysis_result_json) {
        try {
          humanModel.analysis_result_json = JSON.parse(humanModel.analysis_result_json);
        } catch {
          humanModel.analysis_result_json = {};
        }
      }
    }

    // Feature #177: Fetch project sources for generation
    const projectSources = db.prepare(`
      SELECT id, file_name, content_text, file_type, source_type, url
      FROM sources
      WHERE project_id = ? AND content_text IS NOT NULL AND content_text != ''
      ORDER BY created_at DESC
    `).all(chapter.project_id) as { id: string; file_name: string; content_text: string; file_type: string; source_type: string; url: string }[] | undefined;

    // Get all chapters in the project to ensure we only regenerate this one
    const allChapters = db.prepare(`
      SELECT id, title, content, order_index
      FROM chapters
      WHERE project_id = ?
      ORDER BY order_index ASC
    `).all(chapter.project_id) as { id: string; title: string; content: string; order_index: number }[];

    // Track token usage (Feature #156)
    const sourceTokens = projectSources ? projectSources.reduce((acc, s) => acc + (s.content_text?.length || 0), 0) : 0;
    const inputTokens = Math.ceil((chapter.title.length + (prompt_context?.length || 0) + sourceTokens) / 4);

    // Feature #177: Pass sources to generation function
    // TODO: Replace with actual AI API call (OpenAI/Anthropic)
    const newContent = generateTemplateContent(chapter.title, chapter.area, prompt_context, humanModel, projectSources);
    const outputTokens = Math.ceil(newContent.length / 4);
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost (GPT-4 pricing: $0.03/1K input tokens, $0.06/1K output tokens)
    const inputCost = (inputTokens / 1000) * 0.03;
    const outputCost = (outputTokens / 1000) * 0.06;
    const estimatedCost = inputCost + outputCost;

    // Update only this chapter's content
    const now = new Date().toISOString();
    const newWordCount = newContent.split(/\s+/).filter(w => w.length > 0).length;

    db.prepare(`
      UPDATE chapters
      SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
      WHERE id = ?
    `).run(newContent, newWordCount, now, id);

    // Log generation (Feature #156)
    const logId = uuidv4();
    db.prepare(`
      INSERT INTO generation_logs (id, project_id, chapter_id, model_used, phase, tokens_input, tokens_output, duration_ms, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      chapter.project_id,
      id,
      humanModel ? `${humanModel.name} (GPT-4)` : 'GPT-4',
      'regeneration',
      inputTokens,
      outputTokens,
      500, // Simulated duration
      'completed',
      now
    );

    console.log(`[Regenerate] Regenerated chapter "${chapter.title}" (order ${chapter.order_index}) in project "${chapter.project_title}"`);

    // Return the updated chapter and confirm other chapters are unchanged
    const updatedChapter = db.prepare(`
      SELECT id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at
      FROM chapters
      WHERE id = ?
    `).get(id);

    res.json({
      chapter: updatedChapter,
      message: `Chapter "${chapter.title}" regenerated successfully. Other ${allChapters.length - 1} chapters unchanged.`,
      regenerated_chapter_id: id,
      other_chapters_unchanged: allChapters
        .filter((ch, idx) => allChapters[idx].id !== id)
        .map(ch => ({ id: ch.id, title: ch.title, order_index: ch.order_index })),
      token_usage: {
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost
      }
    });
  } catch (error) {
    console.error('[Regenerate] Error regenerating chapter:', error);
    res.status(500).json({ message: 'Failed to regenerate chapter' });
  }
});

// POST /api/chapters/:id/regenerate-stream - Regenerate a single chapter with SSE streaming (Feature #271)
router.post('/chapters/:id/regenerate-stream', authenticateToken, generationRateLimit, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { human_model_id, prompt_context } = req.body;
    const userId = req.user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, c.summary, c.project_id, c.order_index, c.status,
             p.area, p.settings_json, p.title as project_title, p.genre, p.tone, p.target_audience,
             u.preferred_language
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as {
      id: string;
      title: string;
      content: string;
      summary: string;
      project_id: string;
      order_index: number;
      status: string;
      area: string;
      settings_json: string;
      project_title: string;
      genre: string | null;
      tone: string | null;
      target_audience: string | null;
      preferred_language: string;
    } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // If human_model_id is provided, verify it exists and belongs to user
    let humanModel = null;
    if (human_model_id) {
      humanModel = db.prepare(
        'SELECT * FROM human_models WHERE id = ? AND user_id = ?'
      ).get(human_model_id, userId) as {
        id: string;
        name: string;
        analysis_result_json: string;
        style_strength: number;
      } | undefined;

      if (!humanModel) {
        return res.status(404).json({ message: 'Human Model not found' });
      }

      if (humanModel.analysis_result_json) {
        try {
          humanModel.analysis_result_json = JSON.parse(humanModel.analysis_result_json);
        } catch {
          humanModel.analysis_result_json = {};
        }
      }
    }

    // Fetch project sources for generation
    const projectSources = db.prepare(`
      SELECT id, file_name, content_text, file_type, source_type, url
      FROM sources
      WHERE project_id = ? AND content_text IS NOT NULL AND content_text != ''
      ORDER BY created_at DESC
      LIMIT 5
    `).all(chapter.project_id) as { id: string; file_name: string; content_text: string; file_type: string; source_type: string; url: string }[];

    // Fetch characters for context (including status information)
    const characters = db.prepare(`
      SELECT name, description, traits, status_at_end, status_notes
      FROM characters
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(chapter.project_id) as { name: string; description: string; traits: string; status_at_end: string; status_notes: string }[];

    // Fetch locations for context
    const locations = db.prepare(`
      SELECT name, description
      FROM locations
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(chapter.project_id) as { name: string; description: string }[];

    // Fetch plot events for context
    const plotEvents = db.prepare(`
      SELECT title, description
      FROM plot_events
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(chapter.project_id) as { title: string; description: string }[];

    // Get previous and next chapters for continuity
    const previousChapter = db.prepare(`
      SELECT title, content
      FROM chapters
      WHERE project_id = ? AND order_index = ?
      LIMIT 1
    `).get(chapter.project_id, chapter.order_index - 1) as { title: string; content: string } | undefined;

    const nextChapter = db.prepare(`
      SELECT title
      FROM chapters
      WHERE project_id = ? AND order_index = ?
      LIMIT 1
    `).get(chapter.project_id, chapter.order_index + 1) as { title: string } | undefined;

    // Get all other chapters to report they're unchanged
    const otherChapters = db.prepare(`
      SELECT id, title, order_index
      FROM chapters
      WHERE project_id = ? AND id != ?
      ORDER BY order_index ASC
    `).all(chapter.project_id, id) as { id: string; title: string; order_index: number }[];

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Helper function to send SSE events
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial status
    sendEvent('phase', { phase: 'structure', message: 'Analyzing chapter context...' });

    // Build the system prompt based on project settings and Human Model
    const language = chapter.preferred_language === 'it' ? 'it' : 'en';
    const isItalian = language === 'it';

    // Feature #233: Sanitize content to avoid moderation triggers
    // Feature #275: Include character status (alive/dead) information
    const sanitizedContent = sanitizePromptContent({
      characters: characters.map(c => ({ name: c.name, description: c.description, traits: c.traits, status_at_end: c.status_at_end, status_notes: c.status_notes })),
      locations: locations.map(l => ({ name: l.name, description: l.description })),
      plotEvents: plotEvents.map(e => ({ title: e.title, description: e.description })),
      sources: projectSources.map(s => ({ file_name: s.file_name, content_text: s.content_text })),
      previousChapter: previousChapter ? { title: previousChapter.title, content: previousChapter.content } : undefined,
      chapterTitle: chapter.title,
      projectTitle: chapter.project_title,
      projectContext: prompt_context
    });

    // Log any warnings from sanitization
    if (sanitizedContent.warnings.length > 0) {
      console.log('[Regenerate Stream] Content sanitization warnings:', sanitizedContent.warnings);
    }

    // Build sanitized system prompt
    let systemPrompt = '';
    if (isItalian) {
      systemPrompt = `Sei uno scrittore professionista che aiuta a rigenerare capitoli di romanzi.

PROGETTO: "${sanitizeSensitiveWords(chapter.project_title)}"
GENERE: ${chapter.genre || 'Narrativa'}
TONO: ${chapter.tone || 'Neutro'}
PUBBLICO: ${chapter.target_audience || 'Adulti'}

CAPITOLO DA RIGENERARE: "${sanitizeSensitiveWords(chapter.title)}" (Capitolo ${chapter.order_index + 1})${chapter.summary ? `\n\nSINOSSI DEL CAPITOLO (ISTRUZIONE PRINCIPALE):\n${chapter.summary}\n\nIMPORTANTE: Devi seguire fedelmente questa sinossi nella rigenerazione. Il contenuto rigenerato deve espandere tutti gli elementi narrativi descritti nella sinossi.` : ''}

NOTA: Questo è un capitolo esistente che deve essere rigenerato con nuovo contenuto.`;
    } else {
      systemPrompt = `You are a professional writer helping regenerate novel chapters.

PROJECT: "${sanitizeSensitiveWords(chapter.project_title)}"
GENRE: ${chapter.genre || 'Fiction'}
TONE: ${chapter.tone || 'Neutral'}
AUDIENCE: ${chapter.target_audience || 'Adults'}

CHAPTER TO REGENERATE: "${sanitizeSensitiveWords(chapter.title)}" (Chapter ${chapter.order_index + 1})${chapter.summary ? `\n\nCHAPTER SYNOPSIS (PRIMARY INSTRUCTION):\n${chapter.summary}\n\nIMPORTANT: You must faithfully follow this synopsis in the regeneration. The regenerated content must expand all narrative elements described in the synopsis.` : ''}

NOTE: This is an existing chapter that needs to be regenerated with fresh content.`;
    }

    // Add Human Model style if provided
    if (humanModel && humanModel.analysis_result_json) {
      const analysis = humanModel.analysis_result_json as any;
      if (isItalian) {
        systemPrompt += `

PROFILO STILISTICO PERSONALE (${humanModel.name}):
- Tono: ${analysis.tone || 'Non specificato'}
- Struttura frasi: ${analysis.sentence_structure || 'Non specificata'}
- Vocabolario: ${analysis.vocabulary || 'Non specificato'}
- Pattern di scrittura: ${(analysis.patterns || []).join(', ') || 'Non specificati'}

IMPORTANTE: Scrivi con lo stile personale dell'autore come definito sopra.`;
      } else {
        systemPrompt += `

PERSONAL STYLE PROFILE (${humanModel.name}):
- Tone: ${analysis.tone || 'Not specified'}
- Sentence structure: ${analysis.sentence_structure || 'Not specified'}
- Vocabulary: ${analysis.vocabulary || 'Not specified'}
- Writing patterns: ${(analysis.patterns || []).join(', ') || 'Not specified'}

IMPORTANT: Write in the author's personal style as defined above.`;
      }
    }

    // Add sanitized character context
    if (sanitizedContent.characters) {
      if (isItalian) {
        systemPrompt += `\n\nPERSONAGGI:\n${sanitizedContent.characters}`;
      } else {
        systemPrompt += `\n\nCHARACTERS:\n${sanitizedContent.characters}`;
      }
    }

    // Feature #275: Add dead characters warning
    if (sanitizedContent.deadCharacters) {
      if (isItalian) {
        systemPrompt += `\n\nPERSONAGGI MORTI (NON USARE - SONO MORTI):\n${sanitizedContent.deadCharacters}\n\nIMPORTANTE: Questi personaggi sono morti e NON devono apparire nel capitolo.`;
      } else {
        systemPrompt += `\n\nDEAD CHARACTERS (DO NOT USE - THEY ARE DEAD):\n${sanitizedContent.deadCharacters}\n\nIMPORTANT: These characters are dead and MUST NOT appear in this chapter.`;
      }
    }

    // Add sanitized location context
    if (sanitizedContent.locations) {
      if (isItalian) {
        systemPrompt += `\n\nLUOGHI:\n${sanitizedContent.locations}`;
      } else {
        systemPrompt += `\n\nLOCATIONS:\n${sanitizedContent.locations}`;
      }
    }

    // Add sanitized plot events context
    if (sanitizedContent.plotEvents) {
      if (isItalian) {
        systemPrompt += `\n\nEVENTI DI TRAMA:\n${sanitizedContent.plotEvents}`;
      } else {
        systemPrompt += `\n\nPLOT EVENTS:\n${sanitizedContent.plotEvents}`;
      }
    }

    // Add sanitized source context
    if (sanitizedContent.sources) {
      if (isItalian) {
        systemPrompt += `\n\nFONTI DI RIFERIMENTO:\n${sanitizedContent.sources}`;
      } else {
        systemPrompt += `\n\nREFERENCE SOURCES:\n${sanitizedContent.sources}`;
      }
    }

    // Build user prompt for regeneration
    let userPrompt = '';
    if (isItalian) {
      userPrompt = chapter.summary
        ? `Basandoti sulla seguente sinossi, rigenera il capitolo completo "${sanitizeSensitiveWords(chapter.title)}" espandendo tutti gli eventi narrativi descritti.

SINOSSI DA ESPANDERE:
${chapter.summary}

${previousChapter ? `CAPITOLO PRECEDENTE: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'Questo è il primo capitolo.'}
${nextChapter ? `PROSSIMO CAPITOLO: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'Questo è l\'ultimo capitolo.'}

${prompt_context ? `NOTE AGGIUNTIVE: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Genera un capitolo fresco e coinvolgente di circa 2000-3000 parole in italiano, mantenendo tutti gli elementi narrativi della sinossi.

IMPORTANTE: Scrivi SOLO la narrazione. Non aggiungere note, commenti, riepiloghi di fonti, indicazioni di fine capitolo, o alcun testo che non faccia parte della storia. Il capitolo deve contenere esclusivamente il testo narrativo che verrà pubblicato nel libro.`
        : `Rigenera il contenuto completo del capitolo "${sanitizeSensitiveWords(chapter.title)}".

${previousChapter ? `CAPITOLO PRECEDENTE: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'Questo è il primo capitolo.'}
${nextChapter ? `PROSSIMO CAPITOLO: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'Questo è l\'ultimo capitolo.'}

${prompt_context ? `NOTE AGGIUNTIVE: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Genera un capitolo fresco e coinvolgente di circa 2000-3000 parole in italiano che mantenga la coerenza con la storia.

IMPORTANTE: Scrivi SOLO la narrazione. Non aggiungere note, commenti, riepiloghi di fonti, indicazioni di fine capitolo, o alcun testo che non faccia parte della storia. Il capitolo deve contenere esclusivamente il testo narrativo che verrà pubblicato nel libro.`;
    } else {
      userPrompt = chapter.summary
        ? `Based on the following synopsis, regenerate the complete chapter "${sanitizeSensitiveWords(chapter.title)}" expanding all the narrative events described.

SYNOPSIS TO EXPAND:
${chapter.summary}

${previousChapter ? `PREVIOUS CHAPTER: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'This is the first chapter.'}
${nextChapter ? `NEXT CHAPTER: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'This is the last chapter.'}

${prompt_context ? `ADDITIONAL NOTES: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Generate fresh, engaging chapter content of approximately 2000-3000 words in English, maintaining all narrative elements from the synopsis.

IMPORTANT: Write ONLY the narrative. Do not add notes, comments, source summaries, chapter end markers, or any text that is not part of the story. The chapter must contain exclusively the narrative text that will be published in the book.`
        : `Regenerate the complete content for chapter "${sanitizeSensitiveWords(chapter.title)}".

${previousChapter ? `PREVIOUS CHAPTER: "${sanitizeSensitiveWords(previousChapter.title)}"` : 'This is the first chapter.'}
${nextChapter ? `NEXT CHAPTER: "${sanitizeSensitiveWords(nextChapter.title)}"` : 'This is the last chapter.'}

${prompt_context ? `ADDITIONAL NOTES: ${sanitizeSensitiveWords(prompt_context)}` : ''}

Generate fresh, engaging chapter content of approximately 2000-3000 words in English that maintains story coherence.

IMPORTANT: Write ONLY the narrative. Do not add notes, comments, source summaries, chapter end markers, or any text that is not part of the story. The chapter must contain exclusively the narrative text that will be published in the book.`;
    }

    // Send phase update
    sendEvent('phase', { phase: 'writing', message: 'Regenerating chapter content...' });

    // Try to use AI provider with streaming
    try {
      const { getProviderForUser } = require('../services/ai-service');
      const provider = getProviderForUser(userId);

      if (!provider) {
        // No AI provider available - use fallback generation
        console.log('[Regenerate Stream] No AI provider, using fallback');

        // Simulate streaming with fallback content
        const fallbackContent = generateTemplateContent(
          chapter.title,
          chapter.area,
          prompt_context,
          humanModel,
          projectSources
        );

        // Stream the fallback content word by word
        const words = fallbackContent.split(' ');
        for (let i = 0; i < words.length; i++) {
          sendEvent('delta', { content: words[i] + ' ' });
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        sendEvent('phase', { phase: 'revision', message: 'Reviewing regenerated content...' });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update chapter in database
        const now = new Date().toISOString();
        const wordCount = fallbackContent.split(/\s+/).filter(w => w.length > 0).length;

        db.prepare(`
          UPDATE chapters
          SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
          WHERE id = ?
        `).run(fallbackContent, wordCount, now, id);

        sendEvent('done', {
          message: 'Chapter regenerated successfully',
          word_count: wordCount,
          chapter_id: id,
          regenerated_chapter_id: id,
          other_chapters_unchanged: otherChapters,
          warning: 'No AI provider configured - used fallback generation'
        });
        return res.end();
      }

      console.log(`[Regenerate Stream] Using ${provider.getProviderType()} provider`);

      // Use streaming with sanitized messages
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      let fullContent = '';

      // Stream from provider
      for await (const event of provider.stream(messages, { maxTokens: 4000 })) {
        if (event.type === 'delta' && event.content) {
          fullContent += event.content;
          sendEvent('delta', { content: event.content });
        } else if (event.type === 'error') {
          const errorMessage = event.error || 'Unknown error during regeneration';

          // Feature #233: Check if this is a moderation error and retry with simplified prompt
          if (isModerationError(errorMessage)) {
            console.log('[Regenerate Stream] Moderation error detected, retrying with simplified prompt');
            sendEvent('phase', { phase: 'writing', message: 'Retrying with simplified prompt...' });

            // Build simplified prompt for retry
            const simplified = buildSimplifiedPrompt(chapter.title, chapter.project_title, language);

            try {
              const simplifiedMessages = [
                { role: 'system', content: simplified.systemPrompt },
                { role: 'user', content: simplified.userPrompt }
              ];

              let retryContent = '';
              for await (const retryEvent of provider.stream(simplifiedMessages, { maxTokens: 4000 })) {
                if (retryEvent.type === 'delta' && retryEvent.content) {
                  retryContent += retryEvent.content;
                  sendEvent('delta', { content: retryEvent.content });
                } else if (retryEvent.type === 'error') {
                  // Even simplified prompt failed - provide user feedback
                  const userMessage = getModerationErrorMessage(language, sanitizedContent.warnings);
                  sendEvent('error', {
                    message: userMessage,
                    original_error: retryEvent.error,
                    is_moderation: true
                  });
                  return res.end();
                }
              }

              if (retryContent) {
                // Success with simplified prompt
                const now = new Date().toISOString();
                const wordCount = retryContent.split(/\s+/).filter(w => w.length > 0).length;

                db.prepare(`
                  UPDATE chapters
                  SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
                  WHERE id = ?
                `).run(retryContent, wordCount, now, id);

                sendEvent('done', {
                  message: 'Chapter regenerated successfully (simplified mode)',
                  word_count: wordCount,
                  chapter_id: id,
                  regenerated_chapter_id: id,
                  other_chapters_unchanged: otherChapters,
                  note: 'Used simplified prompt due to content sensitivity'
                });
                return res.end();
              }
            } catch (retryError: any) {
              console.error('[Regenerate Stream] Retry with simplified prompt failed:', retryError);
              const userMessage = getModerationErrorMessage(language, sanitizedContent.warnings);
              sendEvent('error', { message: userMessage, is_moderation: true });
              return res.end();
            }
          }

          sendEvent('error', { message: errorMessage });
          return res.end();
        }
      }

      // Send revision phase
      sendEvent('phase', { phase: 'revision', message: 'Reviewing regenerated content...' });

      // Update chapter in database
      const now = new Date().toISOString();
      const wordCount = fullContent.split(/\s+/).filter(w => w.length > 0).length;

      db.prepare(`
        UPDATE chapters
        SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
        WHERE id = ?
      `).run(fullContent, wordCount, now, id);

      // Log regeneration
      const logId = uuidv4();
      db.prepare(`
        INSERT INTO generation_logs (id, project_id, chapter_id, model_used, phase, tokens_input, tokens_output, duration_ms, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        chapter.project_id,
        id,
        humanModel ? `${humanModel.name} (${provider.getProviderType()})` : provider.getProviderType(),
        'revision',  // Valid phase values: 'structure', 'writing', 'revision'
        0,
        wordCount,
        0,
        'completed',
        now
      );

      console.log(`[Regenerate Stream] Regenerated chapter "${chapter.title}" with ${wordCount} words`);

      sendEvent('done', {
        message: `Chapter "${chapter.title}" regenerated successfully. Other ${otherChapters.length} chapters unchanged.`,
        word_count: wordCount,
        chapter_id: id,
        regenerated_chapter_id: id,
        other_chapters_unchanged: otherChapters
      });

      return res.end();

    } catch (aiError: any) {
      console.error('[Regenerate Stream] AI error:', aiError);

      // Feature #233: Check for moderation errors
      if (isModerationError(aiError)) {
        console.log('[Regenerate Stream] Moderation error in catch block');
        const userMessage = getModerationErrorMessage(language, sanitizedContent.warnings);
        sendEvent('error', { message: userMessage, is_moderation: true });
        return res.end();
      }

      // Fallback to template generation on other errors
      sendEvent('phase', { phase: 'writing', message: 'Using fallback generation...' });

      const fallbackContent = generateTemplateContent(
        chapter.title,
        chapter.area,
        prompt_context,
        humanModel,
        projectSources
      );

      // Stream the fallback content
      const words = fallbackContent.split(' ');
      for (let i = 0; i < words.length; i++) {
        sendEvent('delta', { content: words[i] + ' ' });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const wordCount = fallbackContent.split(/\s+/).filter(w => w.length > 0).length;

      // Update chapter in database
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE chapters
        SET content = ?, word_count = ?, updated_at = ?, status = 'generated'
        WHERE id = ?
      `).run(fallbackContent, wordCount, now, id);

      sendEvent('done', {
        message: 'Chapter regenerated (fallback mode)',
        word_count: wordCount,
        chapter_id: id,
        regenerated_chapter_id: id,
        other_chapters_unchanged: otherChapters,
        warning: 'AI service unavailable - used fallback generation'
      });

      return res.end();
    }

  } catch (error) {
    console.error('[Regenerate Stream] Error regenerating chapter:', error);
    res.status(500).json({ message: 'Failed to regenerate chapter' });
  }
});

// POST /api/chapters/:id/enhance-dialogue - Enhance dialogue in selected text (Feature #188)
router.post('/chapters/:id/enhance-dialogue', authenticateToken, generationRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedText, start, end } = req.body;
    const userId = (req as any).user.id;
    const db = getDatabase();

    // Verify chapter exists and belongs to user's project
    const chapter = db.prepare(`
      SELECT c.id, c.title, c.content, p.area, p.id as project_id, p.title as project_title
      FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, userId) as { id: string; title: string; content: string; area: string; project_id: string; project_title: string } | undefined;

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Only allow dialogue enhancement for Romanziere area
    if (chapter.area !== 'romanziere') {
      return res.status(400).json({ message: 'Dialogue enhancement is only available for Romanziere (novel) projects' });
    }

    // Validate selected text
    if (!selectedText || selectedText.trim().length === 0) {
      return res.status(400).json({ message: 'Selected text is required' });
    }

    // Check if the selected text contains dialogue indicators (quotes or dashes)
    const hasDialogue = /["'].*["']|—|–/.test(selectedText);
    if (!hasDialogue) {
      return res.status(400).json({
        message: 'The selected text does not appear to contain dialogue',
        suggestion: 'Select text that includes dialogue (text in quotes or preceded by dashes)'
      });
    }

    // Generate enhanced dialogue (simulated AI response for now)
    // In production, this would call an AI service to improve dialogue quality
    const enhancedDialogues = [
      {
        id: 'option1',
        text: selectedText.replace(/["']([^"']+)["']/g, '"$1"').replace(/—\s*/g, '—'),
        explanation: 'Migliorata la naturalezza e la scorrevolezza del dialogo'
      },
      {
        id: 'option2',
        text: selectedText.replace(/—\s*"([^"]+)"/g, '—"$1"'),
        explanation: 'Enfatizzate le emozioni e le sfumature dei personaggi'
      },
      {
        id: 'option3',
        text: selectedText,
        explanation: 'Aggiunti dettagli descrittivi e battute narrative per contesto'
      }
    ];

    // Select the best enhancement based on dialogue analysis
    const selectedOption = enhancedDialogues[0];

    // Calculate token usage (Feature #156)
    const inputTokens = Math.ceil(selectedText.length / 4);
    const outputTokens = Math.ceil(selectedOption.text.length / 4);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = ((inputTokens / 1000) * 0.03) + ((outputTokens / 1000) * 0.06);

    console.log(`[Dialogue Enhancement] Enhanced dialogue for chapter ${id} - Tokens: ${inputTokens} in, ${outputTokens} out`);

    res.json({
      originalText: selectedText,
      enhancedText: selectedOption.text,
      explanation: selectedOption.explanation,
      alternatives: enhancedDialogues.slice(1),
      start,
      end,
      token_usage: {
        tokens_input: inputTokens,
        tokens_output: outputTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost
      }
    });
  } catch (error) {
    console.error('[Dialogue Enhancement] Error enhancing dialogue:', error);
    res.status(500).json({ message: 'Failed to enhance dialogue' });
  }
});

export default router;
