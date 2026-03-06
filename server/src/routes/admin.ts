// @ts-nocheck
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { Database } from 'better-sqlite3';
import { resetRateLimit, getRateLimitStatus } from '../middleware/rateLimit';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Helper to log admin actions to admin_logs table
 */
function logAdminAction(
  db: Database,
  adminId: string,
  action: string,
  targetUserId: string | null,
  targetUserEmail: string | null = null,
  details: Record<string, any> = {}
): void {
  try {
    db.prepare(
      `INSERT INTO admin_logs (id, admin_id, action, target_user_id, target_user_email, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(uuidv4(), adminId, action, targetUserId, targetUserEmail || '', JSON.stringify(details));
  } catch (error) {
    console.error('[Admin] Failed to log admin action:', error);
  }
}

/**
 * GET /api/admin/users
 * Get all users with pagination, search, and filters (admin only)
 *
 * Query params:
 *   page (number, default 1)
 *   limit (number, default 20)
 *   search (string) - search by email or name
 *   role (string) - filter by role: user, admin
 *   status (string) - filter by status: active, suspended
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
      const role = req.query.role as string || '';
      const status = req.query.status as string || '';
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, email, name, role,
               preferred_language, theme_preference, created_at, last_login_at,
               storage_used_bytes, storage_limit_bytes
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search) {
        query += ` AND (email LIKE ? OR name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      if (role && ['user', 'admin'].includes(role)) {
        query += ` AND role = ?`;
        params.push(role);
      }

      // Status filter no longer supported (subscription_status removed)
      // All users are now active by default

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const users = db.prepare(query).all(...params);

      // Get total count for pagination (with same filters)
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams: any[] = [];

      if (search) {
        countQuery += ` AND (email LIKE ? OR name LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern);
      }

      if (role && ['user', 'admin'].includes(role)) {
        countQuery += ` AND role = ?`;
        countParams.push(role);
      }

      // Status filter no longer supported (subscription_status removed)

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
 * Shared handler for updating user role (used by both PATCH and PUT)
 */
async function handleUpdateRole(req: any, res: any) {
  try {
    const db = (req as any).db as Database;
    const { id } = req.params;
    const { role } = req.body;
    const adminUser = (req as AuthRequest).user;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: user, admin' });
    }

    // Cannot change own role
    if (adminUser && adminUser.id === id) {
      return res.status(403).json({ message: 'Cannot change your own role' });
    }

    // Check if user exists and get current data
    const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id) as { id: string; email: string; role: string } | undefined;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldRole = user.role;

    // Update user role
    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, id);

    // Log the action
    logAdminAction(db, adminUser!.id, 'role_changed', id, user.email, { oldRole, newRole: role });

    res.json({ message: 'User role updated successfully', oldRole, newRole: role });
  } catch (error) {
    console.error('[Admin] Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Update user role (admin only) - Cannot change own role
 */
router.patch('/users/:id/role', authenticateToken, requireAdmin, handleUpdateRole);

/**
 * PUT /api/admin/users/:id/role
 * Update user role (admin only) - backward compatibility
 */
router.put('/users/:id/role', authenticateToken, requireAdmin, handleUpdateRole);

/**
 * Shared handler for suspending/reactivating user (used by both PATCH and PUT)
 */
async function handleSuspendUser(req: any, res: any) {
  try {
    const db = (req as any).db as Database;
    const { id } = req.params;
    const { suspended } = req.body;
    const adminUser = (req as AuthRequest).user;

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ message: 'suspended must be a boolean' });
    }

    // Cannot suspend/reactivate self
    if (adminUser && adminUser.id === id) {
      return res.status(403).json({ message: 'Cannot suspend or reactivate your own account' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id) as { id: string; email: string } | undefined;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Feature #414: User suspension feature removed along with subscription system
    // All users are now always active
    return res.status(501).json({ message: 'User suspension feature removed' });
  } catch (error) {
    console.error('[Admin] Error updating user suspension:', error);
    res.status(500).json({ message: 'Failed to update user suspension status' });
  }
}

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend or reactivate user account (admin only) - Cannot suspend self
 */
router.patch('/users/:id/suspend', authenticateToken, requireAdmin, handleSuspendUser);

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend or reactivate user account (admin only) - backward compatibility
 */
router.put('/users/:id/suspend', authenticateToken, requireAdmin, handleSuspendUser);

/**
 * DELETE /api/admin/users/:id
 * Delete a user and cascade-delete all their data (admin only)
 * - Cannot delete self
 * - Cascade: projects, chapters, human models, sources, etc.
 * - Logs action to admin_logs
 */
router.delete(
  '/users/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;
      const { id } = req.params;
      const adminUser = (req as AuthRequest).user;

      // Cannot delete self
      if (adminUser && adminUser.id === id) {
        return res.status(403).json({ message: 'Cannot delete your own account' });
      }

      // Check if user exists
      const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(id) as { id: string; email: string; name: string; role: string } | undefined;
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Count user's data before deletion for reporting
      const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(id) as { count: number }).count;
      const humanModelCount = (db.prepare('SELECT COUNT(*) as count FROM human_models WHERE user_id = ?').get(id) as { count: number }).count;

      // With foreign keys ON DELETE CASCADE enabled, deleting the user
      // will automatically cascade-delete: projects, chapters, characters,
      // locations, plot_events, sources, human_models, human_model_sources,
      // sessions, password_reset_tokens, llm_providers, user_preferences,
      // chapter_comments, generation_logs, etc.
      db.prepare('DELETE FROM users WHERE id = ?').run(id);

      // Log the action (target_user_id may be null now since user is deleted, use SET NULL)
      logAdminAction(db, adminUser!.id, 'delete_user', null, user.email,
        { deletedUserId: user.id, deletedUserName: user.name, deletedUserRole: user.role, projectsDeleted: projectCount, humanModelsDeleted: humanModelCount });

      res.json({
        message: 'User deleted successfully',
        deletedUser: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          projectsDeleted: projectCount,
          humanModelsDeleted: humanModelCount
        }
      });
    } catch (error) {
      console.error('[Admin] Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  }
);

/**
 * GET /api/admin/stats
 * Get platform statistics (admin only)
 *
 * Feature #350: Enhanced statistics with detailed breakdowns
 * Feature #401: Removed premium/lifetime tiers, simplified to user/admin
 * Returns:
 * - totalUsers: number of total users
 * - usersByRole: { user, admin }
 * - totalProjects: number of total projects
 * - projectsByArea: { romanziere, saggista, redattore }
 * - totalWordsGenerated: sum of all word_count
 * - activeUsersLast30Days: users active in last 30 days
 * - newUsersLast30Days: new users in last 30 days
 * - totalChapters: total number of chapters
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      // Total users
      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

      // Users by role (Feature #401: simplified to user/admin)
      const regularUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get() as { count: number };
      const adminUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };

      // Total projects
      const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

      // Projects by area
      const romanziereProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE area = 'romanziere'").get() as { count: number };
      const saggistaProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE area = 'saggista'").get() as { count: number };
      const redattoreProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE area = 'redattore'").get() as { count: number };

      // Total words generated (sum of all project word_count)
      const totalWordsResult = db.prepare('SELECT SUM(word_count) as total FROM projects').get() as { total: number | null };
      const totalWordsGenerated = totalWordsResult.total || 0;

      // Total chapters
      const totalChapters = db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number };

      // Active users last 30 days (users who logged in within last 30 days)
      const activeUsersLast30Days = db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE last_login_at >= DATE('now', '-30 days')
      `).get() as { count: number };

      // New users last 30 days
      const newUsersLast30Days = db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE created_at >= DATE('now', '-30 days')
      `).get() as { count: number };

      res.json({
        totalUsers: totalUsers.count,
        usersByRole: {
          user: regularUsers.count,
          admin: adminUsers.count
        },
        totalProjects: totalProjects.count,
        projectsByArea: {
          romanziere: romanziereProjects.count,
          saggista: saggistaProjects.count,
          redattore: redattoreProjects.count
        },
        totalWordsGenerated,
        activeUsersLast30Days: activeUsersLast30Days.count,
        newUsersLast30Days: newUsersLast30Days.count,
        totalChapters: totalChapters.count
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

/**
 * POST /api/admin/reset-rate-limit/:ip
 * Reset rate limit for a specific IP address (admin only)
 */
router.post(
  '/reset-rate-limit/:ip',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { ip } = req.params;
      const { path } = req.body; // Optional: reset only for a specific path

      // Validate IP format (basic check)
      if (!ip || ip === 'undefined' || ip === 'unknown') {
        return res.status(400).json({ message: 'Invalid IP address' });
      }

      // Get status before reset for logging
      const beforeStatus = getRateLimitStatus(ip, path);

      // Reset the rate limit
      resetRateLimit(ip, path);

      console.log(`[Admin] Rate limit reset by user ${(req as AuthRequest).user?.id} for IP: ${ip}${path ? ` on path: ${path}` : ''}`);

      res.json({
        message: 'Rate limit reset successfully',
        ip,
        path: path || 'all paths',
        resetEntries: beforeStatus.length
      });
    } catch (error) {
      console.error('[Admin] Error resetting rate limit:', error);
      res.status(500).json({ message: 'Failed to reset rate limit' });
    }
  }
);

/**
 * GET /api/admin/rate-limit-status/:ip
 * Get rate limit status for a specific IP (admin only)
 */
router.get(
  '/rate-limit-status/:ip',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { ip } = req.params;

      // Validate IP format (basic check)
      if (!ip || ip === 'undefined' || ip === 'unknown') {
        return res.status(400).json({ message: 'Invalid IP address' });
      }

      const status = getRateLimitStatus(ip);

      res.json({
        ip,
        entries: status
      });
    } catch (error) {
      console.error('[Admin] Error fetching rate limit status:', error);
      res.status(500).json({ message: 'Failed to fetch rate limit status' });
    }
  }
);

/**
 * GET /api/admin/stats/projects
 * Get detailed project statistics (admin only)
 *
 * Feature #352: Project statistics with trends and breakdowns
 * Returns:
 * - projectsPerMonth: array of { month, year, count } for last 12 months
 * - projectsByArea: { romanziere, saggista, redattore }
 * - top10LongestProjects: array of { id, title, area, word_count }
 * - avgChaptersPerProject: average number of chapters per project
 */
router.get(
  '/stats/projects',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      // Projects per month for last 12 months
      const projectsPerMonth = db.prepare(`
        SELECT
          strftime('%Y', created_at) as year,
          strftime('%m', created_at) as month,
          COUNT(*) as count
        FROM projects
        WHERE created_at >= DATE('now', '-12 months')
        GROUP BY year, month
        ORDER BY year DESC, month DESC
      `).all() as { year: string; month: string; count: number }[];

      // Projects by area
      const romanziereProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE area = 'romanziere'").get() as { count: number };
      const saggistaProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE area = 'saggista'").get() as { count: number };
      const redattoreProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE area = 'redattore'").get() as { count: number };

      // Top 10 longest projects by word_count
      const top10LongestProjects = db.prepare(`
        SELECT p.id, p.title, p.area, p.word_count, u.name as author_name
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.word_count DESC
        LIMIT 10
      `).all() as { id: string; title: string; area: string; word_count: number; author_name: string }[];

      // Average chapters per project
      const avgChaptersResult = db.prepare(`
        SELECT AVG(chapter_count) as avg_chapters
        FROM (
          SELECT COUNT(*) as chapter_count
          FROM chapters
          GROUP BY project_id
        )
      `).get() as { avg_chapters: number | null };
      const avgChaptersPerProject = avgChaptersResult.avg_chapters || 0;

      res.json({
        projectsPerMonth,
        projectsByArea: {
          romanziere: romanziereProjects.count,
          saggista: saggistaProjects.count,
          redattore: redattoreProjects.count
        },
        top10LongestProjects,
        avgChaptersPerProject: Math.round(avgChaptersPerProject * 100) / 100
      });
    } catch (error) {
      console.error('[Admin] Error fetching project stats:', error);
      res.status(500).json({ message: 'Failed to fetch project statistics' });
    }
  }
);

/**
 * GET /api/admin/stats/usage
 * Get usage statistics (admin only)
 *
 * Feature #352: Usage statistics
 * Returns:
 * - totalAiGenerations: count of generation_logs entries
 * - totalSourcesUploaded: count of sources
 * - totalHumanModelsCreated: count of human_models
 * - exportsByFormat: { docx, epub, rtf, pdf, txt }
 */
router.get(
  '/stats/usage',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      // Total AI generations
      const totalAiGenerations = db.prepare('SELECT COUNT(*) as count FROM generation_logs').get() as { count: number };

      // Total sources uploaded
      const totalSourcesUploaded = db.prepare('SELECT COUNT(*) as count FROM sources').get() as { count: number };

      // Total human models created
      const totalHumanModelsCreated = db.prepare('SELECT COUNT(*) as count FROM human_models').get() as { count: number };

      // Exports by format
      const docxExports = db.prepare("SELECT COUNT(*) as count FROM export_history WHERE format = 'docx'").get() as { count: number };
      const epubExports = db.prepare("SELECT COUNT(*) as count FROM export_history WHERE format = 'epub'").get() as { count: number };
      const rtfExports = db.prepare("SELECT COUNT(*) as count FROM export_history WHERE format = 'rtf'").get() as { count: number };
      const pdfExports = db.prepare("SELECT COUNT(*) as count FROM export_history WHERE format = 'pdf'").get() as { count: number };
      const txtExports = db.prepare("SELECT COUNT(*) as count FROM export_history WHERE format = 'txt'").get() as { count: number };

      res.json({
        totalAiGenerations: totalAiGenerations.count,
        totalSourcesUploaded: totalSourcesUploaded.count,
        totalHumanModelsCreated: totalHumanModelsCreated.count,
        exportsByFormat: {
          docx: docxExports.count,
          epub: epubExports.count,
          rtf: rtfExports.count,
          pdf: pdfExports.count,
          txt: txtExports.count
        }
      });
    } catch (error) {
      console.error('[Admin] Error fetching usage stats:', error);
      res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
  }
);

/**
 * GET /api/admin/stats/activity
 * Get activity statistics for last 7 days (admin only)
 *
 * Feature #352: Activity statistics
 * Returns:
 * - activityLast7Days: { logins, projectCreations, generations } per day
 * - peakUsageHours: array of { hour, count } showing when most activity happens
 */
router.get(
  '/stats/activity',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      // Activity per day for last 7 days
      const activityLast7Days = db.prepare(`
        SELECT
          DATE(created_at) as date,
          SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins,
          SUM(CASE WHEN action = 'project_created' THEN 1 ELSE 0 END) as projectCreations,
          SUM(CASE WHEN action = 'generation_started' THEN 1 ELSE 0 END) as generations
        FROM (
          SELECT created_at, 'login' as action FROM users WHERE last_login_at >= DATE('now', '-7 days')
          UNION ALL
          SELECT created_at, 'project_created' as action FROM projects WHERE created_at >= DATE('now', '-7 days')
          UNION ALL
          SELECT created_at, 'generation_started' as action FROM generation_logs WHERE created_at >= DATE('now', '-7 days')
        )
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `).all() as { date: string; logins: number; projectCreations: number; generations: number }[];

      // Peak usage hours (based on generation_logs, projects, and user logins)
      const peakUsageHours = db.prepare(`
        SELECT
          CAST(strftime('%H', created_at) AS INTEGER) as hour,
          COUNT(*) as count
        FROM (
          SELECT created_at FROM generation_logs WHERE created_at >= DATE('now', '-30 days')
          UNION ALL
          SELECT created_at FROM projects WHERE created_at >= DATE('now', '-30 days')
          UNION ALL
          SELECT last_login_at as created_at FROM users WHERE last_login_at >= DATE('now', '-30 days')
        )
        WHERE created_at IS NOT NULL
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 24
      `).all() as { hour: number; count: number }[];

      res.json({
        activityLast7Days,
        peakUsageHours
      });
    } catch (error) {
      console.error('[Admin] Error fetching activity stats:', error);
      res.status(500).json({ message: 'Failed to fetch activity statistics' });
    }
  }
);

/**
 * GET /api/admin/stats/registrations
 * Get daily registration counts for last 30 days (admin only)
 *
 * Returns:
 * - registrationsByDate: array of { date, count } for last 30 days
 */
router.get(
  '/stats/registrations',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;

      // Get daily registration counts for last 30 days
      const registrationsByDate = db.prepare(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `).all() as { date: string; count: number }[];

      // Generate all dates for last 30 days (fill in missing dates with 0)
      const result = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const found = registrationsByDate.find(r => r.date === dateStr);
        result.push({
          date: dateStr,
          count: found ? found.count : 0
        });
      }

      res.json({ registrationsByDate: result });
    } catch (error) {
      console.error('[Admin] Error fetching registration stats:', error);
      res.status(500).json({ message: 'Failed to fetch registration statistics' });
    }
  }
);

