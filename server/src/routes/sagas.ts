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

    // Feature #318: Include character_count and location_count for each project
    const projects = db.prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM characters WHERE project_id = p.id) as character_count,
        (SELECT COUNT(*) FROM locations WHERE project_id = p.id) as location_count
       FROM projects p
       WHERE p.saga_id = ?
       ORDER BY p.created_at DESC`
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

// GET /api/sagas/:id/continuity - Get saga continuity data (Feature #299)
// Returns all continuity records for a saga, ordered by episode number
router.get('/:id/continuity', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const db = getDatabase();

    // Verify saga ownership
    const saga = db.prepare(
      'SELECT id, title, description, area FROM sagas WHERE id = ? AND user_id = ?'
    ).get(id, userId) as { id: string; title: string; description: string; area: string } | undefined;

    if (!saga) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    // Get all continuity records ordered by episode number
    const continuityRecords = db.prepare(
      `SELECT sc.*, p.title as project_title, p.status as project_status
       FROM saga_continuity sc
       LEFT JOIN projects p ON p.id = sc.source_project_id
       WHERE sc.saga_id = ?
       ORDER BY sc.episode_number ASC`
    ).all(id) as Array<{
      id: string;
      saga_id: string;
      source_project_id: string;
      episode_number: number;
      cumulative_synopsis: string;
      characters_state: string;
      events_summary: string;
      locations_visited: string;
      timeline_json: string;
      created_at: string;
      updated_at: string;
      project_title: string;
      project_status: string;
    }>;

    // Build response with parsed JSON fields
    const episodes = continuityRecords.map(record => ({
      id: record.id,
      saga_id: record.saga_id,
      project_id: record.source_project_id,
      project_title: record.project_title || 'Unknown project',
      project_status: record.project_status || 'unknown',
      episode_number: record.episode_number,
      synopsis: record.cumulative_synopsis || '',
      characters: JSON.parse(record.characters_state || '[]'),
      events: JSON.parse(record.events_summary || '[]'),
      locations: JSON.parse(record.locations_visited || '[]'),
      world_state: {},
      finalized_at: record.updated_at,
      created_at: record.created_at,
      updated_at: record.updated_at
    }));

    // Build cumulative state: aggregate all character states across episodes
    const allCharacters: Record<string, { name: string; status: string; notes: string; role: string; last_seen_episode: number }> = {};
    const allLocations: Record<string, { name: string; description: string; significance: string; last_seen_episode: number }> = {};
    const allEvents: Array<{ title: string; description: string; type: string; episode_number: number }> = [];

    for (const ep of episodes) {
      // Characters: update with latest status
      for (const char of ep.characters) {
        allCharacters[char.name.toLowerCase()] = {
          name: char.name,
          status: char.status || 'unknown',
          notes: char.notes || '',
          role: char.role || '',
          last_seen_episode: ep.episode_number
        };
      }
      // Locations: update with latest info
      for (const loc of ep.locations) {
        allLocations[loc.name.toLowerCase()] = {
          name: loc.name,
          description: loc.description || '',
          significance: loc.significance || '',
          last_seen_episode: ep.episode_number
        };
      }
      // Events: accumulate all
      for (const evt of ep.events) {
        allEvents.push({
          title: evt.title,
          description: evt.description || '',
          type: evt.type || 'plot',
          episode_number: ep.episode_number
        });
      }
    }

    console.log('[Sagas] Continuity data for saga:', id, {
      episodes: episodes.length,
      totalCharacters: Object.keys(allCharacters).length,
      totalLocations: Object.keys(allLocations).length,
      totalEvents: allEvents.length
    });

    res.json({
      saga: {
        id: saga.id,
        title: saga.title,
        description: saga.description,
        area: saga.area
      },
      episodes,
      episode_count: episodes.length,
      cumulative: {
        characters: Object.values(allCharacters),
        locations: Object.values(allLocations),
        events: allEvents,
        characters_alive: Object.values(allCharacters).filter(c => c.status === 'alive').length,
        characters_dead: Object.values(allCharacters).filter(c => c.status === 'dead').length,
        characters_total: Object.keys(allCharacters).length
      }
    });
  } catch (error) {
    console.error('[Sagas] Continuity error:', error);
    res.status(500).json({ message: 'Failed to fetch saga continuity' });
  }
});

// POST /api/sagas/:id/create-sequel - Create a sequel project in a saga with continuity (Feature #300)
// Pre-populates characters (with status_at_end), locations, and links continuity for AI reference
router.post('/:id/create-sequel', authenticateToken, requirePremium, (req: AuthRequest, res: Response) => {
  try {
    const { id: sagaId } = req.params;
    const userId = req.user?.id;
    const { title, description, source_project_id } = req.body;
    const db = getDatabase();

    // Verify saga ownership
    const saga = db.prepare(
      'SELECT id, title, area FROM sagas WHERE id = ? AND user_id = ?'
    ).get(sagaId, userId) as { id: string; title: string; area: string } | undefined;

    if (!saga) {
      return res.status(404).json({ message: 'Saga not found' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required for the sequel project' });
    }

    // Determine the source project to copy characters/locations from
    // If source_project_id is provided, use that; otherwise use the latest project in the saga
    let sourceProject: any;
    if (source_project_id) {
      sourceProject = db.prepare(
        'SELECT * FROM projects WHERE id = ? AND saga_id = ? AND user_id = ?'
      ).get(source_project_id, sagaId, userId);

      if (!sourceProject) {
        return res.status(404).json({ message: 'Source project not found in this saga' });
      }
    } else {
      // Use the most recent project in the saga
      sourceProject = db.prepare(
        'SELECT * FROM projects WHERE saga_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(sagaId, userId);
    }

    if (!sourceProject) {
      return res.status(400).json({ message: 'No existing projects in this saga to create a sequel from' });
    }

    console.log('[Sagas] Creating sequel in saga:', sagaId, 'from project:', sourceProject.id);

    // Get the latest continuity record for this saga
    const latestContinuity = db.prepare(
      `SELECT * FROM saga_continuity
       WHERE saga_id = ?
       ORDER BY episode_number DESC
       LIMIT 1`
    ).get(sagaId) as {
      id: string;
      saga_id: string;
      source_project_id: string;
      episode_number: number;
      characters_state: string;
      events_summary: string;
      cumulative_synopsis: string;
      locations_visited: string;
      timeline_json: string;
    } | undefined;

    // Create the new sequel project
    const newProjectId = uuidv4();
    const sequelTitle = title.trim();
    const sequelDescription = description || `Sequel to "${sourceProject.title}" in the "${saga.title}" saga`;

    db.prepare(
      `INSERT INTO projects (
        id, user_id, saga_id, title, description, area, genre, tone, target_audience, pov,
        word_count_target, status, settings_json, word_count, continuity_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, ?, datetime('now'), datetime('now'))`
    ).run(
      newProjectId,
      userId,
      sagaId,
      sequelTitle,
      sequelDescription,
      saga.area,
      sourceProject.genre || '',
      sourceProject.tone || '',
      sourceProject.target_audience || '',
      sourceProject.pov || '',
      sourceProject.word_count_target || 0,
      sourceProject.settings_json || '{}',
      latestContinuity ? latestContinuity.id : null
    );

    console.log('[Sagas] Created sequel project:', newProjectId, latestContinuity ? `with continuity: ${latestContinuity.id}` : 'without continuity');

    // Determine character source: use continuity characters_state if available, otherwise use source project characters
    let charsCopied = 0;
    let charsSkipped = 0;

    if (latestContinuity) {
      // Use characters from the continuity state (most up-to-date across the saga)
      try {
        const continuityCharacters = JSON.parse(latestContinuity.characters_state || '[]') as Array<{
          name: string;
          status?: string;
          notes?: string;
          role?: string;
          description?: string;
          traits?: string;
          backstory?: string;
        }>;

        for (const character of continuityCharacters) {
          const status = (character.status || 'unknown').toLowerCase();
          if (status === 'dead') {
            charsSkipped++;
            console.log(`[Sagas] Skipping dead character from continuity: ${character.name}`);
            continue;
          }

          const newCharacterId = uuidv4();
          db.prepare(
            `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, 0, datetime('now'), datetime('now'))`
          ).run(
            newCharacterId,
            newProjectId,
            sagaId,
            character.name || '',
            character.description || '',
            character.traits || '',
            character.backstory || '',
            character.role || '',
            status,
            character.notes || ''
          );
          charsCopied++;
        }
      } catch (parseErr) {
        console.log('[Sagas] Error parsing continuity characters, falling back to project characters:', parseErr);
        // Fall back to copying from source project
        const fallbackResult = copyCharactersFromProject(db, sourceProject.id, newProjectId, sagaId);
        charsCopied = fallbackResult.copied;
        charsSkipped = fallbackResult.skipped;
      }
    } else {
      // No continuity data - copy characters directly from the source project
      const result = copyCharactersFromProject(db, sourceProject.id, newProjectId, sagaId);
      charsCopied = result.copied;
      charsSkipped = result.skipped;
    }

    console.log(`[Sagas] Copied ${charsCopied} characters (skipped ${charsSkipped} dead)`);

    // Pre-populate locations
    let locationsCopied = 0;

    if (latestContinuity) {
      // Use locations from the continuity state
      try {
        const continuityLocations = JSON.parse(latestContinuity.locations_visited || '[]') as Array<{
          name: string;
          description?: string;
          significance?: string;
        }>;

        for (const location of continuityLocations) {
          const newLocationId = uuidv4();
          db.prepare(
            `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
          ).run(
            newLocationId,
            newProjectId,
            sagaId,
            location.name || '',
            location.description || '',
            location.significance || ''
          );
          locationsCopied++;
        }
      } catch (parseErr) {
        console.log('[Sagas] Error parsing continuity locations, falling back to project locations:', parseErr);
        locationsCopied = copyLocationsFromProject(db, sourceProject.id, newProjectId, sagaId);
      }
    } else {
      // No continuity data - copy locations directly from the source project
      locationsCopied = copyLocationsFromProject(db, sourceProject.id, newProjectId, sagaId);
    }

    console.log(`[Sagas] Copied ${locationsCopied} locations`);

    // Copy synopsis from source project as reference
    if (sourceProject.synopsis) {
      const synopsisSourceId = uuidv4();
      db.prepare(
        `INSERT INTO sources (id, project_id, saga_id, user_id, file_name, file_path, file_type, file_size, content_text, source_type, url, tags_json, relevance_score, created_at)
         VALUES (?, ?, ?, ?, 'Previous Synopsis', 'reference', 'text', ?, ?, 'upload', '', '["synopsis", "reference", "sequel"]', 1.0, datetime('now'))`
      ).run(
        synopsisSourceId,
        newProjectId,
        sagaId,
        userId,
        sourceProject.synopsis.length,
        `Synopsis of "${sourceProject.title}":\n\n${sourceProject.synopsis}`
      );
    }

    // Fetch the created project
    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(newProjectId);

    console.log('[Sagas] Sequel creation complete:', {
      project_id: newProjectId,
      saga_id: sagaId,
      characters_copied: charsCopied,
      characters_skipped: charsSkipped,
      locations_copied: locationsCopied,
      has_continuity: !!latestContinuity
    });

    res.status(201).json({
      message: 'Sequel project created successfully',
      project: newProject,
      sequel_info: {
        source_project_id: sourceProject.id,
        source_project_title: sourceProject.title,
        continuity_id: latestContinuity ? latestContinuity.id : null,
        characters_copied: charsCopied,
        characters_skipped_dead: charsSkipped,
        locations_copied: locationsCopied
      }
    });
  } catch (error) {
    console.error('[Sagas] Create sequel error:', error);
    res.status(500).json({ message: 'Failed to create sequel project' });
  }
});

