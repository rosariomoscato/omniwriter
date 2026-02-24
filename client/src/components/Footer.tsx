import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-gray-700">
      <p>
        {t('footer.builtWith')}{' '}
        <a
          href="mailto:ros.moscato@gmail.com"
          className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          RoMoS
        </a>{' '}
        {t('footer.allRightsReserved')}
      </p>
    </footer>
  );
}
