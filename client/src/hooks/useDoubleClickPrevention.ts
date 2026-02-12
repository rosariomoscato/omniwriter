import { useRef, useCallback, useState } from 'react';

/**
 * Custom hook to prevent double-click submissions
 *
 * This hook provides a wrapper for async functions that prevents them
 * from being called multiple times rapidly (e.g., double-clicking submit buttons)
 *
 * @returns Object containing isSubmitting state and wrappedSubmit function
 *
 * @example
 * const { isSubmitting, wrappedSubmit } = useDoubleClickPrevention();
 *
 * <button
 *   onClick={() => wrappedSubmit(async () => {
 *     await createProject();
 *   })}
 *   disabled={isSubmitting}
 * >
 *   Submit
 * </button>
 */
export function useDoubleClickPrevention() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPromiseRef = useRef<Promise<void> | null>(null);

  const wrappedSubmit = useCallback(
    async (asyncFn: () => Promise<void>) => {
      // If already submitting, ignore the click
      if (isSubmitting) {
        return;
      }

      // Set submitting state immediately to block further clicks
      setIsSubmitting(true);

      try {
        // Store the promise so we can track it
        submitPromiseRef.current = asyncFn();
        await submitPromiseRef.current;
      } finally {
        // Only reset submitting state after completion
        submitPromiseRef.current = null;
        setIsSubmitting(false);
      }
    },
    [isSubmitting]
  );

  return { isSubmitting, wrappedSubmit };
}

/**
 * Simpler version that just returns a disabled flag
 * Useful when you want to control your own loading state
 */
export function useDoubleClickBlock() {
  const isBlockedRef = useRef(false);

  const block = useCallback(() => {
    if (isBlockedRef.current) {
      return true; // Already blocked
    }
    isBlockedRef.current = true;
    return false; // First click, not blocked yet
  }, []);

  const unblock = useCallback(() => {
    isBlockedRef.current = false;
  }, []);

  return { block, unblock };
}
