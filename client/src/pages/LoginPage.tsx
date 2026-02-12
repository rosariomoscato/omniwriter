import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFormValidation, ValidationRules } from '../hooks/useFormValidation';
import { FormInput } from '../components/FormField';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id';

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const isSubmittingRef = useRef(false);

  const validationRules: ValidationRules = {
    email: { required: true, email: true },
    password: { required: true },
  };

  const { errors, touched, validateField, validateAll, clearAllErrors, setFieldTouched } =
    useFormValidation(validationRules);

  // Check for session expired flag on mount
  useEffect(() => {
    const expiredFlag = sessionStorage.getItem('sessionExpired');
    if (expiredFlag === 'true') {
      setSessionExpired(true);
      sessionStorage.removeItem('sessionExpired');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Validate field on change if already touched (not for checkbox)
    if (type !== 'checkbox' && touched[name as keyof typeof touched]) {
      validateField(name, String(value));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    if (name !== 'rememberMe') {
      setFieldTouched(name);
      const fieldValue = formData[name as keyof typeof formData];
      validateField(name, typeof fieldValue === 'boolean' ? '' : String(fieldValue));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Prevent double-click submission
    if (isSubmittingRef.current) {
      return;
    }

    // Validate all fields
    if (!validateAll({ email: formData.email, password: formData.password })) {
      return;
    }

    // Mark as submitting immediately to prevent double-clicks
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      // Use AuthContext login method which handles state and localStorage
      await login(formData.email, formData.password, formData.rememberMe);

      // Clear form data to prevent resubmission on back navigation
      setFormData({
        email: '',
        password: '',
        rememberMe: false,
      });
      clearAllErrors();

      // Check if there's a stored redirect location (from protected route redirect)
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        // Clear stored redirect
        sessionStorage.removeItem('redirectAfterLogin');
        // Redirect to originally requested page
        navigate(redirectPath, { replace: true });
      } else {
        // Default to dashboard if no stored redirect
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : (t('auth.loginError') || 'Email o password non validi'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.login') || 'Accedi'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.welcomeBack') || 'Bentornato su OmniWriter'}
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white dark:bg-dark-surface p-8 rounded-lg shadow" onSubmit={handleSubmit}>
          {/* Session Expired Message */}
          {sessionExpired && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Sessione scaduta</p>
                <p className="text-sm mt-1">La tua sessione è scaduta per inattività. Accedi di nuovo per continuare.</p>
              </div>
            </div>
          )}

          {/* Server Error Message */}
          {serverError && !sessionExpired && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
              {serverError}
            </div>
          )}

          <div className="space-y-4">
            <FormInput
              id="email"
              name="email"
              type="email"
              label={t('auth.email') || 'Email'}
              placeholder={t('auth.emailPlaceholder') || 'nome@esempio.com'}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email ? errors.email : undefined}
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.password') || 'Password'}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  {t('auth.forgotPassword') || 'Password dimenticata?'}
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 dark:text-white sm:text-sm ${
                  touched.password && errors.password
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500 dark:bg-red-900/10'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-bg'
                }`}
                placeholder="••••••••"
                aria-invalid={!!(touched.password && errors.password)}
                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                required
              />
              {touched.password && errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {t('auth.rememberMe') || 'Ricordami'}
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || isSubmittingRef.current}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (t('common.loading') || 'Caricamento...')
                : (t('auth.login') || 'Accedi')}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400">
                {t('auth.or') || 'oppure'}
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={() => {
              const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/google/callback')}&response_type=code&scope=profile email`;
              window.location.href = googleAuthUrl;
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.loginWithGoogle') || 'Accedi con Google'}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.noAccount') || 'Non hai un account?'}{' '}
            </span>
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              {t('auth.register') || 'Registrati'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
