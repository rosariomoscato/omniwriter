import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/projects/:id/characters - List characters for a project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/projects/:id/characters', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    // Verify user owns the project
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    console.log('[Characters] Fetching characters for project:', projectId);
    const characters = db.prepare(
      'SELECT * FROM characters WHERE project_id = ? ORDER BY created_at DESC'
    ).all(projectId);

    console.log('[Characters] Found', characters.length, 'characters');
    res.json({ characters, count: characters.length });
  } catch (error) {
    console.error('[Characters] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/projects/:id/characters - Create character
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/projects/:id/characters', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;
    const { name, description, traits, backstory, role_in_story, relationships_json } = req.body;

    // Verify user owns the project
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Character name is required' });
      return;
    }

    const characterId = uuidv4();

    console.log('[Characters] Creating character:', characterId, 'for project:', projectId);
    db.prepare(
      `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, extracted_from_upload, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(
      characterId,
      projectId,
      name.trim(),
      description || '',
      traits || '',
      backstory || '',
      role_in_story || '',
      relationships_json || '[]'
    );

    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    console.log('[Characters] Character created successfully:', characterId);

    res.status(201).json({ message: 'Character created successfully', character });
  } catch (error) {
    console.error('[Characters] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/characters/:id - Get single character
// @ts-expecterror - AuthRequest type compatibility with router
router.get('/characters/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const characterId = req.params.id;

    console.log('[Characters] Fetching character:', characterId);
    const character = db.prepare(
      `SELECT c.* FROM characters c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.user_id = ?`
    ).get(characterId, userId);

    if (!character) {
      res.status(404).json({ message: 'Character not found' });
      return;
    }

    res.json({ character });
  } catch (error) {
    console.error('[Characters] Get error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/characters/:id - Update character
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/characters/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const characterId = req.params.id;
    const { name, description, traits, backstory, role_in_story, relationships_json } = req.body;

    // Verify ownership
    const existing = db.prepare(
      `SELECT c.id FROM characters c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.user_id = ?`
    ).get(characterId, userId);

    if (!existing) {
      res.status(404).json({ message: 'Character not found' });
      return;
    }

    console.log('[Characters] Updating character:', characterId);
    db.prepare(
      `UPDATE characters SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        traits = COALESCE(?, traits),
        backstory = COALESCE(?, backstory),
        role_in_story = COALESCE(?, role_in_story),
        relationships_json = COALESCE(?, relationships_json),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name || null,
      description || null,
      traits || null,
      backstory || null,
      role_in_story || null,
      relationships_json || null,
      characterId
    );

    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    console.log('[Characters] Character updated successfully:', characterId);

    res.json({ message: 'Character updated successfully', character });
  } catch (error) {
    console.error('[Characters] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/characters/:id - Delete character
// @ts-expect-error - AuthRequest type compatibility with router
router.delete('/characters/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const characterId = req.params.id;

    // Verify ownership
    const existing = db.prepare(
      `SELECT c.id FROM characters c
       JOIN projects p ON c.project_id = p.id
       WHERE c.id = ? AND p.user_id = ?`
    ).get(characterId, userId);

    if (!existing) {
      res.status(404).json({ message: 'Character not found' });
      return;
    }

    console.log('[Characters] Deleting character:', characterId);
    const result = db.prepare(
      `DELETE FROM characters
       WHERE id = ?`
    ).run(characterId);

    if (result.changes === 0) {
      res.status(404).json({ message: 'Character not found' });
      return;
    }

    console.log('[Characters] Character deleted successfully:', characterId);
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('[Characters] Delete error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
