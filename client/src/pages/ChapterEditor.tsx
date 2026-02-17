import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, ArrowLeft, Bold, Italic, Heading1, Eye, Edit, Loader2, Clock, Undo, Redo, Search, X, ChevronUp, ChevronDown, Maximize, Minimize, Sparkles, Lightbulb, Wand2, User, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import VersionHistory from '../components/VersionHistory';
import VersionComparison from '../components/VersionComparison';
import { EditorSkeleton } from '../components/Skeleton';
import { useToastNotification } from '../components/Toast';
import { apiService, Chapter, Project, ChapterVersion, HumanModel } from '../services/api';
import RedattoreTools from '../components/RedattoreTools';

export default function ChapterEditor() {
  const { t } = useTranslation();
  const toast = useToastNotification();
  const { id: projectId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [readabilityScore, setReadabilityScore] = useState<{
    score: number;
    grade: string;
    notes: string[];
    suggestions: string[];
  } | null>(null);
  const [showReadabilityPanel, setShowReadabilityPanel] = useState(false);

  // AI Generation state (Feature #232)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const [generationMessage, setGenerationMessage] = useState<string>('');
  const [humanModels, setHumanModels] = useState<HumanModel[]>([]);
  const [selectedHumanModelId, setSelectedHumanModelId] = useState<string | null>(null);
  const [showHumanModelDropdown, setShowHumanModelDropdown] = useState(false);
  const [generationAbortController, setGenerationAbortController] = useState<{ abort: () => void } | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);

  // AI Revision state
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showReviseMenu, setShowReviseMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [revising, setRevising] = useState(false);

  // Dialogue Enhancement state (Feature #188)
  const [enhancingDialogue, setEnhancingDialogue] = useState(false);
  const [showEnhancementDialog, setShowEnhancementDialog] = useState(false);
  const [enhancementData, setEnhancementData] = useState<{
    originalText: string;
    enhancedText: string;
    explanation: string;
    alternatives: Array<{ id: string; text: string; explanation: string }>;
  } | null>(null);

  // Unsaved changes warning state (feature #170)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const lastSavedTitleRef = useRef<string>('');
  const lastSavedContentRef = useRef<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const periodicSaveIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Undo/Redo history stacks
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoActionRef = useRef(false);
  const lastContentRef = useRef<string>('');

  // Handle text selection for AI revision (feature #96)
  // Must be defined before useEffect that uses it
  const handleTextSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || isPreview) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      // Text is selected
      const selected = content.substring(start, end);
      if (selected.trim().length > 0) {
        setSelectedText(selected);
        setSelectionRange({ start, end });

        // Calculate position for floating menu
        const textBeforeCursor = content.substring(0, start);
        const lines = textBeforeCursor.split('\n');
        const lineHeight = 24; // Approximate line height
        const charWidth = 8; // Approximate character width
        const lineHeightAdjust = 32; // Toolbar height

        // Position menu above selection
        setMenuPosition({
          top: lines.length * lineHeight - lineHeightAdjust - 10,
          left: Math.min((lines[lines.length - 1]?.length || 0) * charWidth, 300)
        });
        setShowReviseMenu(true);
      }
    } else {
      // No text selected
      setSelectedText('');
      setSelectionRange(null);
      setShowReviseMenu(false);
    }
  }, [content, isPreview]);

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

  // Load Human Models for AI generation (Feature #232)
  useEffect(() => {
    const loadHumanModels = async () => {
      try {
        const response = await apiService.getHumanModels();
        setHumanModels(response.models || []);
      } catch (err) {
        console.error('[ChapterEditor] Failed to load Human Models:', err);
      }
    };
    loadHumanModels();
  }, []);

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

    // Calculate readability score for Redattore articles
    if (project?.area === 'redattore' && content.trim().length > 0) {
      const readability = calculateReadability(content, words.length);
      setReadabilityScore(readability);
    } else {
      setReadabilityScore(null);
    }
  }, [content, project?.area]);

  // Warn before browser close/refresh if there are unsaved changes (feature #170)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]); // Only re-attach if hasUnsavedChanges changes

  // Track unsaved changes (feature #170)
  useEffect(() => {
    const hasChanges = title !== lastSavedTitleRef.current || content !== lastSavedContentRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [title, content]);

  // Readability calculation function
  const calculateReadability = (text: string, wordCount: number) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => {
      return count + countSyllables(word);
    }, 0);

    const sentenceCount = sentences.length || 1;
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllables / wordCount;

    // Flesch Reading Ease Score (adapted for Italian)
    // Formula: 206.835 - 1.015(total words/total sentences) - 84.6(total syllables/total words)
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    // Normalize to 0-100 scale
    const normalizedScore = Math.max(0, Math.min(100, fleschScore));

    // Determine grade level
    let grade = '';
    if (normalizedScore >= 90) grade = 'Elementare (5° elementare)';
    else if (normalizedScore >= 80) grade = 'Media (6°-8°)';
    else if (normalizedScore >= 70) grade = 'Superiori (9°-10°)';
    else if (normalizedScore >= 60) grade = 'Biennio (11°-12°)';
    else grade = 'Università o superiore';

    // Generate notes and suggestions
    const notes: string[] = [];
    const suggestions: string[] = [];

    if (avgWordsPerSentence > 25) {
      notes.push('Frasi molto lunghe (media: ' + Math.round(avgWordsPerSentence) + ' parole)');
      suggestions.push('Considera di dividere le frasi lunghe in frasi più brevi per migliorare la leggibilità');
    } else if (avgWordsPerSentence < 10) {
      notes.push('Frasi molto brevi (media: ' + Math.round(avgWordsPerSentence) + ' parole)');
      suggestions.push('Le frasi molto brevi possono rendere il testo troppo frammentato. Prova a combinarle logicamente.');
    }

    if (avgSyllablesPerWord > 2.5) {
      notes.push('Parole complesse con molte sillabe');
      suggestions.push('Usa parole più semplici e brevi quando possibile per migliorare la leggibilità');
    }

    if (wordCount < 100) {
      notes.push('Testo molto breve');
      suggestions.push('Per un articolo completo, considera di espandere con più dettagli ed esempi');
    } else if (wordCount > 2000 && avgWordsPerSentence > 20) {
      notes.push('Testo lungo con frasi complesse');
      suggestions.push('Per articoli lunghi, usa paragrafi e sottotitoli per migliorare la scansione');
    }

    if (sentences.length < 5) {
      suggestions.push('Aggiungi più frasi per creare un flusso più naturale');
    }

    return {
      score: Math.round(normalizedScore),
      grade,
      notes,
      suggestions
    };
  };

  const countSyllables = (word: string): number => {
    word = word.toLowerCase().replace(/[^a-zàèéìòù]/g, '');
    if (word.length <= 3) return 1;

    // Italian syllable counting (simplified)
    const vowels = word.match(/[aeiouàèéìòùy]/gi);
    const consonantClusters = word.match(/[bcdfghjklmnpqrstvwxz]{2,}/gi);

    let count = vowels ? vowels.length : 1;

    // Adjust for consonant clusters
    if (consonantClusters) {
      count += consonantClusters.length * 0.5;
    }

    // Minimum 1 syllable per word
    return Math.max(1, Math.round(count));
  };

  // Handle text selection for AI revision (feature #96)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleSelectionChange = () => {
      handleTextSelection();
    };

    textarea.addEventListener('mouseup', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('mouseup', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleTextSelection]);

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
      const chapterTitle = response.chapter.title;

      // Store initial values for unsaved changes tracking (feature #170)
      // MUST set refs BEFORE calling setContent setTitle to avoid false positive detection
      lastSavedTitleRef.current = chapterTitle;
      lastSavedContentRef.current = chapterContent;
      setHasUnsavedChanges(false);

      setContent(chapterContent);
      setTitle(chapterTitle);

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

      // Update saved refs for unsaved changes tracking (feature #170)
      lastSavedTitleRef.current = title.trim();
      lastSavedContentRef.current = content;
      setHasUnsavedChanges(false);

      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  // AI Generation handlers (Feature #232)
  const handleGenerateChapter = async (useHumanModel: boolean = false) => {
    if (!chapterId || isGenerating) return;

    // Reset streaming content
    setStreamingContent('');
    setIsGenerating(true);
    setGenerationPhase('structure');
    setGenerationMessage(t('chapterEditor.generation.analyzing', 'Analyzing project structure and context...'));

    // Use a ref to track accumulated content
    let accumulatedContent = '';

    try {
      const { abort, promise } = apiService.generateChapterStream(
        chapterId,
        {
          human_model_id: useHumanModel ? selectedHumanModelId : undefined,
        },
        {
          onPhase: (phase, message) => {
            setGenerationPhase(phase);
            setGenerationMessage(message);
          },
          onDelta: (deltaContent) => {
            accumulatedContent += deltaContent;
            setStreamingContent(accumulatedContent);
            // Also update the content in real-time for the editor
            setContent(accumulatedContent);
          },
          onDone: (data) => {
            setIsGenerating(false);
            setGenerationPhase('');
            setGenerationMessage('');

            // Final content is already set via onDelta
            toast.success(data.message || t('chapterEditor.generation.success', 'Chapter generated successfully'));

            if (data.warning) {
              toast.info(data.warning);
            }
          },
          onError: (error) => {
            setIsGenerating(false);
            setGenerationPhase('');
            setGenerationMessage('');
            toast.error(error || t('chapterEditor.generation.error', 'Failed to generate chapter'));
          },
        }
      );

      setGenerationAbortController({ abort });

      await promise;
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationPhase('');
      setGenerationMessage('');
      toast.error(err.message || t('chapterEditor.generation.error', 'Failed to generate chapter'));
    } finally {
      setGenerationAbortController(null);
    }
  };

  const handleCancelGeneration = () => {
    if (generationAbortController) {
      generationAbortController.abort();
      setIsGenerating(false);
      setGenerationPhase('');
      setGenerationMessage('');
      setGenerationAbortController(null);
      toast.info(t('chapterEditor.generation.cancelled', 'Generation cancelled'));
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

      // Save shortcut (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
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

    // Update the last saved refs to prevent auto-save from triggering
    // The backend restore endpoint already updates the chapter content and creates a version
    lastSavedContentRef.current = restoredContent;
    lastSavedTitleRef.current = title;
    setHasUnsavedChanges(false);
    setLastSaved(new Date());

    // Update local chapter state
    if (chapter) {
      setChapter({
        ...chapter,
        content: restoredContent,
        updated_at: new Date().toISOString()
      });
    }
  };

  const handleCompare = (version1: ChapterVersion, version2: ChapterVersion) => {
    setComparisonVersions({ v1: version1, v2: version2 });
    setShowVersionHistory(false);
  };

  // Handle AI revision request
  const handleAIRevise = async () => {
    if (!selectedText || !selectionRange || !chapterId) return;

    try {
      setRevising(true);
      setShowReviseMenu(false);

      // Call AI revision API
      // Note: This endpoint would need to be implemented on the backend
      const response = await fetch(`/api/chapters/${chapterId}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          selectedText,
          start: selectionRange.start,
          end: selectionRange.end,
          fullContent: content
        })
      });

      if (!response.ok) {
        // If endpoint doesn't exist yet, show a message
        toast.error('AI revision endpoint not yet implemented. This is a UI demo.');
        setRevising(false);
        return;
      }

      const data = await response.json();

      if (data.revisedText) {
        // Replace selected text with revised version
        const newContent = content.substring(0, selectionRange.start) +
                        data.revisedText +
                        content.substring(selectionRange.end);
        setContent(newContent);
        toast.success('Text revised successfully');
      }

      setSelectedText('');
      setSelectionRange(null);
    } catch (err: any) {
      console.error('Revision error:', err);
      toast.error(err.message || 'Failed to revise text');
    } finally {
      setRevising(false);
    }
  };

  // Handle dialogue enhancement request (Feature #188)
  const handleEnhanceDialogue = async () => {
    if (!selectedText || !selectionRange || !chapterId) return;

    try {
      setEnhancingDialogue(true);
      setShowReviseMenu(false);

      const response = await fetch(`/api/chapters/${chapterId}/enhance-dialogue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          selectedText,
          start: selectionRange.start,
          end: selectionRange.end
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to enhance dialogue' }));
        toast.error(errorData.message || 'Failed to enhance dialogue');
        setEnhancingDialogue(false);
        return;
      }

      const data = await response.json();

      // Show enhancement dialog with accept/reject options
      setEnhancementData({
        originalText: data.originalText,
        enhancedText: data.enhancedText,
        explanation: data.explanation,
        alternatives: data.alternatives || []
      });
      setShowEnhancementDialog(true);
    } catch (err: any) {
      console.error('Dialogue enhancement error:', err);
      toast.error(err.message || 'Failed to enhance dialogue');
    } finally {
      setEnhancingDialogue(false);
    }
  };

  // Accept enhanced dialogue
  const handleAcceptEnhancement = () => {
    if (!enhancementData || !selectionRange) return;

    const newContent = content.substring(0, selectionRange.start) +
                    enhancementData.enhancedText +
                    content.substring(selectionRange.end);
    setContent(newContent);
    toast.success('Dialogue enhanced successfully');

    // Close dialog and clear selection
    setShowEnhancementDialog(false);
    setEnhancementData(null);
    setSelectedText('');
    setSelectionRange(null);
  };

  // Reject enhanced dialogue
  const handleRejectEnhancement = () => {
    setShowEnhancementDialog(false);
    setEnhancementData(null);
    toast.info('Enhancement rejected');
  };

  // Select alternative enhancement
  const handleSelectAlternative = (alternative: { id: string; text: string; explanation: string }) => {
    if (!enhancementData) return;
    setEnhancementData({
      ...enhancementData,
      enhancedText: alternative.text,
      explanation: alternative.explanation
    });
  };

  const renderPreview = () => {
    // Simple markdown-to-html conversion for preview
    // Note: All elements include dark mode classes for proper visibility in dark theme
    let html = content;

    // Headers - with dark mode text colors
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">$1</h3>');

    // Bold - with dark mode text color
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 dark:text-gray-100 font-bold">$1</strong>');

    // Italic - with dark mode text color
    html = html.replace(/\*(.*?)\*/g, '<em class="text-gray-900 dark:text-gray-100 italic">$1</em>');

    // Paragraphs - with dark mode text color
    html = html.split('\n\n').map(p => `<p class="mb-4 text-gray-900 dark:text-gray-100">${p.replace(/\n/g, '<br>')}</p>`).join('');

    return { __html: html };
  };

  // Handle navigation with unsaved changes (feature #170)
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation(`/projects/${projectId}`);
      setShowUnsavedDialog(true);
    } else {
      navigate(`/projects/${projectId}`);
    }
  };

  const confirmNavigation = () => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  const cancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
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
      {!isFullScreen && (
        <Breadcrumbs
          labelOverrides={{
            [projectId!]: project?.title,
            [chapterId!]: chapter?.title
          }}
        />
      )}

      {/* Editor Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface">
        <div className="p-4">
          {/* Back button and actions */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('chapterEditor.backToProject')}
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
              {readabilityScore && project?.area === 'redattore' && (
                <div className="flex items-center gap-1 ml-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      readabilityScore.score >= 80
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : readabilityScore.score >= 60
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                    title={`Flesch Reading Ease: ${readabilityScore.score}/100`}
                  >
                    {readabilityScore.score}/100
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {readabilityScore.grade}
                  </span>
                </div>
              )}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label={isFullScreen ? t('chapterEditor.exitFullScreen') + ' (Esc)' : t('chapterEditor.fullScreen')}
                title={isFullScreen ? t('chapterEditor.exitFullScreen') + ' (Esc)' : t('chapterEditor.fullScreen')}
              >
                {isFullScreen ? <Minimize className="w-4 h-4 text-gray-700 dark:text-gray-300" /> : <Maximize className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
              </button>
              <button
                onClick={() => setShowFindReplace(!showFindReplace)}
                className={`p-2 rounded-lg border transition-colors ${showFindReplace ? 'bg-blue-50 border-blue-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                aria-label={t('chapterEditor.findReplace') + ' (Ctrl+F)'}
                title={t('chapterEditor.findReplace') + ' (Ctrl+F)'}
              >
                <Search className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label={t('chapterEditor.undo') + ' (Ctrl+Z)'}
                title={t('chapterEditor.undo') + ' (Ctrl+Z)'}
              >
                <Undo className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label={t('chapterEditor.redo') + ' (Ctrl+Shift+Z)'}
                title={t('chapterEditor.redo') + ' (Ctrl+Shift+Z)'}
              >
                <Redo className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setShowVersionHistory(true)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('chapterEditor.versionHistory')}
                title={t('chapterEditor.versionHistory')}
              >
                <Clock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>

              {/* AI Generation Buttons (Feature #232) */}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    {/* Generation Progress Indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                      <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300 capitalize">
                          {generationPhase}
                        </span>
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          {generationMessage}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelGeneration}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="w-4 h-4" />
                      {t('chapterEditor.generation.cancel', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Generate Standard Button */}
                    <button
                      onClick={() => handleGenerateChapter(false)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                      title={t('chapterEditor.generation.generateStandard', 'Generate chapter content with AI')}
                    >
                      <Wand2 className="w-4 h-4" />
                      {t('chapterEditor.generation.generate', 'Generate')}
                    </button>

                    {/* Generate with Human Model Button */}
                    <div className="relative flex items-center">
                      <button
                        onClick={() => handleGenerateChapter(true)}
                        disabled={isGenerating || humanModels.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-l-lg text-sm font-medium transition-colors"
                        title={humanModels.length === 0
                          ? t('chapterEditor.generation.noHumanModels', 'No Human Models available. Create one in Settings.')
                          : t('chapterEditor.generation.generateWithStyle', 'Generate with your personal writing style')
                        }
                      >
                        <User className="w-4 h-4" />
                        {t('chapterEditor.generation.generateWithStyle', 'With Style')}
                      </button>

                      {/* Human Model Dropdown */}
                      {humanModels.length > 0 && (
                        <button
                          onClick={() => setShowHumanModelDropdown(!showHumanModelDropdown)}
                          className="flex items-center px-1.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-r-lg text-sm transition-colors border-l border-amber-500"
                          title={t('chapterEditor.generation.selectModel', 'Select Human Model')}
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                        </button>
                      )}

                      {/* Dropdown Menu */}
                      {humanModels.length > 0 && showHumanModelDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            {t('chapterEditor.generation.selectModel', 'Select Human Model')}
                          </div>
                          {humanModels.map(model => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedHumanModelId(model.id);
                                setShowHumanModelDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                                selectedHumanModelId === model.id
                                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <span>{model.name}</span>
                              {selectedHumanModelId === model.id && (
                                <span className="text-purple-600 dark:text-purple-400">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {project?.area === 'redattore' && (
                <button
                  onClick={() => setShowReadabilityPanel(!showReadabilityPanel)}
                  className={`p-2 rounded-lg border transition-colors ${
                    showReadabilityPanel || readabilityScore
                      ? 'bg-blue-50 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  aria-label="Readability Analysis"
                  title="Readability Analysis"
                >
                  <Sparkles className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              )}
              <button
                onClick={() => setIsPreview(!isPreview)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label={isPreview ? t('chapterEditor.edit') : t('chapterEditor.preview')}
                title={isPreview ? t('chapterEditor.edit') : t('chapterEditor.preview')}
              >
                {isPreview ? <Edit className="w-4 h-4 text-gray-700 dark:text-gray-300" /> : <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('chapterEditor.saving', 'Salvataggio...')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('chapterEditor.save', 'Salva')}
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
            aria-label="Chapter title"
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
                    placeholder={t('chapterEditor.findPlaceholder')}
                    aria-label="Find in chapter"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : t('chapterEditor.noResults')}</span>
                  <button
                    onClick={handleFindPrevious}
                    disabled={matchCount === 0}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                    aria-label={t('chapterEditor.findPrevious')}
                    title={t('chapterEditor.findPrevious')}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFindNext}
                    disabled={matchCount === 0}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                    aria-label={t('chapterEditor.findNext')}
                    title={t('chapterEditor.findNext')}
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
                  {t('chapterEditor.caseSensitive')}
                </label>
                <button
                  onClick={() => {
                    setShowFindReplace(false);
                    setFindText('');
                    setReplaceText('');
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  aria-label={t('chapterEditor.close')}
                  title={t('chapterEditor.close')}
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
                    placeholder={t('chapterEditor.replacePlaceholder')}
                    aria-label="Replace with"
                  />
                </div>
                <button
                  onClick={handleReplace}
                  disabled={matchCount === 0}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('chapterEditor.replaceButton')}
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={matchCount === 0}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('chapterEditor.replaceAll')}
                </button>
              </div>
            </div>
          )}

          {/* Readability Analysis Panel (for Redattore) */}
          {showReadabilityPanel && project?.area === 'redattore' && !isPreview && (
            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('chapterEditor.readabilityAnalysis')}
                </h4>
                <button
                  onClick={() => {
                    setShowReadabilityPanel(false);
                    setReadabilityScore(null);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  aria-label={t('chapterEditor.close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!readabilityScore ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scrivi qualcosa nell'editor per vedere l'analisi di leggibilità in tempo reale.
                  </p>
                </div>
              ) : (
                <div>
              {/* Score Badge */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" style={{
                    color: readabilityScore.score >= 80 ? "#16a34a" :
                           readabilityScore.score >= 60 ? "#ca8a04" :
                           "#dc2626"
                  } as any}>
                    {readabilityScore.score}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">/100</span>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    readabilityScore.score >= 80
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : readabilityScore.score >= 60
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {readabilityScore.grade}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {readabilityScore.notes.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">NOTE:</h5>
                  <ul className="space-y-1">
                    {readabilityScore.notes.map((note, idx) => (
                      <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                        <span className="text-blue-500">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {readabilityScore.suggestions.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-yellow-500" />
                    SUGGERIMENTI PER MIGLIORARE:
                  </h5>
                  <ul className="space-y-2">
                    {readabilityScore.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded">
                        <span className="text-green-500 mt-0.5">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 0 1 0 00-16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 14.293a1 1 0 00-1.414 1.414l-4-4a1 1 0 010-1.414 1.414L11.586 9 14.707 5.707a1 1 0 001.414-1.414l4-4a1 1 0 001.414 1.414z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            )}
          </div>
        )}

        {/* Formatting Toolbar */}
        {!isPreview && (
          <div className="px-4 pb-2 flex items-center gap-1">
            <button
              onClick={handleHeading}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Heading"
              title="Heading"
            >
              <Heading1 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleBold}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-bold"
              aria-label="Bold"
              title="Bold"
            >
              <Bold className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleItalic}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors italic"
              aria-label="Italic"
              title="Italic"
            >
              <Italic className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Editor / Preview */}
      <div className="flex-1 overflow-y-auto relative flex">
        <div className={`flex-1 ${isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
        {isPreview ? (
          <div className={`bg-white dark:bg-dark-bg ${isFullScreen ? 'p-6' : 'p-6'}`}>
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
            className={`w-full h-full min-h-[500px] border-0 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 focus:outline-none resize-none font-serif leading-relaxed ${isFullScreen ? 'p-6' : 'p-6'}`}
            placeholder="Start writing your chapter here..."
            spellCheck
            aria-label="Chapter content"
          />
        )}
        </div>

        {/* Redattore Tools Sidebar - Only for Redattore projects */}
        {project?.area === 'redattore' && !isFullScreen && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
            <RedattoreTools chapter={chapter} projectArea={project.area} />
          </div>
        )}
      </div>

      {/* AI Revision Floating Menu (Feature #96) */}
      <div>
        {showReviseMenu && !isPreview && menuPosition && (
          <div
            className="absolute z-50 bg-white dark:bg-dark-surface rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in zoom-in duration-200"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                {selectedText.length > 50
                  ? `${selectedText.substring(0, 50)}...`
                  : selectedText}
              </span>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <button
                onClick={handleAIRevise}
                disabled={revising || enhancingDialogue}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {revising ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('chapterEditor.revising')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    {t('chapterEditor.aiRevise')}
                  </>
                )}
              </button>
              {/* Dialogue Enhancement button (Feature #188) - only for Romanziere */}
              {project?.area === 'romanziere' && (
                <button
                  onClick={handleEnhanceDialogue}
                  disabled={enhancingDialogue || revising}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  title="Enhance dialogue for better flow and character voice"
                >
                  {enhancingDialogue ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('chapterEditor.enhancing')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      {t('chapterEditor.enhanceDialogue')}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowReviseMenu(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
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
              {t('chapterEditor.autoSave')} <span className="font-medium">{nextAutoSaveIn}</span> {t('chapterEditor.seconds')}
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

      {/* Dialogue Enhancement Dialog (Feature #188) */}
      {showEnhancementDialog && enhancementData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    Dialogue Enhancement
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    AI-suggested improvements to make dialogue more natural and engaging
                  </p>
                </div>
                <button
                  onClick={handleRejectEnhancement}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-serif">
                      {enhancementData.originalText}
                    </p>
                  </div>
                </div>

                {/* Enhanced */}
                <div>
                  <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Enhanced Version
                  </h4>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-serif">
                      {enhancementData.enhancedText}
                    </p>
                  </div>
                  {enhancementData.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <span className="font-medium">Why this works:</span> {enhancementData.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Alternatives */}
              {enhancementData.alternatives && enhancementData.alternatives.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Alternative Enhancements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {enhancementData.alternatives.map((alt) => (
                      <button
                        key={alt.id}
                        onClick={() => handleSelectAlternative(alt)}
                        className="p-3 text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                      >
                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-serif mb-2">
                          {alt.text}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {alt.explanation}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={handleRejectEnhancement}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleAcceptEnhancement}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Apply Enhancement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
