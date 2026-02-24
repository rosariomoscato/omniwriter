import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Mail } from 'lucide-react';
import api from '../services/api';
import Footer from '../components/Footer';

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Prevent double-click submission
    if (isSubmittingRef.current) {
      return;
    }

    // Mark as submitting immediately to prevent double-clicks
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la richiesta di reset password');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-dark-surface p-8 rounded-lg shadow text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email inviata
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Se esiste un account associato a {email}, riceverai un'email con le istruzioni per resettare la password.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-left text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Modalità sviluppo</p>
                  <p className="text-xs">Controlla il terminale del server per vedere il link di reset.</p>
                </div>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-block text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
            >
              Torna al login
            </Link>
          </div>
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Mail className="w-12 h-12 text-primary-600 mx-auto" />
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Password dimenticata?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Inserisci la tua email e ti invieremo le istruzioni per resettare la password
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white dark:bg-dark-surface p-8 rounded-lg shadow" onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-bg dark:text-white sm:text-sm"
              placeholder="nome@esempio.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || isSubmittingRef.current}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Invio in corso...' : 'Invia email di reset'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Torna al login
            </Link>
          </div>
        </form>
      </div>
      </div>
      <Footer />
    </div>
  );
}

export default ForgotPasswordPage;
