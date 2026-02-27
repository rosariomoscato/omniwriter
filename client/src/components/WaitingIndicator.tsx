import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Hourglass, Brain, X, AlertTriangle } from 'lucide-react';

interface WaitingIndicatorProps {
  /** Whether the indicator is active/showing */
  isActive: boolean;
  /** Start time of the waiting phase (timestamp in ms) */
  startTime: number | null;
  /** Optional: Reason for waiting (from server) */
  reason?: string;
  /** Optional: Cancel callback */
  onCancel?: () => void;
  /** Optional: Model name being used */
  modelName?: string;
  /** Optional: Whether this is a reasoning model (shows extra messaging) */
  isReasoningModel?: boolean;
  /** Optional: Estimated wait time in seconds */
  estimatedWaitSeconds?: number;
}

/**
 * WaitingIndicator component for slow reasoning models (Feature #395)
 *
 * Shows an animated progress bar with:
 * - Elapsed time in human-readable format (2:45 instead of 165s)
 * - Explanatory message about the model processing
 * - Optional time estimate
 * - Cancel button
 */
export function WaitingIndicator({
  isActive,
  startTime,
  reason,
  onCancel,
  modelName,
  isReasoningModel = false,
  estimatedWaitSeconds,
}: WaitingIndicatorProps) {
  const { t } = useTranslation();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Update elapsed time every second
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed(); // Initial update
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = useCallback((totalSeconds: number): string => {
    if (totalSeconds < 0) return '0:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage (if we have an estimate)
  const progressPercent = estimatedWaitSeconds
    ? Math.min(95, (elapsedSeconds / estimatedWaitSeconds) * 100)
    : null;

  // Calculate remaining time estimate
  const remainingSeconds = estimatedWaitSeconds
    ? Math.max(0, estimatedWaitSeconds - elapsedSeconds)
    : null;

  // Get phase description based on elapsed time
  const getPhaseDescription = (): string => {
    if (isReasoningModel) {
      if (elapsedSeconds < 30) {
        return t('waitingIndicator.reasoning.starting', 'Initializing reasoning process...');
      } else if (elapsedSeconds < 60) {
        return t('waitingIndicator.reasoning.analyzing', 'Analyzing context and planning...');
      } else if (elapsedSeconds < 120) {
        return t('waitingIndicator.reasoning.thinking', 'Deep reasoning in progress...');
      } else {
        return t('waitingIndicator.reasoning.extended', 'Extended reasoning for quality output...');
      }
    }
    return reason || t('waitingIndicator.processing', 'Processing...');
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel?.();
  };

  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 shadow-lg">
      {/* Main content row */}
      <div className="flex items-center gap-4 w-full">
        {/* Animated brain icon */}
        <div className="relative">
          <Brain className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
          <Hourglass className="w-5 h-5 text-orange-500 dark:text-orange-400 absolute -bottom-1 -right-1 animate-spin-slow" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Title with model name */}
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {isReasoningModel
                ? t('waitingIndicator.reasoningModelTitle', 'Reasoning Model Active')
                : t('waitingIndicator.title', 'AI Processing')}
            </h4>
            {modelName && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 rounded-full truncate max-w-32">
                {modelName}
              </span>
            )}
          </div>

          {/* Phase description */}
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {getPhaseDescription()}
          </p>

          {/* Time display */}
          <div className="flex items-center gap-3 mt-2">
            {/* Elapsed time */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {t('waitingIndicator.elapsed', 'Elapsed')}:
              </span>
              <span className="text-sm font-mono font-semibold text-amber-800 dark:text-amber-200">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* Remaining time estimate */}
            {remainingSeconds !== null && remainingSeconds > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {t('waitingIndicator.remaining', 'Est. remaining')}:
                </span>
                <span className="text-sm font-mono text-amber-700 dark:text-amber-300">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel button */}
        {onCancel && !showCancelConfirm && (
          <button
            onClick={handleCancelClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
            title={t('waitingIndicator.cancel', 'Cancel generation')}
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t('waitingIndicator.cancel', 'Cancel')}</span>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="h-2 bg-amber-100 dark:bg-amber-900/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 dark:from-amber-500 dark:via-orange-500 dark:to-amber-600 rounded-full transition-all duration-300"
            style={{
              width: progressPercent !== null ? `${progressPercent}%` : '100%',
              animation: progressPercent === null ? 'progress-indeterminate 2s infinite linear' : 'none',
            }}
          />
        </div>
      </div>

      {/* Explanatory message */}
      <div className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          {isReasoningModel
            ? t(
                'waitingIndicator.reasoningExplanation',
                'Advanced reasoning models produce higher quality content by thinking through the output step by step. This takes longer but results in more coherent and creative text.'
              )
            : t(
                'waitingIndicator.standardExplanation',
                'The AI model is processing your request. Generation will begin shortly.'
              )}
        </p>
      </div>

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('waitingIndicator.cancelConfirmTitle', 'Cancel Generation?')}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t(
                'waitingIndicator.cancelConfirmMessage',
                'Are you sure you want to cancel? Any progress will be lost and you will need to start over.'
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
              >
                {t('common.continue', 'Continue Waiting')}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('waitingIndicator.confirmCancel', 'Yes, Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for indeterminate animation */}
      <style>{`
        @keyframes progress-indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to manage waiting indicator state
 */
export function useWaitingIndicator() {
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingStartTime, setWaitingStartTime] = useState<number | null>(null);
  const [waitingReason, setWaitingReason] = useState<string | undefined>();
  const [modelName, setModelName] = useState<string | undefined>();
  const [isReasoningModel, setIsReasoningModel] = useState(false);
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<number | undefined>();

  const startWaiting = useCallback(
    (options?: {
      reason?: string;
      modelName?: string;
      isReasoningModel?: boolean;
      estimatedWaitSeconds?: number;
    }) => {
      setIsWaiting(true);
      setWaitingStartTime(Date.now());
      setWaitingReason(options?.reason);
      setModelName(options?.modelName);
      setIsReasoningModel(options?.isReasoningModel ?? false);
      setEstimatedWaitSeconds(options?.estimatedWaitSeconds);
    },
    []
  );

  const stopWaiting = useCallback(() => {
    setIsWaiting(false);
    setWaitingStartTime(null);
    setWaitingReason(undefined);
    // Keep model name and reasoning status in case generation restarts
  }, []);

  const updateWaitingReason = useCallback((reason: string) => {
    setWaitingReason(reason);
  }, []);

  return {
    isWaiting,
    waitingStartTime,
    waitingReason,
    modelName,
    isReasoningModel,
    estimatedWaitSeconds,
    startWaiting,
    stopWaiting,
    updateWaitingReason,
    setModelName,
    setIsReasoningModel,
    setEstimatedWaitSeconds,
  };
}

export default WaitingIndicator;
