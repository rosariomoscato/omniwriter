import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Newspaper,
  Plus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Upload
} from 'lucide-react';

interface OnboardingGuideProps {
  onClose?: () => void;
}

export default function OnboardingGuide({ onClose }: OnboardingGuideProps) {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <BookOpen className="w-8 h-8 text-amber-600" />,
      titleKey: 'dashboard.onboarding.areas.romanziere.title',
      descriptionKey: 'dashboard.onboarding.areas.romanziere.description',
      featureKeys: [
        'dashboard.onboarding.areas.romanziere.feature1',
        'dashboard.onboarding.areas.romanziere.feature2',
        'dashboard.onboarding.areas.romanziere.feature3',
        'dashboard.onboarding.areas.romanziere.feature4'
      ],
      link: '/projects/new?area=romanziere'
    },
    {
      icon: <FileText className="w-8 h-8 text-teal-600" />,
      titleKey: 'dashboard.onboarding.areas.saggista.title',
      descriptionKey: 'dashboard.onboarding.areas.saggista.description',
      featureKeys: [
        'dashboard.onboarding.areas.saggista.feature1',
        'dashboard.onboarding.areas.saggista.feature2',
        'dashboard.onboarding.areas.saggista.feature3',
        'dashboard.onboarding.areas.saggista.feature4'
      ],
      link: '/projects/new?area=saggista'
    },
    {
      icon: <Newspaper className="w-8 h-8 text-rose-600" />,
      titleKey: 'dashboard.onboarding.areas.redattore.title',
      descriptionKey: 'dashboard.onboarding.areas.redattore.description',
      featureKeys: [
        'dashboard.onboarding.areas.redattore.feature1',
        'dashboard.onboarding.areas.redattore.feature2',
        'dashboard.onboarding.areas.redattore.feature3',
        'dashboard.onboarding.areas.redattore.feature4'
      ],
      link: '/projects/new?area=redattore'
    }
  ];

  const gettingStarted = [
    {
      titleKey: 'dashboard.onboarding.step1',
      descriptionKey: 'dashboard.onboarding.step1Desc',
      icon: <Plus className="w-5 h-5" />
    },
    {
      titleKey: 'dashboard.onboarding.step2',
      descriptionKey: 'dashboard.onboarding.step2Desc',
      icon: <Upload className="w-5 h-5" />
    },
    {
      titleKey: 'dashboard.onboarding.step3',
      descriptionKey: 'dashboard.onboarding.step3Desc',
      icon: <Sparkles className="w-5 h-5" />
    }
  ];

  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 mb-8 border border-primary-200 dark:border-primary-800">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('dashboard.onboarding.welcome')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('dashboard.onboarding.subtitle')}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={t('dashboard.onboarding.close')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Getting Started Steps */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            {t('dashboard.onboarding.gettingStarted')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gettingStarted.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                  <div className="text-primary-600 dark:text-primary-400">
                    {step.icon}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t(step.titleKey)}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(step.descriptionKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Area Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            {t('dashboard.onboarding.chooseArea')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <Link
                key={index}
                to={step.link}
                className="group bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col h-full">
                  <div className="mb-4">{step.icon}</div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t(step.titleKey)}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                    {t(step.descriptionKey)}
                  </p>
                  <ul className="space-y-2 mb-4">
                    {step.featureKeys.map((featureKey, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                        {t(featureKey)}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:gap-3 transition-all">
                    {t('project.create')}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Import Option */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {t('dashboard.onboarding.importOption')}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('dashboard.onboarding.importDesc')}
          </p>
          <Link
            to="/dashboard"
            onClick={(e) => {
              // Trigger import modal
              const event = new CustomEvent('open-import-modal');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-2 px-6 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t('dashboard.onboarding.importProject')}
          </Link>
        </div>
      </div>
    </div>
  );
}
