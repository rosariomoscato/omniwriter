import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-white dark:bg-cosmic overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-20 w-60 h-60 bg-accent-500/10 dark:bg-accent-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-2xl" />
      </div>

      {/* Landing Page Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-accent-400 bg-clip-text text-transparent">
                {t('app.name')}
              </span>
            </Link>

            {/* Right Actions - Language & Theme Switchers */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="
                  p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated
                  transition-all duration-200
                  flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300
                  hover:text-gray-900 dark:hover:text-white
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
                  p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated
                  transition-all duration-200
                  text-gray-600 dark:text-gray-300
                  hover:text-gray-900 dark:hover:text-white
                "
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* Login/Register Buttons */}
              <Link
                to="/login"
                className="ml-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-dark-elevated"
              >
                {t('landing.login')}
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm"
              >
                {t('landing.startFree')}
              </Link>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-28">
        {/* Animated background grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700/50 mb-8">
              <span className="glow-dot" />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">AI-Powered Writing Platform</span>
            </div>

            <h1 className="heading-1 mb-6">
              <span className="block bg-gradient-to-b from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {t('landing.heroTitle')}
              </span>
              <span className="block gradient-text-hero mt-2">
                {t('landing.heroSubtitle')}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('landing.heroDescription')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn-primary text-lg px-8 py-4"
              >
                {t('landing.startFree')}
              </Link>
              <Link
                to="/login"
                className="btn-secondary text-lg px-8 py-4"
              >
                {t('landing.login')}
              </Link>
              <Link
                to="/marketplace"
                className="px-8 py-4 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 text-lg font-semibold rounded-xl border-2 border-accent-200 dark:border-accent-700/50 hover:bg-accent-100 dark:hover:bg-accent-900/30 hover:border-accent-300 dark:hover:border-accent-600 transition-all"
              >
                {t('landing.exploreMarketplace')}
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-500 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('landing.noCreditCard')}
            </p>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-gray-50/50 dark:bg-dark-surface/50 relative">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.03)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[size:24px_24px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="py-24 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 to-transparent dark:from-green-900/10 dark:to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 mb-8 shadow-lg shadow-green-500/25">
            <span className="text-4xl">🎁</span>
          </div>
          <h2 className="heading-2 mb-4">
            {t('landing.freeForAll.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            {t('landing.freeForAll.subtitle')}
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
            {t('landing.freeForAll.description')}
          </p>
          <div className="mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40 hover:from-green-400 hover:to-emerald-400 transition-all"
            >
              {t('landing.freeForAll.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gray-900 dark:bg-black py-12 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">{t('app.name')}</span>
            </div>
            <p className="text-gray-400 text-sm">
              {t('footer.builtWith')}{' '}
              <a
                href="mailto:ros.moscato@gmail.com"
                className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
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
    romanziere: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200/50 dark:border-amber-700/30',
      icon: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/25',
      hover: 'hover:shadow-amber-500/10 hover:border-amber-300 dark:hover:border-amber-600/50',
      check: 'text-amber-500'
    },
    saggista: {
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      border: 'border-teal-200/50 dark:border-teal-700/30',
      icon: 'bg-gradient-to-br from-teal-400 to-teal-500 shadow-teal-500/25',
      hover: 'hover:shadow-teal-500/10 hover:border-teal-300 dark:hover:border-teal-600/50',
      check: 'text-teal-500'
    },
    redattore: {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200/50 dark:border-rose-700/30',
      icon: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-rose-500/25',
      hover: 'hover:shadow-rose-500/10 hover:border-rose-300 dark:hover:border-rose-600/50',
      check: 'text-rose-500'
    },
    marketplace: {
      bg: 'bg-accent-50 dark:bg-accent-900/20',
      border: 'border-accent-200/50 dark:border-accent-700/30',
      icon: 'bg-gradient-to-br from-accent-400 to-purple-500 shadow-accent-500/25',
      hover: 'hover:shadow-accent-500/10 hover:border-accent-300 dark:hover:border-accent-600/50',
      check: 'text-accent-500'
    }
  };

  const styles = colorClasses[color];

  return (
    <div className={`group relative p-6 rounded-2xl bg-white dark:bg-dark-card border ${styles.border} shadow-sm hover:shadow-xl ${styles.hover} transition-all duration-300`}>
      {/* Icon */}
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${styles.icon} shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-serif">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-5 text-sm leading-relaxed">{description}</p>

      {/* Features list */}
      <ul className="space-y-2.5">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <svg className={`w-4 h-4 ${styles.check} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

