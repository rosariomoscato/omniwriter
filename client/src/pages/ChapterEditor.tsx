import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Save, ArrowLeft, Bold, Italic, Heading1, Eye, Edit, Loader2, Clock } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import VersionHistory from '../components/VersionHistory';
import VersionComparison from '../components/VersionComparison';
import { apiService, Chapter, Project, ChapterVersion } from '../services/api';

export default function ChapterEditor() {
  const { id: projectId, chapterId } = useParams();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [comparisonVersions, setComparisonVersions] = useState<{ v1: ChapterVersion | null; v2: ChapterVersion | null }>({ v1: null, v2: null });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (chapterId) {
      loadChapter();
    }
  }, [chapterId]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    // Calculate word count
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [content]);

  const loadChapter = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChapter(chapterId!);
      setChapter(response.chapter);
      setContent(response.chapter.content || '');
      setTitle(response.chapter.title);
    } catch (err: any) {
      setError(err.message || 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async () => {
    try {
      const response = await apiService.getProject(projectId!);
      setProject(response.project);
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  const handleSave = async () => {
    if (!chapterId) return;

    try {
      setSaving(true);
      setError('');

      await apiService.updateChapter(chapterId, {
        title: title.trim(),
        content
      });

      // Update local state
      if (chapter) {
        setChapter({
          ...chapter,
          title: title.trim(),
          content,
          word_count: wordCount,
          updated_at: new Date().toISOString()
        });
      }

      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);

    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    setContent(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };

  const handleBold = () => insertFormatting('**', '**');
  const handleItalic = () => insertFormatting('*', '*');
  const handleHeading = () => insertFormatting('# ', '');

  const renderPreview = () => {
    // Simple markdown-to-html conversion for preview
    let html = content;

    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Paragraphs
    html = html.split('\n\n').map(p => `<p class="mb-4">${p.replace(/\n/g, '<br>')}</p>`).join('');

    return { __html: html };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading chapter...
        </div>
      </div>
    );
  }

  if (!chapter || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">
          Chapter not found
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-bg">
      <Breadcrumbs />

      {/* Editor Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface">
        <div className="p-4">
          {/* Back button and actions */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {wordCount} words
              </span>
              <button
                onClick={() => setIsPreview(!isPreview)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={isPreview ? 'Edit' : 'Preview'}
              >
                {isPreview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-2xl font-bold border-0 border-b-2 border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:border-blue-500 text-gray-900 dark:text-gray-100"
            placeholder="Chapter title..."
          />
        </div>

        {/* Formatting Toolbar */}
        {!isPreview && (
          <div className="px-4 pb-2 flex items-center gap-1">
            <button
              onClick={handleHeading}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Heading"
            >
              <Heading1 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleBold}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-bold"
              title="Bold"
            >
              <Bold className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleItalic}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors italic"
              title="Italic"
            >
              <Italic className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto">
        {isPreview ? (
          <div className="p-6">
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={renderPreview()}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full min-h-[500px] p-6 border-0 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 focus:outline-none resize-none font-serif leading-relaxed"
            placeholder="Start writing your chapter here..."
            spellCheck
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div>
          Status: <span className="font-medium">{chapter.status}</span>
        </div>
        {lastSaved && (
          <div>
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
