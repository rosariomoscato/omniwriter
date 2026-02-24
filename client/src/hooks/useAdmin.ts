import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to check if current user has admin role
 * Redirects to dashboard if not admin
 *
 * @returns Object with isAdmin flag and helper functions
 */
export const useAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = useMemo(() => {
    return user?.role === 'admin';
  }, [user?.role]);

  /**
   * Redirect non-admin users to dashboard
   */
  const requireAdmin = () => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
      return false;
    }
    return true;
  };

  return {
    isAdmin,
    requireAdmin,
    user: isAdmin ? user : null
  };
};
