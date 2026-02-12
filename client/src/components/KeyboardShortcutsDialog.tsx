import { useState, useEffect } from 'react';
import { X, Keyboard, Save, Undo, RotateCcw, Download, Upload, Search, Settings, User, FileText, BookOpen, Newspaper } from 'lucide-react';
import { registerModal, unregisterModal, openModals } from './NetworkErrorDialog';

interface ShortcutGroup {
  category: string;
  icon: React.ReactNode;
  shortcuts: {
    keys: string[];
    description: string;
    context?: string;
  }[];
}

export default function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const modalId = useState(() => `keyboard-shortcuts-${Math.random().toString(36).substring(2, 9)}`)[0];

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('open-keyboard-shortcuts', handleOpen);
    window.addEventListener('close-all-modals', handleClose);

    // Register modal
    registerModal(modalId);

    return () => {
      window.removeEventListener('open-keyboard-shortcuts', handleOpen);
      window.removeEventListener('close-all-modals', handleClose);
      unregisterModal(modalId);
    };
  }, [modalId]);

  // Close on Escape key if this is the top-most modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && openModals.has(modalId)) {
        const modalArray = Array.from(openModals);
        if (modalArray[modalArray.length - 1] === modalId) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [modalId, isOpen]);

  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Generali',
      icon: <Keyboard className="w-5 h-5" />,
      shortcuts: [
        { keys: ['?'], description: 'Mostra questa guida' },
        { keys: ['Esc'], description: 'Chiudi modali/dialoghi' },
      ]
    },
    {
      category: 'Editor',
      icon: <FileText className="w-5 h-5" />,
      shortcuts: [
        { keys: ['Ctrl', 'S'], description: 'Salva contenuto', context: 'Chapter Editor' },
        { keys: ['Ctrl', 'Z'], description: 'Annulla', context: 'Chapter Editor' },
        { keys: ['Ctrl', 'Shift', 'Z'], description: 'Ripristina', context: 'Chapter Editor' },
        { keys: ['Ctrl', 'Y'], description: 'Ripristina (alternativa)', context: 'Chapter Editor' },
      ]
    },
    {
      category: 'Navigazione',
      icon: <Search className="w-5 h-5" />,
      shortcuts: [
        { keys: ['Ctrl', 'K'], description: 'Focus barra ricerca (prossimamente)' },
      ]
    },
    {
      category: 'Progetti',
      icon: <BookOpen className="w-5 h-5" />,
      shortcuts: [
        { keys: ['Ctrl', 'N'], description: 'Nuovo progetto (prossimamente)' },
      ]
    }
  ];

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      'Ctrl': '⌃',
      'Shift': '⇧',
      'Alt': '⌥',
      'Meta': '⌘',
      'Esc': '⎋',
      'Enter': '↵',
      'Backspace': '⌫',
      'Tab': '⇥',
      '?': '?',
    };

    return keyMap[key] || key.toUpperCase();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Keyboard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h2
              id="keyboard-shortcuts-title"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100"
            >
              Scorciatoie Tastiera
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid gap-6">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  <span className="text-primary-600 dark:text-primary-400">
                    {group.icon}
                  </span>
                  {group.category}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </p>
                        {shortcut.context && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {shortcut.context}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        {shortcut.keys.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center gap-1">
                            {keyIndex > 0 && (
                              <span className="text-gray-400 dark:text-gray-500 mx-1">+</span>
                            )}
                            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 min-w-[28px] text-center">
                              {formatKey(key)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Suggerimento:</strong> Premi <kbd className="px-1.5 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-700 rounded mx-1">?</kbd> in qualsiasi momento per aprire questa guida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
