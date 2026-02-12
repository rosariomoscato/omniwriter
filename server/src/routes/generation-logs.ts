import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

interface GenerationLog {
  id: string;
  project_id: string;
  chapter_id?: string;
  model_used: string;
  phase: 'structure' | 'writing' | 'revision';
  tokens_input: number;
  tokens_output: number;
  duration_ms: number;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  created_at: string;
}

interface CreateGenerationLogInput {
  project_id: string;
  chapter_id?: string;
  model_used: string;
  phase: 'structure' | 'writing' | 'revision';
  tokens_input?: number;
  tokens_output?: number;
  duration_ms?: number;
  status?: 'started' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
}

// GET /api/projects/:id/generation-logs - Get generation logs for a project
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/projects/:id/generation-logs', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const projectId = req.params.id;

    console.log('[GenerationLogs] Fetching logs for project:', projectId, 'user:', userId);

    // Verify project ownership
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const logs = db.prepare(
      `SELECT * FROM generation_logs
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
    ).all(projectId) as GenerationLog[];

    console.log('[GenerationLogs] Found', logs.length, 'logs');
    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error('[GenerationLogs] List error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/generation-logs - Create a new generation log entry
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const input: CreateGenerationLogInput = req.body;

    if (!input.project_id) {
      res.status(400).json({ message: 'project_id is required' });
      return;
    }

    if (!input.model_used) {
      res.status(400).json({ message: 'model_used is required' });
      return;
    }

    if (!input.phase || !['structure', 'writing', 'revision'].includes(input.phase)) {
      res.status(400).json({ message: 'phase must be one of: structure, writing, revision' });
      return;
    }

    // Verify project ownership
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(input.project_id, userId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const logId = uuidv4();

    console.log('[GenerationLogs] Creating log:', logId, 'for project:', input.project_id);
    db.prepare(
      `INSERT INTO generation_logs (id, project_id, chapter_id, model_used, phase, tokens_input, tokens_output, duration_ms, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      logId,
      input.project_id,
      input.chapter_id || null,
      input.model_used,
      input.phase,
      input.tokens_input || 0,
      input.tokens_output || 0,
      input.duration_ms || 0,
      input.status || 'started',
      input.error_message || null
    );

    const log = db.prepare('SELECT * FROM generation_logs WHERE id = ?').get(logId) as GenerationLog;
    console.log('[GenerationLogs] Log created successfully:', logId);

    res.status(201).json({ message: 'Generation log created successfully', log });
  } catch (error) {
    console.error('[GenerationLogs] Create error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/generation-logs/:id - Update a generation log (e.g., mark as completed)
// @ts-expect-error - AuthRequest type compatibility with router
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;
    const logId = req.params.id;
    const { status, tokens_input, tokens_output, duration_ms, error_message } = req.body;

    // Verify ownership through project
    const log = db.prepare(
      `SELECT gl.* FROM generation_logs gl
       JOIN projects p ON gl.project_id = p.id
       WHERE gl.id = ? AND p.user_id = ?`
    ).get(logId, userId) as GenerationLog | undefined;

    if (!log) {
      res.status(404).json({ message: 'Generation log not found' });
      return;
    }

    console.log('[GenerationLogs] Updating log:', logId);
    db.prepare(
      `UPDATE generation_logs SET
        status = COALESCE(?, status),
        tokens_input = COALESCE(?, tokens_input),
        tokens_output = COALESCE(?, tokens_output),
        duration_ms = COALESCE(?, duration_ms),
        error_message = COALESCE(?, error_message)
       WHERE id = ?`
    ).run(
      status || null,
      tokens_input || null,
      tokens_output || null,
      duration_ms || null,
      error_message !== undefined ? error_message : null,
      logId
    );

    const updatedLog = db.prepare('SELECT * FROM generation_logs WHERE id = ?').get(logId) as GenerationLog;
    console.log('[GenerationLogs] Log updated successfully:', logId);

    res.json({ message: 'Generation log updated successfully', log: updatedLog });
  } catch (error) {
    console.error('[GenerationLogs] Update error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
