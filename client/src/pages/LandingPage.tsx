import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white dark:from-dark-surface dark:to-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              <span className="block">Scrittura AI</span>
              <span className="block text-primary-600">Senza Limiti</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
              La piattaforma professionale di scrittura basata su intelligenza artificiale.
              Genera romanzi, saggi e articoli giornalistici con stili unici e coerenti.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Inizia Gratis
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-lg font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-primary-600 dark:hover:border-primary-600 transition-colors"
              >
                Accedi
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Nessuna carta di credito richiesta • Piano gratuito disponibile
            </p>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tre Aree Creative Specializzate
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Scegli l'area perfetta per il tuo progetto di scrittura
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Romanziere */}
            <FeatureCard
              icon="📚"
              title="Romanziere"
              color="romanziere"
              description="Scrivi romanzi completi capitolo per capitolo. Gestisci personaggi, luoghi, trame e saghe complesse."
              features={[
                "Generazione chapter-by-chapter",
                "Sviluppo personaggi e relazioni",
                "Gestione saghe e serie",
                "Analisi stile personalizzato"
              ]}
            />

            {/* Saggista */}
            <FeatureCard
              icon="🎓"
              title="Saggista"
              color="saggista"
              description="Crea saggi approfonditi con gestione avanzata delle fonti e citazioni accademiche."
              features={[
                "Fonti e bibliografia",
                "Analisi approfondita o panoramica",
                "Citazioni automatiche",
                "Fact-checking AI"
              ]}
            />

            {/* Redattore */}
            <FeatureCard
              icon="📰"
              title="Redattore"
              color="redattore"
              description="Genera articoli, comunicati stampa e contenuti SEO-ottimizzati in pochi minuti."
              features={[
                "Template editoriali",
                "Ottimizzazione SEO",
                "Generazione headline",
                "Snippet social media"
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
              Piani e Prezzi
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Scegli il piano perfetto per le tue esigenze creative
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <PricingCard
              name="Free"
              price="€0"
              period="per sempre"
              description="Per iniziare a esplorare"
              features={[
                "Generazione limitata",
                "Human Model base",
                "Upload fonti limitato",
                "Export TXT, DOCX",
                "Ricerca web base"
              ]}
              ctaText="Inizia Gratis"
              ctaLink="/register"
              isPopular={false}
            />

            {/* Premium Plan */}
            <PricingCard
              name="Premium"
              price="€19"
              period="/mese"
              description="Per scrittori seri"
              features={[
                "Generazione illimitata",
                "Human Model avanzato",
                "Upload fonti illimitato",
                "Tutti i formati export",
                "SEO avanzato",
                "Google Drive",
                "Supporto prioritario"
              ]}
              ctaText="Inizia Prova Gratis"
              ctaLink="/register"
              isPopular={true}
            />

            {/* Lifetime Plan */}
            <PricingCard
              name="Lifetime"
              price="€299"
              period="una tantum"
              description="Accesso per sempre"
              features={[
                "Tutto Premium incluso",
                "Nessun canone mensile",
                "Aggiornamenti futuri",
                "Nuove funzionalità",
                "Supporto VIP"
              ]}
              ctaText="Ottieni Lifetime"
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
            Pronto a Trasformare le Tue Idee in Capolavori?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Unisciti a migliaia di scrittori che usano OmniWriter per creare contenuti straordinari.
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-5 bg-white text-primary-600 text-xl font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-xl"
          >
            Inizia Ora - È Gratis
          </Link>
          <p className="mt-6 text-primary-200 text-sm">
            Nessuna carta richiesta • Cancella quando vuoi
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p className="text-2xl font-bold text-white mb-4">OmniWriter</p>
            <p className="text-sm">
              © 2025 OmniWriter. Tutti i diritti riservati.
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
}

function PricingCard({ name, price, period, description, features, ctaText, ctaLink, isPopular }: PricingCardProps) {
  return (
    <div className={`relative bg-white dark:bg-dark-surface rounded-2xl p-8 shadow-xl ${
      isPopular ? 'border-2 border-primary-500 scale-105' : 'border border-gray-200 dark:border-gray-700'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Più Popolare
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
