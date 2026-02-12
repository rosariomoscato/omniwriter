import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthCallbackPage - Handles OAuth callbacks from Google
 *
 * This page receives the token and userId from the backend OAuth callback
 * and stores them in localStorage and AuthContext.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const error = searchParams.get('error');

    if (error) {
      console.error('[AuthCallback] OAuth error:', error);
      navigate('/login', { replace: true });
      return;
    }

    if (token && userId) {
      // Store the token and user info
      localStorage.setItem('token', token);

      // Fetch user info using the token
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));

            // Update AuthContext
            if (loginWithToken) {
              loginWithToken(data.user, token);
            }

            // Redirect to dashboard
            navigate('/dashboard', { replace: true });
          }
        })
        .catch(err => {
          console.error('[AuthCallback] Failed to fetch user:', err);
          navigate('/login', { replace: true });
        });
    } else {
      // No token or userId, redirect to login
      console.error('[AuthCallback] No token or userId in callback');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Completamento accesso...
        </p>
      </div>
    </div>
  );
}
