import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database';
import { User } from '../models/User';

export interface AuthRequest extends Omit<Request, 'user'> {
  user?: Pick<User, 'id' | 'email' | 'name' | 'role'>;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };

    // Query the real database to get user info
    const db = getDatabase();
    console.log('[Auth] Verifying token for user:', decoded.userId);
    const userRow = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.userId) as User | undefined;

    if (!userRow) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Extract only the required fields
    req.user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
    };
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'omniwriter-dev-jwt-secret-2024';
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };

    const db = getDatabase();
    const userRow = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.userId) as User | undefined;

    if (userRow) {
      req.user = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
      };
    }
  } catch {
    // Token is invalid, but we don't block the request
  }

  next();
}
