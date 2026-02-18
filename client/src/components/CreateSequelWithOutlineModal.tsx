// Feature #267: Create Sequel with Outline Preview Modal
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2, BookOpen, Sparkles, FileText, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Edit2, RefreshCw, X, Check, Pencil
} from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface CreateSequelWithOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    area: string;
  };
  language: 'it' | 'en';
  onSuccess: (projectId: string) => void;
  onError: (error: string) => void;
}

interface ChapterOutline {
  title: string;
  summary: string;
  returning_characters?: string[];
  new_elements?: string[];
  connection_to_previous?: string;
}

interface Outline {
  sequelTitle: string;
  chapters: ChapterOutline[];
  themes?: string[];
  characterArcs?: string[];
}

interface EditingChapter {
  index: number;
  title: string;
  summary: string;
}

export default function CreateSequelWithOutlineModal({
  isOpen,
  onClose,
  project,
  language,
  onSuccess,
  onError
}: CreateSequelWithOutlineModalProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [numChapters, setNumChapters] = useState(10);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [editingChapter, setEditingChapter] = useState<EditingChapter | null>(null);

  const isItalian = language === 'it';

  const defaultTitle = project.title.includes(' - ')
    ? `${project.title.split(' - ')[0]} - Part 2`
    : `${project.title} - Part 2`;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setNumChapters(10);
      setOutline(null);
      setLoading(false);
      setCreating(false);
      setExpandedChapters(new Set());
      setEditingChapter(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateOutline = async () => {
    setLoading(true);
    setOutline(null);

    try {
      const response = await apiService.generateSequelOutline(
        project.id,
        title.trim() || undefined,
        language,
        numChapters
      );

      if (response.success && response.outline) {
        setOutline(response.outline);
        // Expand first 3 chapters by default
        setExpandedChapters(new Set([0, 1, 2]));
      } else {
        onError(response.message || t('projectPage.sequelPreview.outlineError', 'Failed to generate outline'));
      }
    } catch (err: any) {
      onError(err.message || t('projectPage.sequelPreview.outlineError', 'Failed to generate outline'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSequel = async () => {
    if (!outline) return;

    setCreating(true);

    try {
      const response = await apiService.confirmSequel(
        project.id,
        title.trim() || outline.sequelTitle,
        outline,
        language
      );

      toast.success(t('projectPage.sequelPreview.success', 'Sequel created successfully!'));
      onSuccess(response.project.id);
      onClose();
    } catch (err: any) {
      onError(err.message || t('projectPage.sequelPreview.createError', 'Failed to create sequel'));
    } finally {
      setCreating(false);
    }
  };

  const toggleChapter = (index: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChapters(newExpanded);
  };

  const startEditingChapter = (index: number) => {
    const chapter = outline?.chapters[index];
    if (chapter) {
      setEditingChapter({
        index,
        title: chapter.title,
        summary: chapter.summary
      });
    }
  };

  const saveChapterEdit = () => {
    if (!outline || editingChapter === null) return;

    const updatedChapters = [...outline.chapters];
    updatedChapters[editingChapter.index] = {
      ...updatedChapters[editingChapter.index],
      title: editingChapter.title,
      summary: editingChapter.summary
    };

    setOutline({
      ...outline,
      chapters: updatedChapters
    });
    setEditingChapter(null);
  };

  const cancelChapterEdit = () => {
    setEditingChapter(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('projectPage.sequelPreview.title', 'Create Sequel')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t(
              'projectPage.sequelPreview.description',
              'Create a sequel to "{{title}}" with AI-generated chapter outline. Review and edit before confirming.',
              { title: project.title }
            )}
          </p>

          {/* Phase 1: Initial Configuration */}
          {!outline && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('projectPage.sequel.sequelTitle', 'Sequel Title')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={defaultTitle}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('projectPage.sequel.numChapters', 'Number of chapters:')}
                </label>
                <input
                  type="number"
                  min={5}
                  max={20}
                  value={numChapters}
                  onChange={(e) => setNumChapters(Math.max(5, Math.min(20, parseInt(e.target.value) || 10)))}
                  disabled={loading}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleGenerateOutline}
                disabled={loading}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('projectPage.sequelPreview.generating', 'Generating outline...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('projectPage.sequelPreview.generateOutline', 'Generate Chapter Outline')}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Phase 2: Outline Preview */}
          {outline && (
            <div className="space-y-4">
              {/* Title display */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                  {outline.sequelTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {outline.chapters.length} {t('projectPage.sequelPreview.chaptersPlanned', 'chapters planned')}
                </p>
              </div>

              {/* Themes (if any) */}
              {outline.themes && outline.themes.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('projectPage.sequelPreview.themes', 'Themes to explore')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {outline.themes.map((theme, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters list */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('projectPage.sequelPreview.chapterOutline', 'Chapter Outline')}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t('projectPage.sequelPreview.editHint', 'Click on a chapter to expand and edit')}
                </p>

                {outline.chapters.map((chapter, index) => {
                  const isExpanded = expandedChapters.has(index);
                  const isEditing = editingChapter?.index === index;

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                    >
                      {/* Chapter header */}
                      <div
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => !isEditing && toggleChapter(index)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6">
                            #{index + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingChapter.title}
                                onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-1 border border-purple-400 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              />
                            ) : (
                              chapter.title
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingChapter(index);
                              }}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title={t('common.edit', 'Edit')}
                            >
                              <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </div>

                      {/* Chapter content (expanded) */}
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                  {t('projectPage.sequelPreview.summary', 'Summary')}
                                </label>
                                <textarea
                                  value={editingChapter.summary}
                                  onChange={(e) => setEditingChapter({ ...editingChapter, summary: e.target.value })}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-purple-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelChapterEdit}
                                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                >
                                  {t('common.cancel', 'Cancel')}
                                </button>
                                <button
                                  onClick={saveChapterEdit}
                                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-4 h-4" />
                                  {t('common.save', 'Save')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                  {chapter.summary}
                                </p>
                              </div>

                              {chapter.returning_characters && chapter.returning_characters.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {t('projectPage.sequelPreview.returningCharacters', 'Returning characters')}:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {chapter.returning_characters.map((char, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded"
                                      >
                                        {char}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {chapter.connection_to_previous && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  <span className="font-medium">
                                    {t('projectPage.sequelPreview.connection', 'Connection to previous novel')}:
                                  </span>{' '}
                                  {chapter.connection_to_previous}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  disabled={creating}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>

                <button
                  onClick={handleGenerateOutline}
                  disabled={loading || creating}
                  className="px-4 py-2 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('projectPage.sequelPreview.regenerate', 'Regenerate')}
                </button>

                <button
                  onClick={handleConfirmSequel}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('projectPage.sequelPreview.creating', 'Creating sequel...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {t('projectPage.sequelPreview.confirmAndCreate', 'Accept & Create Sequel')}
                    </>
                  )}
                </button>
              </div>

              {/* What will be copied */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('projectPage.sequel.whatCopied', 'What will be copied:')}
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• {t('projectPage.sequel.characters', 'All characters (marked as returning)')}</li>
                  <li>• {t('projectPage.sequel.locations', 'All locations')}</li>
                  <li>• {t('projectPage.sequel.synopsis', 'Original synopsis (as reference)')}</li>
                  <li>• {t('projectPage.sequel.sources', 'All source materials')}</li>
                  <li className="text-purple-600 dark:text-purple-400">
                    • {t('projectPage.sequelPreview.chaptersWithSynopsis', '{{num}} chapters with titles and summaries', { num: outline.chapters.length })}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
