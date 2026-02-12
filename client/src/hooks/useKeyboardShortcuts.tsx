import { useEffect, useRef } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' ||
                         target.tagName === 'TEXTAREA' ||
                         target.isContentEditable;

      if (isInputField) {
        // Allow Ctrl+S and Ctrl+Z in input fields
        const allowedInInput = shortcutsRef.current.filter(s =>
          s.ctrlKey && (s.key === 's' || s.key === 'z')
        );

        const matchedShortcut = allowedInInput.find(shortcut => {
          return (
            e.key.toLowerCase() === shortcut.key.toLowerCase() &&
            !!e.ctrlKey === !!shortcut.ctrlKey &&
            !!e.shiftKey === !!shortcut.shiftKey &&
            !!e.altKey === !!shortcut.altKey &&
            !!e.metaKey === !!shortcut.metaKey
          );
        });

        if (matchedShortcut) {
          if (matchedShortcut.preventDefault !== false) {
            e.preventDefault();
          }
          matchedShortcut.action();
        }
        return;
      }

      // Check for matching shortcuts
      const matchedShortcut = shortcutsRef.current.find(shortcut => {
        return (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!e.ctrlKey === !!shortcut.ctrlKey &&
          !!e.shiftKey === !!shortcut.shiftKey &&
          !!e.altKey === !!shortcut.altKey &&
          !!e.metaKey === !!shortcut.metaKey
        );
      });

      if (matchedShortcut) {
        if (matchedShortcut.preventDefault !== false) {
          e.preventDefault();
        }
        matchedShortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

// Global keyboard shortcuts that work everywhere
export const globalShortcuts: ShortcutConfig[] = [
  {
    key: '?',
    action: () => {
      // This will be handled by the KeyboardShortcutsDialog
      const event = new CustomEvent('open-keyboard-shortcuts');
      window.dispatchEvent(event);
    },
    description: 'Mostra scorciatoie tastiera',
    preventDefault: false
  },
  {
    key: 'Escape',
    action: () => {
      // Close any open modals by dispatching an event
      const event = new CustomEvent('close-all-modals');
      window.dispatchEvent(event);
    },
    description: 'Chiudi modali',
    preventDefault: false
  }
];
