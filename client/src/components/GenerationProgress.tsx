import { useState } from 'react';
import { useGenerationProgress } from '../contexts/GenerationProgressContext';
import { Loader2, CheckCircle2, XCircle, FileText, Edit3, Sparkles, X, AlertTriangle } from 'lucide-react';

const PHASE_CONFIG = {
  structure: {
    icon: FileText,
    label: 'Structure',
    description: 'Analyzing and planning the content structure...',
  },
  writing: {
    icon: Edit3,
    label: 'Writing',
    description: 'Generating content using AI models...',
  },
  revision: {
    icon: Sparkles,
    label: 'Revision',
    description: 'Polishing and refining the content...',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    description: 'Content generation complete!',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    description: 'Generation failed. Please try again.',
  },
  idle: {
    icon: FileText,
    label: 'Ready',
    description: '',
  },
};

export default function GenerationProgress() {
  const { progress, cancelGeneration } = useGenerationProgress();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (progress.phase === 'idle') {
    return null;
  }

  const isCompleted = progress.phase === 'completed';
  const isFailed = progress.phase === 'failed';
  const isActive = !isCompleted && !isFailed;

  const currentConfig = PHASE_CONFIG[progress.phase];
  const Icon = currentConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${
            isCompleted ? 'bg-green-100 dark:bg-green-900/30' :
            isFailed ? 'bg-red-100 dark:bg-red-900/30' :
            'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            <Icon className={`w-6 h-6 ${
              isCompleted ? 'text-green-600 dark:text-green-400' :
              isFailed ? 'text-red-600 dark:text-red-400' :
              'text-blue-600 dark:text-blue-400'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${
              isCompleted ? 'text-green-900 dark:text-green-100' :
              isFailed ? 'text-red-900 dark:text-red-100' :
              'text-gray-900 dark:text-gray-100'
            }`}>
              {currentConfig.label}
            </h3>
            {isActive && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Step {progress.currentStep} of {progress.totalSteps}
              </p>
            )}
          </div>
          {isActive && (
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          )}
        </div>

        {/* Description */}
        <p className={`text-sm mb-4 ${
          isCompleted ? 'text-green-700 dark:text-green-300' :
          isFailed ? 'text-red-700 dark:text-red-300' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          {progress.message || currentConfig.description}
        </p>

        {/* Phase Indicators */}
        <div className="space-y-2 mb-4">
          {(['structure', 'writing', 'revision'] as const).map((phase, index) => {
            const phaseConfig = PHASE_CONFIG[phase];
            const PhaseIcon = phaseConfig.icon;
            const isPhaseActive = progress.phase === phase;
            const isPhaseCompleted = index + 1 < progress.currentStep || isCompleted;
            const isPhasePending = index + 1 > progress.currentStep && !isCompleted;

            return (
              <div
                key={phase}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isPhaseActive ? 'bg-blue-50 dark:bg-blue-900/20' :
                  isPhaseCompleted ? 'bg-green-50 dark:bg-green-900/20' :
                  'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className={`p-1.5 rounded-md ${
                  isPhaseActive ? 'bg-blue-200 dark:bg-blue-800' :
                  isPhaseCompleted ? 'bg-green-200 dark:bg-green-800' :
                  'bg-gray-200 dark:bg-gray-700'
                }`}>
                  <PhaseIcon className={`w-4 h-4 ${
                    isPhaseActive ? 'text-blue-700 dark:text-blue-300' :
                    isPhaseCompleted ? 'text-green-700 dark:text-green-300' :
                    'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isPhaseActive ? 'text-blue-900 dark:text-blue-100' :
                    isPhaseCompleted ? 'text-green-900 dark:text-green-100' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {phaseConfig.label}
                  </p>
                </div>
                {isPhaseActive && (
                  <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                )}
                {isPhaseCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
                {isPhasePending && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        {isActive && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Token Count (optional) */}
        {progress.tokenCount !== undefined && progress.tokenCount > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            ~{progress.tokenCount.toLocaleString()} tokens generated
          </div>
        )}

        {/* Action Buttons */}
        {isActive && (
          <>
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel Generation
              </button>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Are you sure you want to cancel? Any progress will be lost.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Keep Generating
                  </button>
                  <button
                    onClick={cancelGeneration}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Yes, Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {isFailed && (
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
