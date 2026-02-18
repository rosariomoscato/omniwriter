// Feature #255, #266: Create Sequel Modal with Full Chapter Content Generation
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, BookOpen, Sparkles, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface CreateSequelModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    area: string;
  };
  language: 'it' | 'en';
  onSuccess: (projectId: string, chaptersGenerated?: number) => void;
  onError: (error: string) => void;
}

interface ProgressState {
  phase: string;
  message: string;
  chapterIndex?: number;
  totalChapters?: number;
  chapterTitle?: string;
  outlineComplete: boolean;
  chaptersCompleted: number;
  chaptersFailed: number;
  totalWordsGenerated: number;
}

export default function CreateSequelModal({
  isOpen,
  onClose,
  project,
  language,
  onSuccess,
  onError
}: CreateSequelModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [generateProposal, setGenerateProposal] = useState(true);
  const [numChapters, setNumChapters] = useState(10);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const abortControllerRef = useRef<{ abort: () => void } | null>(null);

  if (!isOpen) return null;

  const defaultTitle = project.title.includes(' - ')
    ? `${project.title.split(' - ')[0]} - Part 2`
    : `${project.title} - Part 2`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setProgress({
      phase: 'setup',
      message: language === 'it' ? 'Preparazione...' : 'Preparing...',
      outlineComplete: false,
      chaptersCompleted: 0,
      chaptersFailed: 0,
      totalWordsGenerated: 0
    });

    try {
      const streamController = apiService.createSequelStream(
        project.id,
        {
          title: title.trim() || undefined,
          generateProposal,
          language,
          numChapters
        },
        {
          onPhase: (data) => {
            setProgress(prev => prev ? {
              ...prev,
              phase: data.phase,
              message: data.message,
              chapterIndex: data.chapterIndex,
              totalChapters: data.totalChapters,
              chapterTitle: data.chapterTitle
            } : null);
          },
          onOutlineComplete: (data) => {
            setProgress(prev => prev ? {
              ...prev,
              outlineComplete: true,
              message: data.message
            } : null);
          },
          onChapterComplete: (data) => {
            setProgress(prev => prev ? {
              ...prev,
              chaptersCompleted: prev.chaptersCompleted + 1,
              totalWordsGenerated: data.totalWordsGenerated,
              message: data.chapterTitle
            } : null);
          },
          onChapterWarning: (data) => {
            setProgress(prev => prev ? {
              ...prev,
              chaptersFailed: prev.chaptersFailed + 1,
              message: `${data.chapterTitle}: ${data.message}`
            } : null);
          },
          onWarning: (data) => {
            console.warn('[SequelModal]', data.message);
          },
          onDone: (data) => {
            setProgress(prev => prev ? {
              ...prev,
              phase: 'done',
              message: data.message,
              chaptersCompleted: data.chaptersWithContent,
              chaptersFailed: data.chaptersFailed,
              totalWordsGenerated: data.totalWordsGenerated
            } : null);

            // Close modal and call success after a short delay
            setTimeout(() => {
              onSuccess(data.project.id, data.chaptersWithContent);
              onClose();
            }, 1500);
          },
          onError: (error) => {
            onError(error);
            setCreating(false);
            setProgress(null);
          }
        }
      );

      abortControllerRef.current = streamController;
      await streamController.promise;

    } catch (err: any) {
      onError(err.message || 'Failed to create sequel');
    } finally {
      setCreating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCreating(false);
    setProgress(null);
    onClose();
  };

  // Calculate progress percentage
  const progressPercent = progress?.totalChapters
    ? Math.round((progress.chaptersCompleted / progress.totalChapters) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('projectPage.sequel.title', 'Create Sequel')}
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t(
            'projectPage.sequel.description',
            'Create a sequel to "{{title}}" with all characters and locations copied over.',
            { title: project.title }
          )}
        </p>

        {/* Progress indicator */}
        {progress && creating && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {progress.message}
              </span>
            </div>

            {/* Progress bar */}
            {progress.totalChapters && progress.totalChapters > 0 && (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {t('projectPage.sequel.progress.chapters', '{{completed}}/{{total}} chapters', {
                      completed: progress.chaptersCompleted,
                      total: progress.totalChapters
                    })}
                  </span>
                  <span>
                    {t('projectPage.sequel.progress.words', '{{count}} words', {
                      count: progress.totalWordsGenerated.toLocaleString()
                    })}
                  </span>
                </div>
              </>
            )}

            {/* Phase steps */}
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className={`flex items-center gap-1 ${
                ['setup', 'copying', 'proposal', 'outline', 'generating', 'done'].indexOf(progress.phase) >= 0
                  ? 'text-green-500'
                  : 'text-gray-400'
              }`}>
                {progress.outlineComplete || progress.phase !== 'setup' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : progress.phase === 'setup' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-current" />
                )}
                {t('projectPage.sequel.progress.setup', 'Setup')}
              </span>
              <span className="text-gray-300">→</span>
              <span className={`flex items-center gap-1 ${
                progress.outlineComplete
                  ? 'text-green-500'
                  : progress.phase === 'outline'
                    ? 'text-purple-500'
                    : 'text-gray-400'
              }`}>
                {progress.outlineComplete ? (
                  <CheckCircle className="w-3 h-3" />
                ) : progress.phase === 'outline' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-current" />
                )}
                {t('projectPage.sequel.progress.outline', 'Outline')}
              </span>
              <span className="text-gray-300">→</span>
              <span className={`flex items-center gap-1 ${
                progress.chaptersCompleted > 0 || progress.phase === 'done'
                  ? 'text-green-500'
                  : progress.phase === 'generating'
                    ? 'text-purple-500'
                    : 'text-gray-400'
              }`}>
                {progress.chaptersCompleted > 0 || progress.phase === 'done' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : progress.phase === 'generating' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-current" />
                )}
                {t('projectPage.sequel.progress.content', 'Content')}
              </span>
            </div>

            {progress.chaptersFailed > 0 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-amber-500">
                <AlertCircle className="w-3 h-3" />
                {t('projectPage.sequel.progress.failed', '{{count}} chapters had issues', {
                  count: progress.chaptersFailed
                })}
              </div>
            )}
          </div>
        )}

        {/* Success message */}
        {progress?.phase === 'done' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-400">
              {progress.message}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('projectPage.sequel.sequelTitle', 'Sequel Title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              disabled={creating}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('projectPage.sequel.titleHint', 'Leave empty to use default: {{defaultTitle}}', { defaultTitle })}
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <input
              type="checkbox"
              id="generateProposal"
              checked={generateProposal}
              onChange={(e) => setGenerateProposal(e.target.checked)}
              disabled={creating}
              className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded disabled:opacity-50"
            />
            <div className="flex-1">
              <label htmlFor="generateProposal" className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {t('projectPage.sequel.generateProposal', 'Generate AI Sequel Proposal')}
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t(
                  'projectPage.sequel.generateProposalHint',
                  'AI will analyze your novel and suggest plot directions, character arcs, and chapter outlines for the sequel.'
                )}
              </p>
            </div>
          </div>

          {/* Feature #266: Full chapter content generation */}
          <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                <FileText className="w-4 h-4 text-purple-500" />
                {t('projectPage.sequel.fullContentGeneration', 'Generate Full Chapter Content')}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {t(
                  'projectPage.sequel.fullContentGenerationHint',
                  'AI will create complete chapter content (2000-3000 words each) for the sequel. This may take several minutes.'
                )}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  {t('projectPage.sequel.numChapters', 'Number of chapters:')}
                </label>
                <input
                  type="number"
                  min={5}
                  max={20}
                  value={numChapters}
                  onChange={(e) => setNumChapters(Math.max(5, Math.min(20, parseInt(e.target.value) || 10)))}
                  disabled={creating}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('projectPage.sequel.whatCopied', 'What will be copied:')}
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• {t('projectPage.sequel.characters', 'All characters (marked as returning)')}</li>
              <li>• {t('projectPage.sequel.locations', 'All locations')}</li>
              <li>• {t('projectPage.sequel.synopsis', 'Original synopsis (as reference)')}</li>
              <li>• {t('projectPage.sequel.sources', 'All source materials')}</li>
              <li>• {t('projectPage.sequel.saga', 'Saga/series linkage')}</li>
              <li className="text-purple-600 dark:text-purple-400">• {t('projectPage.sequel.fullChapters', '{{num}} chapters with full AI-generated content', { num: numChapters })}</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={false}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {creating
                ? t('common.cancel', 'Cancel')
                : t('common.cancel', 'Cancel')
              }
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('projectPage.sequel.creating', 'Creating...')}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  {t('projectPage.sequel.create', 'Create Sequel')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
