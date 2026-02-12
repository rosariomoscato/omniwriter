import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Check if user has premium or lifetime role
 * Admins also have premium access
 */
export function requirePremium(req: AuthRequest, res: Response, next: NextFunction): void {
  const userRole = req.user?.role;

  if (userRole === 'premium' || userRole === 'lifetime' || userRole === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    message: 'This feature requires a Premium subscription',
    code: 'PREMIUM_REQUIRED'
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
