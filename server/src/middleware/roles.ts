import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * @deprecated Feature #401: No longer needed - all authenticated users have full access.
 * Kept for backward compatibility but now allows any authenticated user through.
 */
export function requirePremium(req: AuthRequest, res: Response, next: NextFunction): void {
  const userRole = req.user?.role;

  // Feature #401: All authenticated users (user or admin) have full access
  if (userRole === 'user' || userRole === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    message: 'Authentication required',
    code: 'AUTH_REQUIRED'
  });
}

/**
 * Check if user has admin role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const userRole = req.user?.role;

  if (userRole === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    message: 'This feature requires admin privileges',
    code: 'ADMIN_REQUIRED'
  });
}
