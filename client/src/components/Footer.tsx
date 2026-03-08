import { useTranslation } from 'react-i18next';
import { Github, Mail } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <p>
          {t('footer.builtWith')}{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Rosario Moscato
          </span>
          {' '}{t('footer.allRightsReserved')}
        </p>
        <div className="flex items-center gap-4">
          <a
            href="mailto:ros.moscato@gmail.com"
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
            title={t('footer.email')}
          >
            <Mail className="w-4 h-4" />
          </a>
          <a
            href="https://github.com/rosariomoscato/omniwriter"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
            title={t('footer.viewOnGitHub')}
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">{t('footer.github')}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
