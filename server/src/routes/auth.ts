import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const router = Router();

// Passport serialization for session support
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

// Apply rate limiting to auth endpoints
router.use(authRateLimit);

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }

    // Password complexity check
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      res.status(400).json({
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
      });
      return;
    }

    const db = getDatabase();

    // Check if user already exists
    console.log('[Auth] Checking if user exists with email:', email);
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create user
    const userId = uuidv4();
    const userName = name || email.split('@')[0];

    console.log('[Auth] Creating new user:', userId);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'user', 'it', 'light', datetime('now'), datetime('now'))`
    ).run(userId, email, passwordHash, userName);

    // Create JWT token
    const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
    // @ts-expect-error - expiresIn type compatibility issue with jsonwebtoken types
    const token = jwt.sign(
      { userId, email },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Store session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    console.log('[Auth] Creating session for user:', userId);
    db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(sessionId, userId, token, expiresAt);

    // Update last login
    db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(userId);

    console.log('[Auth] User registered successfully:', userId);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        email,
        name: userName,
        role: 'user',
        preferred_language: 'it',
        theme_preference: 'light',
      },
      token,
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const db = getDatabase();

    // Find user by email
    console.log('[Auth] Looking up user by email:', email);
    const user = db.prepare(
      'SELECT id, email, password_hash, name, role, preferred_language, theme_preference FROM users WHERE email = ?'
    ).get(email) as {
      id: string;
      email: string;
      password_hash: string;
      name: string;
      role: string;
      preferred_language: string;
      theme_preference: string;
    } | undefined;

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Create JWT token
    const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
    const expiresIn = rememberMe
      ? (process.env.JWT_REMEMBER_ME_EXPIRES_IN || '30d')
      : (process.env.JWT_EXPIRES_IN || '24h');
    // @ts-expect-error - expiresIn type compatibility issue with jsonwebtoken types
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      secret,
      { expiresIn }
    );

    // Store session
    const sessionId = uuidv4();
    const expiresMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresMs).toISOString();
    console.log('[Auth] Creating session for login:', user.id);
    db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(sessionId, user.id, token, expiresAt);

    // Update last login
    db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

    console.log('[Auth] Login successful for user:', user.id);
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferred_language: user.preferred_language,
        theme_preference: user.theme_preference,
      },
      token,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// POST /api/auth/logout
// @ts-expect-error - AuthRequest type compatibility with router
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      console.log('[Auth] Removing session for user:', req.user?.id);
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Auth] Logout error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error during logout' });
  }
});

// GET /api/auth/me
// @ts-expect-error - AuthRequest type compatibility with router
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();

    console.log('[Auth] Fetching user profile for:', req.user?.id);
    const user = db.prepare(
      `SELECT id, email, name, bio, avatar_url, role,
              preferred_language, theme_preference,
              storage_used_bytes, storage_limit_bytes,
              created_at, updated_at, last_login_at
       FROM users WHERE id = ?`
    ).get(req.user?.id) as Record<string, unknown> | undefined;

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('[Auth] Get me error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const db = getDatabase();
    console.log('[Auth] Password reset requested for:', email);
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as {
      id: string;
      email: string;
    } | undefined;

    if (user) {
      // Generate reset token
      const resetToken = uuidv4();
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      // Store token in database (expires in 1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const tokenId = uuidv4();
      db.prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).run(tokenId, user.id, resetToken, expiresAt);

      // Log to console (development mode - no email service)
      console.log('==================================================');
      console.log('[EMAIL] Password Reset Link for:', email);
      console.log('[EMAIL] Reset URL:', resetUrl);
      console.log('[EMAIL] Token expires:', expiresAt);
      console.log('==================================================');
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ message: 'Token and password are required' });
      return;
    }

    // Password validation
    if (password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      res.status(400).json({
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
      });
      return;
    }

    const db = getDatabase();

    // Find valid reset token
    console.log('[Auth] Looking up reset token');
    const resetToken = db.prepare(
      `SELECT prt.id, prt.user_id, prt.expires_at, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > datetime('now')
       ORDER BY prt.created_at DESC
       LIMIT 1`
    ).get(token) as {
      id: string;
      user_id: string;
      email: string;
      expires_at: string;
    } | undefined;

    if (!resetToken) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Update user password
    console.log('[Auth] Updating password for user:', resetToken.user_id);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(passwordHash, resetToken.user_id);

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);

    // Invalidate all existing sessions for this user (force re-login)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(resetToken.user_id);

    console.log('[Auth] Password reset successful for user:', resetToken.user_id);
    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================================
// GOOGLE OAUTH CONFIGURATION
// ============================================================================

// Track if Google OAuth has been initialized
let googleOAuthInitialized = false;

/**
 * Initialize Google OAuth Strategy lazily after environment variables are loaded.
 * This function should be called from index.ts after dotenv.config() has run.
 * It reads environment variables directly at call time, not at module load time.
 */
export function initGoogleOAuth(): void {
  // Only initialize once
  if (googleOAuthInitialized) {
    console.log('[Google OAuth] Already initialized, skipping');
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  // Validate required configuration
  if (!clientId || !clientSecret) {
    console.warn('[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET - Google OAuth will not be available');
    console.warn('[Google OAuth] Set these environment variables to enable Google authentication');
    return;
  }

  console.log('[Google OAuth] Initializing with callback URL:', callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const db = getDatabase();

          // Check if user exists with this Google ID
          const existingUser = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id) as any;

          if (existingUser) {
            // User exists, update tokens and log them in
            console.log('[Google OAuth] Existing user found:', existingUser.id);
            db.prepare('UPDATE users SET google_access_token = ?, google_refresh_token = ? WHERE id = ?')
              .run(accessToken, refreshToken, existingUser.id);
            return done(null, { ...existingUser, google_access_token: accessToken, google_refresh_token: refreshToken });
          }

          // Check if user exists with the same email (merge accounts)
          if (profile.emails && profile.emails[0]) {
            const emailUser = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.emails[0].value) as any;

            if (emailUser) {
              // Link Google account to existing user
              console.log('[Google OAuth] Linking Google to existing user:', emailUser.id);
              db.prepare('UPDATE users SET google_id = ?, google_access_token = ?, google_refresh_token = ? WHERE id = ?')
                .run(profile.id, accessToken, refreshToken, emailUser.id);
              return done(null, { ...emailUser, google_id: profile.id, google_access_token: accessToken, google_refresh_token: refreshToken });
            }
          }

          // Create new user from Google profile
          const userId = uuidv4();
          const email = profile.emails?.[0]?.value || `${profile.id}@google.temp`;
          const name = profile.displayName || profile.name?.givenName || 'Google User';
          const avatarUrl = profile.photos?.[0]?.value || null;

          console.log('[Google OAuth] Creating new user from Google:', userId);
          db.prepare(
            `INSERT INTO users (id, email, name, avatar_url, google_id, google_access_token, google_refresh_token, role, preferred_language, theme_preference, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 'it', 'light', datetime('now'), datetime('now'))`
          ).run(userId, email, name, avatarUrl, profile.id, accessToken, refreshToken);

          const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
          return done(null, newUser);
        } catch (error) {
          console.error('[Google OAuth] Strategy error:', error);
          return done(error as Error);
        }
      }
    )
  );

  googleOAuthInitialized = true;
  console.log('[Google OAuth] Strategy configured successfully');
}

// GET /api/auth/google
// Initiate Google OAuth flow
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// GET /api/auth/google/callback
// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        res.redirect('/login?error=no_user');
        return;
      }

      // Create JWT token
      const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
      // @ts-expect-error - expiresIn type compatibility issue with jsonwebtoken types
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Store session
      const db = getDatabase();
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).run(sessionId, user.id, token, expiresAt);

      // Update last login
      db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

      console.log('[Google OAuth] Login successful for user:', user.id);

      // Redirect to frontend with token (use CLIENT_URL env var for production support)
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&userId=${user.id}`);
    } catch (error) {
      console.error('[Google OAuth] Callback error:', error);
      res.redirect('/login?error=callback_failed');
    }
  }
);

export default router;
