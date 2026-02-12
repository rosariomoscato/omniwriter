// @ts-nocheck
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { Database } from 'better-sqlite3';

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users with pagination and search (admin only)
 */
router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string || '';
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, email, name, role, subscription_status, subscription_expires_at,
               preferred_language, theme_preference, created_at, last_login_at
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search) {
        query += ` AND (email LIKE ? OR name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const users = db.prepare(query).all(...params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams: any[] = [];

      if (search) {
        countQuery += ` AND (email LIKE ? OR name LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern);
      }

      const countResult = db.prepare(countQuery).get(...countParams) as { total: number };
      const total = countResult.total;

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('[Admin] Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  }
);

/**
 * PUT /api/admin/users/:id/role
 * Update user role (admin only)
 */
router.put(
  '/users/:id/role',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;
      const { id } = req.params;
      const { role } = req.body;

      if (!['free', 'premium', 'lifetime', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Check if user exists
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user role
      db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, id);

      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('[Admin] Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  }
);

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend or reactivate user account (admin only)
 */
router.put(
  '/users/:id/suspend',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;
      const { id } = req.params;
      const { suspended } = req.body;

      if (typeof suspended !== 'boolean') {
        return res.status(400).json({ message: 'suspended must be a boolean' });
      }

      // Check if user exists
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update subscription_status to indicate suspension
      const newStatus = suspended ? 'suspended' : 'active';
      db.prepare('UPDATE users SET subscription_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newStatus, id);

      res.json({ message: suspended ? 'User suspended successfully' : 'User reactivated successfully' });
    } catch (error) {
      console.error('[Admin] Error updating user suspension:', error);
      res.status(500).json({ message: 'Failed to update user suspension status' });
    }
  }
);

/**
 * GET /api/admin/stats
 * Get platform statistics (admin only)
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'").get() as { count: number };
      const premiumUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('premium', 'lifetime', 'admin')").get() as { count: number };
      const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

      // Get user registrations by date (last 30 days)
      const registrationsByDate = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `).all();

      res.json({
        users: {
          total: totalUsers.count,
          active: activeUsers.count,
          premium: premiumUsers.count
        },
        projects: {
          total: totalProjects.count
        },
        registrationsByDate
      });
    } catch (error) {
      console.error('[Admin] Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  }
);

/**
 * GET /api/admin/health
 * Get system health information (admin only)
 */
router.get(
  '/health',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      // Check database connectivity
      const dbCheck = db.prepare('SELECT 1').get();

      // Get database size
      const dbSize = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };
      const dbSizeMB = (dbSize.size / (1024 * 1024)).toFixed(2);

      // Get active sessions count
      const activeSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > CURRENT_TIMESTAMP').get() as { count: number };

      res.json({
        status: 'healthy',
        database: {
          connected: !!dbCheck,
          size: `${dbSizeMB} MB`,
          activeSessions: activeSessions.count
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    } catch (error) {
      console.error('[Admin] Error fetching health:', error);
      res.status(500).json({ message: 'Failed to fetch health information' });
    }
  }
);

export default router;