/**
 * GET /api/admin/logs
 * Get admin audit logs with pagination (admin only)
 */
router.get(
  '/logs',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const logs = db.prepare(`
        SELECT al.*,
               u_admin.email as admin_email, u_admin.name as admin_name,
               u_target.email as target_email, u_target.name as target_name
        FROM admin_logs al
        LEFT JOIN users u_admin ON al.admin_id = u_admin.id
        LEFT JOIN users u_target ON al.target_user_id = u_target.id
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      const countResult = db.prepare('SELECT COUNT(*) as total FROM admin_logs').get() as { total: number };

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    } catch (error) {
      console.error('[Admin] Error fetching admin logs:', error);
      res.status(500).json({ message: 'Failed to fetch admin logs' });
    }
  }
);

/**
 * GET /api/admin/activity
 * Get platform activity log with pagination and filters (admin only)
 *
 * Feature #358: Comprehensive activity log
 * Combines data from:
 * - admin_logs (admin actions)
 * - generation_logs (AI generations)
 * - export_history (exports)
 * - projects (project creation)
 * - users (login activity)
 *
 * Query params:
 *   page (number, default 1)
 *   limit (number, default 50)
 *   actionType (string) - filter by action: admin, generation, export, project, login
 *   userId (string) - filter by user id
 *   startDate (string) - filter from date (YYYY-MM-DD)
 *   endDate (string) - filter to date (YYYY-MM-DD)
 */
router.get(
  '/activity',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = (req as any).db as Database;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const actionType = req.query.actionType as string || '';
      const userId = req.query.userId as string || '';
      const startDate = req.query.startDate as string || '';
      const endDate = req.query.endDate as string || '';

      // Build the combined activity query
      // We'll use UNION to combine different activity sources
      let unionQueries: string[] = [];
      let params: any[] = [];
      let countParams: any[] = [];

      // Helper to add date filters
      const addDateFilter = (baseQuery: string, dateColumn: string = 'created_at'): string => {
        let query = baseQuery;
        if (startDate) {
          query += ` AND DATE(${dateColumn}) >= ?`;
        }
        if (endDate) {
          query += ` AND DATE(${dateColumn}) <= ?`;
        }
        return query;
      };

      // Admin actions (role change, suspend, delete)
      if (!actionType || actionType === 'admin') {
        let adminQuery = `
          SELECT
            al.id,
            'admin' as action_type,
            al.action,
            al.admin_id as user_id,
            u_admin.name as user_name,
            u_admin.email as user_email,
            al.target_user_id,
            al.target_user_email,
            al.details,
            al.created_at
          FROM admin_logs al
          LEFT JOIN users u_admin ON al.admin_id = u_admin.id
          WHERE 1=1
        `;
        if (userId) {
          adminQuery += ` AND al.admin_id = ?`;
        }
        adminQuery = addDateFilter(adminQuery, 'al.created_at');
        unionQueries.push(adminQuery);
        if (userId) params.push(userId);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);
      }

      // AI Generations
      if (!actionType || actionType === 'generation') {
        let genQuery = `
          SELECT
            gl.id,
            'generation' as action_type,
            'AI Generation' as action,
            p.user_id,
            u.name as user_name,
            u.email as user_email,
            NULL as target_user_id,
            NULL as target_user_email,
            '{"project_id":"' || COALESCE(gl.project_id, '') || '","chapter_id":"' || COALESCE(gl.chapter_id, '') || '","model":"' || COALESCE(gl.model_used, '') || '","phase":"' || COALESCE(gl.phase, '') || '","tokens_input":' || COALESCE(gl.tokens_input, 0) || ',"tokens_output":' || COALESCE(gl.tokens_output, 0) || '}' as details,
            gl.created_at
          FROM generation_logs gl
          LEFT JOIN projects p ON gl.project_id = p.id
          LEFT JOIN users u ON p.user_id = u.id
          WHERE 1=1
        `;
        if (userId) {
          genQuery += ` AND p.user_id = ?`;
        }
        genQuery = addDateFilter(genQuery, 'gl.created_at');
        unionQueries.push(genQuery);
        if (userId) params.push(userId);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);
      }

      // Exports
      if (!actionType || actionType === 'export') {
        let exportQuery = `
          SELECT
            eh.id,
            'export' as action_type,
            'Export' as action,
            p.user_id,
            u.name as user_name,
            u.email as user_email,
            NULL as target_user_id,
            NULL as target_user_email,
            '{"project_id":"' || COALESCE(eh.project_id, '') || '","format":"' || COALESCE(eh.format, '') || '"}' as details,
            eh.created_at
          FROM export_history eh
          LEFT JOIN projects p ON eh.project_id = p.id
          LEFT JOIN users u ON p.user_id = u.id
          WHERE 1=1
        `;
        if (userId) {
          exportQuery += ` AND p.user_id = ?`;
        }
        exportQuery = addDateFilter(exportQuery, 'eh.created_at');
        unionQueries.push(exportQuery);
        if (userId) params.push(userId);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);
      }

      // Project creation
      if (!actionType || actionType === 'project') {
        let projectQuery = `
          SELECT
            p.id,
            'project' as action_type,
            'Project Created' as action,
            p.user_id,
            u.name as user_name,
            u.email as user_email,
            NULL as target_user_id,
            NULL as target_user_email,
            '{"title":"' || COALESCE(p.title, '') || '","area":"' || COALESCE(p.area, '') || '"}' as details,
            p.created_at
          FROM projects p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE 1=1
        `;
        if (userId) {
          projectQuery += ` AND p.user_id = ?`;
        }
        projectQuery = addDateFilter(projectQuery, 'p.created_at');
        unionQueries.push(projectQuery);
        if (userId) params.push(userId);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);
      }

      // User logins (based on last_login_at updates - we track when users logged in)
      // Note: We don't have individual login records, just last_login_at
      // For a proper login log, we'd need a separate table. For now, we'll skip this
      // or show recent logins based on last_login_at
      if (!actionType || actionType === 'login') {
        let loginQuery = `
          SELECT
            'login_' || u.id || '_' || DATE(u.last_login_at) as id,
            'login' as action_type,
            'Login' as action,
            u.id as user_id,
            u.name as user_name,
            u.email as user_email,
            NULL as target_user_id,
            NULL as target_user_email,
            '{}' as details,
            u.last_login_at as created_at
          FROM users u
          WHERE u.last_login_at IS NOT NULL
        `;
        if (userId) {
          loginQuery += ` AND u.id = ?`;
        }
        loginQuery = addDateFilter(loginQuery, 'u.last_login_at');
        unionQueries.push(loginQuery);
        if (userId) params.push(userId);
        if (startDate) params.push(startDate);
        if (endDate) params.push(endDate);
      }

      if (unionQueries.length === 0) {
        return res.json({
          activities: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }

      // Combine all queries with UNION
      const combinedQuery = unionQueries.join(' UNION ALL ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${combinedQuery}) as combined`;
      const countResult = db.prepare(countQuery).get(...params) as { total: number };
      const total = countResult.total;

      // Get paginated results
      const paginatedQuery = `${combinedQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const activities = db.prepare(paginatedQuery).all(...params, limit, offset);

      res.json({
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('[Admin] Error fetching activity log:', error);
      res.status(500).json({ message: 'Failed to fetch activity log' });
    }
  }
);

export default router;
