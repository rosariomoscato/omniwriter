import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-5xl font-bold text-primary-600 mb-4">OmniWriter</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 text-center max-w-2xl">
        Piattaforma di scrittura professionale basata su intelligenza artificiale.
        Genera romanzi, saggi e articoli giornalistici con l'aiuto dell'AI.
      </p>
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
          Inizia Gratis
        </button>
        <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors font-medium">
          Accedi
        </button>
      </div>
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <FeatureCard
          title="Romanziere"
          description="Scrivi romanzi completi capitolo per capitolo con analisi dei personaggi e trama."
          color="text-romanziere"
        />
        <FeatureCard
          title="Saggista"
          description="Crea saggi approfonditi con gestione delle fonti e citazioni."
          color="text-saggista"
        />
        <FeatureCard
          title="Redattore"
          description="Genera articoli, comunicati stampa e contenuti SEO-ottimizzati."
          color="text-redattore"
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description, color }: { title: string; description: string; color: string }) {
  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <h3 className={`text-xl font-semibold mb-2 ${color}`}>{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Pagina non trovata</p>
      <a href="/" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        Torna alla Home
      </a>
    </div>
  );
}

export default App;
