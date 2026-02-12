import { useState, useEffect, useRef } from 'react';
import { Check, X, SpellCheck, Lightbulb } from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'spelling' | 'grammar';
  original: string;
  suggestion: string;
  explanation?: string;
  position: {
    start: number;
    end: number;
  };
}

interface SpellCheckSuggestionsProps {
  content: string;
  onApplySuggestion: (suggestion: Suggestion) => void;
  onDismiss: (id: string) => void;
}

// Basic Italian/English spelling and grammar checker
// In production, this would use a proper API
function checkSpellingAndGrammar(text: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const words = text.split(/\s+/);
  let position = 0;

  // Common Italian misspellings to catch
  const commonMisspellings: Record<string, { correction: string; explanation: string }> = {
    'perchè': { correction: 'perché', explanation: 'L\'accento corretto è perché' },
    'poichè': { correction: 'poiché', explanation: 'L\'accento corretto è perché' },
    'dacchè': { correction: 'dacciché', explanation: 'L\'accento corretto è perché' },
    'sicchè': { correction: 'sicché', explanation: 'L\'accento corretto è perché' },
    'conviente': { correction: 'conveniente', explanation: 'Conveniente significa appropriato' },
    'daccordo': { correction: 'd\'accordo', explanation: 'Richiede apostrofo' },
    'tè': { correction: 'té', explanation: 'Quando significa the (tè)' },
    'pò': { correction: 'può', explanation: 'Verbo potere' },
    'fà': { correction: 'fa', explanation: 'Verbo fare' },
    'vado': { correction: 'vado', explanation: 'Verbo corretto andare' },
    'dopo': { correction: 'dopodiché', explanation: 'In alcuni contesti, più preciso' },
    'allora': { correction: 'dunque', explanation: 'In contesti formali, dunque è preferito' },
    'quindi': { correction: 'pertanto', explanation: 'In contesti formali' },
    // Common English mistakes
    'teh': { correction: 'the', explanation: 'Common typo' },
    'recieve': { correction: 'receive', explanation: 'i before e except after c' },
    'seperate': { correction: 'separate', explanation: 'a before e' },
    'occured': { correction: 'occurred', explanation: 'double r, double c' },
    'definately': { correction: 'definitely', explanation: 'definitely' },
    'goverment': { correction: 'government', explanation: 'government' },
    'untill': { correction: 'until', explanation: 'until' },
    'thier': { correction: 'their', explanation: 'their' },
    'loose': { correction: 'lose', explanation: 'loose = not tight, lose = not win' },
  };

  // Grammar rules to check
  const grammarChecks: Array<(text: string, words: string[]) => Suggestion | null> = [
    // Check for double negatives
    (t, w) => {
      const nonIndex = w.findIndex(word => word.toLowerCase() === 'non');
      const negationIndex = w.findIndex(word =>
        ['nessun', 'nessuna', 'nessuno', 'niente'].includes(word.toLowerCase())
      );
      if (nonIndex >= 0 && negationIndex >= 0 && Math.abs(nonIndex - negationIndex) < 3) {
        return {
          id: `double-neg-${Math.random()}`,
          type: 'grammar',
          original: t,
          suggestion: t.replace(/non\s+/i, '').replace(/nessun[o,a]?\s+/gi, ''),
          explanation: 'Doppia negazione: usa solo "non" o "nessuno"'
        };
      }
      return null;
    },
    // Check subject-verb agreement (basic)
    (t, w) => {
      if (/\b(io|tu|lui|lei|noi|voi|loro)\s+[a-z]+o\b/i.test(t) &&
          !/\b(io|tu|lui|lei|noi|voi|loro)\s+(sono|stai|sta|siamo|state|stanno)\b/i.test(t)) {
        // This is very basic - just a placeholder
        return null;
      }
      return null;
    }
  ];

  words.forEach((word, index) => {
    const lowerWord = word.toLowerCase().replace(/[.,;:!?()]/g, '');
    const startPos = position;
    const endPos = position + word.length;

    // Check for spelling mistakes
    if (commonMisspellings[lowerWord]) {
      suggestions.push({
        id: `spell-${index}-${Math.random()}`,
        type: 'spelling',
        original: word,
        suggestion: commonMisspellings[lowerWord].correction,
        explanation: commonMisspellings[lowerWord].explanation,
        position: { start: startPos, end: endPos }
      });
    }

    // Check for grammar issues
    grammarChecks.forEach(check => {
      const result = check(text, words);
      if (result && !suggestions.find(s => s.id === result.id)) {
        suggestions.push(result);
      }
    });

    position = endPos + 1; // +1 for space
  });

  return suggestions;
}

export default function SpellCheckSuggestions({ content, onApplySuggestion, onDismiss }: SpellCheckSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const checkTimeoutRef = useRef<number | null>(null);

  // Auto-check content with debounce
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      if (content.trim().length > 10) {
        const newSuggestions = checkSpellingAndGrammar(content);
        // Filter out dismissed suggestions
        const filtered = newSuggestions.filter(s => !dismissed.has(s.id));
        setSuggestions(filtered);
        setActiveIndex(0);
      } else {
        setSuggestions([]);
      }
    }, 1000); // 1 second debounce

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [content, dismissed]);

  const handleApplySuggestion = (suggestion: Suggestion) => {
    onApplySuggestion(suggestion);
    // Remove this suggestion from list
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    setSuggestions(prev => prev.filter(s => s.id !== id));
    onDismiss(id);
    if (activeIndex >= suggestions.length - 1) {
      setActiveIndex(0);
    }
  };

  const handleNext = () => {
    setActiveIndex(prev => (prev + 1) % suggestions.length);
  };

  const handlePrevious = () => {
    setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
  };

  const activeSuggestion = suggestions[activeIndex];

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-hidden bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SpellCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Suggerimenti Ortografia e Grammatica
            </h3>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {suggestions.length} {suggestions.length === 1 ? 'suggerimento' : 'suggerimenti'}
          </div>
        </div>
      </div>

      {/* Suggestion List */}
      <div className="p-4 overflow-y-auto max-h-72">
        {activeSuggestion ? (
          <div className="space-y-4">
            {/* Original text */}
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900">
              <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                {activeSuggestion.type === 'spelling' ? 'Errore di ortografia' : 'Errore grammaticale'}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                "{activeSuggestion.original}"
              </p>
            </div>

            {/* Suggested correction */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Suggerimento
                </span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-mono font-semibold">
                "{activeSuggestion.suggestion}"
              </p>
              {activeSuggestion.explanation && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {activeSuggestion.explanation}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleApplySuggestion(activeSuggestion)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Applica Correzione
              </button>
              <button
                onClick={() => handleDismiss(activeSuggestion.id)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Ignora
              </button>
            </div>
          </div>
        ) : null}

        {/* Navigation dots */}
        {suggestions.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Previous suggestion"
            >
              ←
            </button>
            <div className="flex gap-1">
              {suggestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === activeIndex
                      ? 'bg-blue-600 dark:bg-blue-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Next suggestion"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
