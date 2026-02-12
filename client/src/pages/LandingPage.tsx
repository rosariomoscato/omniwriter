import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white dark:from-dark-surface dark:to-dark-bg">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-50 dark:bg-dark-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <PricingCard
              name={t('landing.pricing.free.name')}
              price={t('landing.pricing.free.price')}
              period={t('landing.pricing.free.period')}
              description={t('landing.pricing.free.description')}
              features={[
                t('landing.pricing.free.feature1'),
                t('landing.pricing.free.feature2'),
                t('landing.pricing.free.feature3'),
                t('landing.pricing.free.feature4'),
                t('landing.pricing.free.feature5')
              ]}
              ctaText={t('landing.startFree')}
              ctaLink="/register"
              isPopular={false}
            />

            {/* Premium Plan */}
            <PricingCard
              name={t('landing.pricing.premium.name')}
              price={t('landing.pricing.premium.price')}
              period={t('landing.pricing.premium.period')}
              description={t('landing.pricing.premium.description')}
              features={[
                t('landing.pricing.premium.feature1'),
                t('landing.pricing.premium.feature2'),
                t('landing.pricing.premium.feature3'),
                t('landing.pricing.premium.feature4'),
                t('landing.pricing.premium.feature5'),
                t('landing.pricing.premium.feature6'),
                t('landing.premium.premium.feature7')
              ]}
              ctaText={t('common.register')}
              ctaLink="/register"
              isPopular={true}
              popularLabel={t('landing.pricing.premium.popular')}
            />

            {/* Lifetime Plan */}
            <PricingCard
              name={t('landing.pricing.lifetime.name')}
              price={t('landing.pricing.lifetime.price')}
              period={t('landing.pricing.lifetime.period')}
              description={t('landing.pricing.lifetime.description')}
              features={[
                t('landing.pricing.lifetime.feature1'),
                t('landing.pricing.lifetime.feature2'),
                t('landing.pricing.lifetime.feature3'),
                t('landing.pricing.lifetime.feature4'),
                t('landing.pricing.lifetime.feature5')
              ]}
              ctaText={t('landing.lifetime.feature5')}
              ctaLink="/register"
              isPopular={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-5 bg-white text-primary-600 text-xl font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-xl"
          >
            {t('landing.cta.button')}
          </Link>
          <p className="mt-6 text-primary-200 text-sm">
            {t('landing.cta.noCard')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p className="text-2xl font-bold text-white mb-4">{t('app.name')}</p>
            <p className="text-sm">
              {t('landing.footer.copyright')}
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
  color: 'romanziere' | 'saggista' | 'redattore';
  description: string;
  features: string[];
}

function FeatureCard({ icon, title, color, description, features }: FeatureCardProps) {
  const colorClasses = {
    romanziere: 'text-romanziere bg-romanziere/10 border-romanziere/20',
    saggista: 'text-saggista bg-saggista/10 border-saggista/20',
    redattore: 'text-redattore bg-redattore/10 border-redattore/20'
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

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  isPopular: boolean;
  popularLabel?: string;
}

function PricingCard({ name, price, period, description, features, ctaText, ctaLink, isPopular, popularLabel }: PricingCardProps) {
  return (
    <div className={`relative bg-white dark:bg-dark-surface rounded-2xl p-8 shadow-xl ${
      isPopular ? 'border-2 border-primary-500 scale-105' : 'border border-gray-200 dark:border-gray-700'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            {popularLabel}
          </span>
        </div>
      )}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-extrabold text-gray-900 dark:text-white">{price}</span>
          <span className="text-gray-500 dark:text-gray-400">{period}</span>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to={ctaLink}
        className={`block w-full text-center py-4 rounded-lg font-semibold transition-colors ${
          isPopular
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {ctaText}
      </Link>
    </div>
  );
}
