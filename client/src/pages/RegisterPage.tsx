import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService, ApiService } from '../services/api';
import { useFormValidation, ValidationRules } from '../hooks/useFormValidation';
import { FormInput } from '../components/FormField';
import Footer from '../components/Footer';

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const validationRules: ValidationRules = {
    name: { required: true, minLength: 2 },
    email: { required: true, email: true },
    password: {
      required: true,
      minLength: 8,
      custom: (value: string) => {
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumber = /\d/.test(value);
        if (!hasUpperCase) return 'Deve contenere almeno una lettera maiuscola';
        if (!hasLowerCase) return 'Deve contenere almeno una lettera minuscola';
        if (!hasNumber) return 'Deve contenere almeno un numero';
        return undefined;
      },
    },
    confirmPassword: {
      required: true,
      custom: (value: string) => {
        if (value !== formData.password) return 'Le password non coincidono';
        return undefined;
      },
    },
  };

  const { errors, touched, validateField, validateAll, clearAllErrors, setFieldTouched } =
    useFormValidation(validationRules);

  // Validate confirmPassword when password changes
  useEffect(() => {
    if (touched.confirmPassword) {
      validateField('confirmPassword', formData.confirmPassword);
    }
  }, [formData.password, touched.confirmPassword, validateField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validate field on change if already touched
    if (touched[name as keyof typeof touched]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setFieldTouched(name);
    validateField(name, formData[name as keyof typeof formData]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Prevent double-click submission
    if (isSubmittingRef.current) {
      return;
    }

    // Validate all fields
    if (!validateAll(formData)) {
      return;
    }

    // Mark as submitting immediately to prevent double-clicks
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const response = await apiService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Store auth data
      ApiService.setAuth(response.user, response.token);

      // Clear form data and errors to prevent resubmission on back navigation
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
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
      setServerError(err instanceof Error ? err.message : t('auth.registerError') || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.register') || 'Registrati'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.createAccount') || "Crea il tuo account OmniWriter"}
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white dark:bg-dark-surface p-8 rounded-lg shadow" onSubmit={handleSubmit}>
          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
              {serverError}
            </div>
          )}

          <div className="space-y-4">
            <FormInput
              id="name"
              name="name"
              type="text"
              label={t('auth.name') || 'Nome'}
              placeholder={t('auth.namePlaceholder') || 'Il tuo nome'}
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.name ? errors.name : undefined}
              required
            />

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

            <FormInput
              id="password"
              name="password"
              type="password"
              label={t('auth.password') || 'Password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password ? errors.password : undefined}
              helperText={t('auth.passwordHint') ||
                'Minimo 8 caratteri, una maiuscola, una minuscola e un numero'}
              required
            />

            <FormInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label={t('auth.confirmPassword') || 'Conferma password'}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || isSubmittingRef.current}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (t('common.loading') || 'Caricamento...')
                : (t('auth.register') || 'Registrati')}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.hasAccount') || 'Hai già un account?'}{' '}
            </span>
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              {t('auth.login') || 'Accedi'}
            </Link>
          </div>
        </form>
      </div>
      </div>
      <Footer />
    </div>
  );
}

export default RegisterPage;