// Helper: copy characters from a source project to a new project, skipping dead characters
function copyCharactersFromProject(db: any, sourceProjectId: string, newProjectId: string, sagaId: string): { copied: number; skipped: number } {
  const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(sourceProjectId) as any[];
  let copied = 0;
  let skipped = 0;

  for (const character of characters) {
    if (character.status_at_end === 'dead') {
      skipped++;
      console.log(`[Sagas] Skipping dead character: ${character.name}`);
      continue;
    }

    const newCharacterId = uuidv4();
    db.prepare(
      `INSERT INTO characters (id, project_id, saga_id, name, description, traits, backstory, role_in_story, relationships_json, status_at_end, status_notes, extracted_from_upload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(
      newCharacterId,
      newProjectId,
      sagaId,
      character.name,
      character.description || '',
      character.traits || '',
      character.backstory || '',
      character.role_in_story || '',
      character.relationships_json || '[]',
      character.status_at_end || 'unknown',
      character.status_notes || ''
    );
    copied++;
  }

  return { copied, skipped };
}

// Helper: copy locations from a source project to a new project
function copyLocationsFromProject(db: any, sourceProjectId: string, newProjectId: string, sagaId: string): number {
  const locations = db.prepare('SELECT * FROM locations WHERE project_id = ?').all(sourceProjectId) as any[];

  for (const location of locations) {
    const newLocationId = uuidv4();
    db.prepare(
      `INSERT INTO locations (id, project_id, saga_id, name, description, significance, extracted_from_upload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    ).run(
      newLocationId,
      newProjectId,
      sagaId,
      location.name,
      location.description || '',
      location.significance || ''
    );
  }

  return locations.length;
}

export default router;
