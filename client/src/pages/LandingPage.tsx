import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  // Get current language, default to Italian if not set
  const currentLang = i18n.language || 'it';

  const toggleLanguage = async () => {
    const newLang = currentLang === 'it' ? 'en' : 'it';
    await i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Landing Page Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold text-primary-600 dark:text-primary-500">
              {t('app.name')}
            </Link>

            {/* Right Actions - Language & Theme Switchers */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="
                  p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors duration-200
                  flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200
                "
                aria-label={`Switch to ${currentLang === 'it' ? 'English' : 'Italiano'}`}
                title={`Switch to ${currentLang === 'it' ? 'English' : 'Italiano'}`}
              >
                <Globe size={18} />
                <span className="hidden sm:inline">{currentLang.toUpperCase()}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="
                  p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors duration-200
                  text-gray-700 dark:text-gray-200
                "
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* Login/Register Buttons */}
              <Link
                to="/login"
                className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-500 transition-colors"
              >
                {t('landing.login')}
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                {t('landing.startFree')}
              </Link>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white dark:from-dark-surface dark:to-dark-bg pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              <span className="block">{t('landing.heroTitle')}</span>
              <span className="block text-primary-600">{t('landing.heroSubtitle')}</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
              {t('landing.heroDescription')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
              >
                {t('landing.startFree')}
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-lg font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-primary-600 dark:hover:border-primary-600 transition-colors"
              >
                {t('landing.login')}
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('landing.noCreditCard')}
            </p>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Romanziere */}
            <FeatureCard
              icon="📚"
              title={t('landing.romanziere.title')}
              color="romanziere"
              description={t('landing.romanziere.description')}
              features={[
                t('landing.romanziere.feature1'),
                t('landing.romanziere.feature2'),
                t('landing.romanziere.feature3'),
                t('landing.romanziere.feature4')
              ]}
            />

            {/* Saggista */}
            <FeatureCard
              icon="🎓"
              title={t('landing.saggista.title')}
              color="saggista"
              description={t('landing.saggista.description')}
              features={[
                t('landing.saggista.feature1'),
                t('landing.saggista.feature2'),
                t('landing.saggista.feature3'),
                t('landing.saggista.feature4')
              ]}
            />

            {/* Redattore */}
            <FeatureCard
              icon="📰"
              title={t('landing.redattore.title')}
              color="redattore"
              description={t('landing.redattore.description')}
              features={[
                t('landing.redattore.feature1'),
                t('landing.redattore.feature2'),
                t('landing.redattore.feature3'),
                t('landing.redattore.feature4')
              ]}
            />

            {/* Marketplace */}
            <FeatureCard
              icon="🛍️"
              title={t('landing.marketplace.title')}
              color="marketplace"
              description={t('landing.marketplace.description')}
              features={[
                t('landing.marketplace.feature1'),
                t('landing.marketplace.feature2'),
                t('landing.marketplace.feature3'),
                t('landing.marketplace.feature4')
              ]}
            />
          </div>
        </div>
      </section>

      {/* Free For All Section */}
      <section className="py-24 bg-gray-50 dark:bg-dark-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-8">
            <span className="text-5xl">🎁</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('landing.freeForAll.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            {t('landing.freeForAll.subtitle')}
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t('landing.freeForAll.description')}
          </p>
          <div className="mt-10">
            <Link
              to="/register"
              className="inline-block px-10 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
            >
              {t('landing.freeForAll.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p className="text-2xl font-bold text-white mb-4">{t('app.name')}</p>
            <p className="text-sm">
              {t('footer.builtWith')}{' '}
              <a
                href="mailto:ros.moscato@gmail.com"
                className="hover:text-primary-400 transition-colors"
              >
                RoMoS
              </a>{' '}
              {t('footer.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  color: 'romanziere' | 'saggista' | 'redattore' | 'marketplace';
  description: string;
  features: string[];
}

function FeatureCard({ icon, title, color, description, features }: FeatureCardProps) {
  const colorClasses = {
    romanziere: 'text-romanziere bg-romanziere/10 border-romanziere/20',
    saggista: 'text-saggista bg-saggista/10 border-saggista/20',
    redattore: 'text-redattore bg-redattore/10 border-redattore/20',
    marketplace: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700'
  };

  return (
    <div className="relative bg-white dark:bg-dark-surface rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-700 group">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${colorClasses[color]} mb-6 group-hover:scale-110 transition-transform`}>
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

