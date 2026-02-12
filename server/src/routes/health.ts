import { Router } from 'express';
import { getDatabase } from '../db/database';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const db = getDatabase();
    // Run a simple query to verify database connectivity
    const result = db.prepare('SELECT 1 as ok').get() as { ok: number };

    // Get table count
    const tables = db.prepare(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).get() as { count: number };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        type: 'SQLite',
        tables: tables.count,
        test_query: result.ok === 1 ? 'passed' : 'failed',
      },
      server: {
        uptime: process.uptime(),
        node_version: process.version,
        memory: process.memoryUsage(),
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
