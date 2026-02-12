import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, ArrowLeft, Bold, Italic, Heading1, Eye, Edit, Loader2, Clock, Undo, Redo, Search, X, ChevronUp, ChevronDown, Maximize, Minimize } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import VersionHistory from '../components/VersionHistory';
import VersionComparison from '../components/VersionComparison';
import { EditorSkeleton } from '../components/Skeleton';
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
  const [nextAutoSaveIn, setNextAutoSaveIn] = useState(30); // Countdown to next auto-save
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [readingTime, setReadingTime] = useState(0); // in minutes

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const periodicSaveIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Undo/Redo history stacks
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoActionRef = useRef(false);
  const lastContentRef = useRef<string>('');

  useEffect(() => {
    if (chapterId) {
      loadChapter();
    }

    // Cleanup function to clear intervals on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (periodicSaveIntervalRef.current) {
        clearInterval(periodicSaveIntervalRef.current);
      }
    };
  }, [chapterId]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Set up periodic auto-save every 30 seconds (feature #55)
  useEffect(() => {
    // Clear any existing intervals
    if (periodicSaveIntervalRef.current) {
      clearInterval(periodicSaveIntervalRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Reset countdown
    setNextAutoSaveIn(30);

    // Set up countdown timer (updates every second)
    countdownIntervalRef.current = setInterval(() => {
      setNextAutoSaveIn(prev => {
        if (prev <= 1) {
          // Reset to 30 when reaching 0 (just before save triggers)
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    // Set up periodic auto-save interval (every 30 seconds)
    periodicSaveIntervalRef.current = setInterval(() => {
      if (content && title) {
        console.log('[Auto-save] Periodic save triggered (30 seconds)');
        handleSave();
        // Reset countdown after save
        setNextAutoSaveIn(30);
      }
    }, 30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      if (periodicSaveIntervalRef.current) {
        clearInterval(periodicSaveIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [content, title]); // Re-run when content or title changes

  useEffect(() => {
    // Calculate word count
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);

    // Calculate reading time (average reading speed: 200 words per minute)
    const readingMinutes = Math.ceil(words.length / 200);
    setReadingTime(readingMinutes);
  }, [content]);

  // Update matches when find text or content changes
  useEffect(() => {
    if (findText && content) {
      const searchContent = caseSensitive ? content : content.toLowerCase();
      const searchText = caseSensitive ? findText : findText.toLowerCase();
      const foundMatches: number[] = [];
      let index = 0;

      while ((index = searchContent.indexOf(searchText, index)) !== -1) {
        foundMatches.push(index);
        index += searchText.length;
      }

      setMatches(foundMatches);
      setMatchCount(foundMatches.length);
      setCurrentMatchIndex(foundMatches.length > 0 ? 0 : -1);
    } else {
      setMatches([]);
      setMatchCount(0);
      setCurrentMatchIndex(-1);
    }
  }, [findText, content, caseSensitive]);

  const loadChapter = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChapter(chapterId!);
      setChapter(response.chapter);
      const chapterContent = response.chapter.content || '';
      setContent(chapterContent);
      setTitle(response.chapter.title);

      // Initialize history with loaded content
      historyRef.current = [chapterContent];
      historyIndexRef.current = 0;
      lastContentRef.current = chapterContent;
      setCanUndo(false);
      setCanRedo(false);
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

    // Add to history for undo/redo (if not an undo/redo action)
    // Only add to history when content actually changes
    if (!isUndoRedoActionRef.current && value !== lastContentRef.current) {
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;

      // Remove any redo history when making new changes
      const newHistory = currentHistory.slice(0, currentIndex + 1);

      // Only add if this is a new state (not same as last state)
      const lastState = newHistory[newHistory.length - 1];
      if (lastState !== value) {
        newHistory.push(value);
        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        lastContentRef.current = value;

        // Update undo/redo button states
        setCanUndo(newHistory.length > 1);
        setCanRedo(false);
      }
    } else {
      isUndoRedoActionRef.current = false;
    }

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

  // Handle undo
  const handleUndo = useCallback(() => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const previousContent = history[newIndex];

      isUndoRedoActionRef.current = true;
      setContent(previousContent);
      historyIndexRef.current = newIndex;

      // Update button states
      setCanUndo(newIndex > 0);
      setCanRedo(true);
    }
  }, []);

  // Handle redo
  const handleRedo = useCallback(() => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      const nextContent = history[newIndex];

      isUndoRedoActionRef.current = true;
      setContent(nextContent);
      historyIndexRef.current = newIndex;

      // Update button states
      setCanUndo(true);
      setCanRedo(newIndex < history.length - 1);
    }
  }, []);

  // Find & Replace handlers
  const handleFindNext = useCallback(() => {
    if (matches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    highlightMatch(matches[nextIndex]);
  }, [matches, currentMatchIndex]);

  const handleFindPrevious = useCallback(() => {
    if (matches.length === 0) return;

    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    highlightMatch(matches[prevIndex]);
  }, [matches, currentMatchIndex]);

  const highlightMatch = (position: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const searchText = caseSensitive ? findText : findText.toLowerCase();
    const actualPosition = caseSensitive
      ? position
      : content.toLowerCase().indexOf(findText.toLowerCase(), position);

    if (actualPosition !== -1) {
      textarea.focus();
      textarea.setSelectionRange(actualPosition, actualPosition + searchText.length);
    }
  };

  const handleReplace = useCallback(() => {
    if (matches.length === 0) return;

    const currentMatchPos = matches[currentMatchIndex];
    const searchText = caseSensitive ? findText : findText.toLowerCase();
    const actualPosition = caseSensitive
      ? currentMatchPos
      : content.toLowerCase().indexOf(findText.toLowerCase(), currentMatchPos);

    if (actualPosition !== -1) {
      const before = content.substring(0, actualPosition);
      const after = content.substring(actualPosition + searchText.length);
      const newContent = before + replaceText + after;

      setContent(newContent);

      // Move to next match
      if (matches.length > 1) {
        setCurrentMatchIndex(0); // Will be updated by useEffect
      }
    }
  }, [matches, currentMatchIndex, findText, replaceText, content, caseSensitive]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) return;

    const searchText = caseSensitive ? findText : findText.toLowerCase();
    let newContent = caseSensitive ? content : content;

    if (!caseSensitive) {
      // Case-insensitive replace all
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      newContent = content.replace(regex, replaceText);
    } else {
      // Case-sensitive replace all
      newContent = content.split(searchText).join(replaceText);
    }

    setContent(newContent);
  }, [matches, findText, replaceText, content, caseSensitive]);

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect Ctrl+Z (undo) and Ctrl+Shift+Z or Ctrl+Y (redo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          handleRedo();
        } else {
          // Undo
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        // Redo
        e.preventDefault();
        handleRedo();
      }

      // Find & Replace shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
      }

      // ESC key to exit full screen
      if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault();
        setIsFullScreen(false);
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);

    return () => {
      textarea.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo, isFullScreen]);

  const handleRestore = (restoredContent: string) => {
    isUndoRedoActionRef.current = true; // Don't add to history on restore
    setContent(restoredContent);
    setShowVersionHistory(false);

    // Update history
    const newHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), restoredContent];
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;

    // Auto-save the restored content
    setTimeout(() => handleSave(), 100);
  };

  const handleCompare = (version1: ChapterVersion, version2: ChapterVersion) => {
    setComparisonVersions({ v1: version1, v2: version2 });
    setShowVersionHistory(false);
  };

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
      <div className="h-full flex flex-col bg-white dark:bg-dark-bg">
        <Breadcrumbs />
        <div className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            <EditorSkeleton />
          </div>
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
    <div className={`h-full flex flex-col bg-white dark:bg-dark-bg ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>
      {!isFullScreen && <Breadcrumbs />}

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
              {wordCount > 0 && (
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  • {readingTime} min read
                </span>
              )}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
              >
                {isFullScreen ? <Minimize className="w-4 h-4 text-gray-700 dark:text-gray-300" /> : <Maximize className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
              </button>
              <button
                onClick={() => setShowFindReplace(!showFindReplace)}
                className={`p-2 rounded-lg border transition-colors ${showFindReplace ? 'bg-blue-50 border-blue-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                title="Find & Replace (Ctrl+F)"
              >
                <Search className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setShowVersionHistory(true)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Version History"
              >
                <Clock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
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

          {/* Find & Replace Bar */}
          {showFindReplace && !isPreview && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Find..."
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : 'No results'}</span>
                  <button
                    onClick={handleFindPrevious}
                    disabled={matchCount === 0}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                    title="Find Previous"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFindNext}
                    disabled={matchCount === 0}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                    title="Find Next"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded"
                  />
                  Case
                </label>
                <button
                  onClick={() => {
                    setShowFindReplace(false);
                    setFindText('');
                    setReplaceText('');
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Replace with..."
                  />
                </div>
                <button
                  onClick={handleReplace}
                  disabled={matchCount === 0}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={matchCount === 0}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Replace All
                </button>
              </div>
            </div>
          )}
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

      {/* Footer - hidden in full-screen mode */}
      {!isFullScreen && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div>
          Status: <span className="font-medium">{chapter.status}</span>
        </div>
        <div className="flex items-center gap-4">
          {saving ? (
            <span className="text-blue-600 dark:text-blue-400">Saving...</span>
          ) : lastSaved && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
          <span className="text-gray-400 dark:text-gray-500">
            Auto-save in <span className="font-medium">{nextAutoSaveIn}s</span>
          </span>
        </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <VersionHistory
              chapterId={chapterId!}
              onClose={() => setShowVersionHistory(false)}
              onRestore={handleRestore}
              onCompare={handleCompare}
            />
          </div>
        </div>
      )}

      {/* Version Comparison Modal */}
      {comparisonVersions.v1 && comparisonVersions.v2 && (
        <VersionComparison
          version1={comparisonVersions.v1}
          version2={comparisonVersions.v2}
          onClose={() => setComparisonVersions({ v1: null, v2: null })}
        />
      )}
    </div>
  );
}
