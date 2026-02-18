// Feature #255: Create Sequel Modal
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, BookOpen, Sparkles, FileText } from 'lucide-react';
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
  const [autoGenerateChapters, setAutoGenerateChapters] = useState(true);
  const [numChapters, setNumChapters] = useState(10);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const defaultTitle = project.title.includes(' - ')
    ? `${project.title.split(' - ')[0]} - Part 2`
    : `${project.title} - Part 2`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await apiService.createSequel(project.id, {
        title: title.trim() || undefined,
        generateProposal,
        language,
        autoGenerateChapters,
        numChapters
      });

      onSuccess(response.project.id, response.chaptersGenerated);
      onClose();
    } catch (err: any) {
      onError(err.message || 'Failed to create sequel');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
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

          {/* Feature #265: Auto-generate chapters option */}
          <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <input
              type="checkbox"
              id="autoGenerateChapters"
              checked={autoGenerateChapters}
              onChange={(e) => setAutoGenerateChapters(e.target.checked)}
              className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="autoGenerateChapters" className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <FileText className="w-4 h-4 text-purple-500" />
                {t('projectPage.sequel.autoGenerateChapters', 'Auto-generate Chapter Outline')}
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t(
                  'projectPage.sequel.autoGenerateChaptersHint',
                  'AI will create chapter titles and synopses for the sequel based on the previous novel\'s story.'
                )}
              </p>
              {autoGenerateChapters && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    {t('projectPage.sequel.numChapters', 'Number of chapters:')}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={numChapters}
                    onChange={(e) => setNumChapters(Math.max(5, Math.min(20, parseInt(e.target.value) || 10)))}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
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
              {autoGenerateChapters && (
                <li className="text-purple-600 dark:text-purple-400">• {t('projectPage.sequel.chaptersOutline', '{{num}} chapters with AI-generated titles', { num: numChapters })}</li>
              )}
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
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
