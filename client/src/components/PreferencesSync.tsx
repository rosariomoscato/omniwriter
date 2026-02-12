import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * PreferencesSync component
 *
 * Syncs user preferences from the backend to the frontend when a user logs in.
 * This ensures that language and theme preferences persist across logout/login on different devices.
 *
 * For features:
 * - #42: Language switcher changes interface
 * - #43: Theme preference persists across sessions
 */
export default function PreferencesSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!user) return;

    // Sync language preference from backend
    if (user.preferred_language && i18n.language !== user.preferred_language) {
      i18n.changeLanguage(user.preferred_language);
      localStorage.setItem('language', user.preferred_language);
    }

    // Sync theme preference from backend
    // Only update if backend preference exists and is different from current
    if (user.theme_preference && theme !== user.theme_preference) {
      setTheme(user.theme_preference);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.preferred_language, user?.theme_preference, i18n, setTheme]);

  // This component doesn't render anything
  return null;
}
