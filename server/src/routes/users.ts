// @ts-nocheck
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/profile
// Get current user profile
router.get('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    console.log('[Users] Fetching profile for user:', req.user?.id);
    const user = db.prepare(
      `SELECT id, email, name, bio, avatar_url, role, subscription_status,
              subscription_expires_at, preferred_language, theme_preference,
              created_at, updated_at, last_login_at
       FROM users WHERE id = ?`
    ).get(req.user?.id) as Record<string, unknown> | undefined;

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('[Users] Get profile error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/profile
// Update user profile (name, bio, avatar_url)
interface UpdateProfileData {
  name?: string;
  bio?: string;
  avatar_url?: string;
  preferred_language?: 'it' | 'en';
  theme_preference?: 'light' | 'dark';
}

router.put('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, avatar_url, preferred_language, theme_preference } = req.body as UpdateProfileData;
    const db = getDatabase();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio.trim());
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url.trim());
    }
    if (preferred_language !== undefined) {
      updates.push('preferred_language = ?');
      values.push(preferred_language);
    }
    if (theme_preference !== undefined) {
      updates.push('theme_preference = ?');
      values.push(theme_preference);
    }

    if (updates.length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    // Always update updated_at
    updates.push('updated_at = datetime(\'now\')');
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    console.log('[Users] Updating profile for user:', userId);

    db.prepare(query).run(...values);

    // Fetch updated user
    const user = db.prepare(
      `SELECT id, email, name, bio, avatar_url, role, subscription_status,
              subscription_expires_at, preferred_language, theme_preference,
              created_at, updated_at, last_login_at
       FROM users WHERE id = ?`
    ).get(userId) as Record<string, unknown>;

    console.log('[Users] Profile updated successfully for user:', userId);
    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('[Users] Update profile error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/password
// Change user password
interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

router.put('/password', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordData;
    const db = getDatabase();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' });
      return;
    }

    // Validate new password
    if (newPassword.length < 8) {
      res.status(400).json({ message: 'New password must be at least 8 characters' });
      return;
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      res.status(400).json({
        message: 'New password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
      });
      return;
    }

    // Get current password hash
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string;
    } | undefined;

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify current password
    const isValidPassword = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const newPasswordHash = bcrypt.hashSync(newPassword, salt);

    // Update password
    console.log('[Users] Updating password for user:', userId);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(newPasswordHash, userId);

    console.log('[Users] Password updated successfully for user:', userId);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[Users] Change password error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/users/account
// Delete user account (requires password confirmation)
interface DeleteAccountData {
  password: string;
}

router.delete('/account', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as DeleteAccountData;
    const db = getDatabase();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!password) {
      res.status(400).json({ message: 'Password confirmation is required' });
      return;
    }

    // Get user password hash for verification
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string;
    } | undefined;

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Password is incorrect' });
      return;
    }

    // Delete user (CASCADE will delete all related data)
    console.log('[Users] Deleting account for user:', userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    console.log('[Users] Account deleted successfully for user:', userId);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('[Users] Delete account error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/users/preferences
// Get user preferences
router.get('/preferences', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    console.log('[Users] Fetching preferences for user:', req.user?.id);
    const preferences = db.prepare(
      `SELECT default_ai_model, default_quality_setting, dashboard_layout_json, keyboard_shortcuts_json,
              selected_provider_id, selected_model_id
       FROM user_preferences WHERE user_id = ?`
    ).get(req.user?.id) as Record<string, unknown> | undefined;

    if (!preferences) {
      // Return default preferences if not set
      res.json({
        preferences: {
          default_ai_model: '',
          default_quality_setting: 'balanced',
          dashboard_layout_json: '{}',
          keyboard_shortcuts_json: '{}',
          selected_provider_id: null,
          selected_model_id: '',
        },
      });
      return;
    }

    res.json({ preferences });
  } catch (error) {
    console.error('[Users] Get preferences error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/preferences
// Update user preferences
interface UpdatePreferencesData {
  default_ai_model?: string;
  default_quality_setting?: 'speed' | 'balanced' | 'quality';
  dashboard_layout_json?: string;
  keyboard_shortcuts_json?: string;
}

router.put('/preferences', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { default_ai_model, default_quality_setting, dashboard_layout_json, keyboard_shortcuts_json } =
      req.body as UpdatePreferencesData;
    const db = getDatabase();
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Check if preferences exist
    const existing = db.prepare('SELECT id FROM user_preferences WHERE user_id = ?').get(userId);

    if (existing) {
      // Update existing preferences
      const updates: string[] = [];
      const values: (string | number)[] = [];

      if (default_ai_model !== undefined) {
        updates.push('default_ai_model = ?');
        values.push(default_ai_model);
      }
      if (default_quality_setting !== undefined) {
        updates.push('default_quality_setting = ?');
        values.push(default_quality_setting);
      }
      if (dashboard_layout_json !== undefined) {
        updates.push('dashboard_layout_json = ?');
        values.push(dashboard_layout_json);
      }
      if (keyboard_shortcuts_json !== undefined) {
        updates.push('keyboard_shortcuts_json = ?');
        values.push(keyboard_shortcuts_json);
      }

      updates.push('updated_at = datetime(\'now\')');
      values.push(userId);

      const query = `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`;
      db.prepare(query).run(...values);
    } else {
      // Create new preferences
      const id = `pref_${userId}`;
      db.prepare(
        `INSERT INTO user_preferences (id, user_id, default_ai_model, default_quality_setting, dashboard_layout_json, keyboard_shortcuts_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        id,
        userId,
        default_ai_model || '',
        default_quality_setting || 'balanced',
        dashboard_layout_json || '{}',
        keyboard_shortcuts_json || '{}'
      );
    }

    console.log('[Users] Preferences updated for user:', userId);
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('[Users] Update preferences error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
