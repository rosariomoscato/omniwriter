import { useEffect, useRef } from 'react';

interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active
   */
  isActive: boolean;
  /**
   * Element to return focus to when trap is deactivated
   */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /**
   * Additional elements to exclude from focus trap
   */
  excludeSelectors?: string[];
}

/**
 * Hook to trap keyboard focus within a container element.
 * This is essential for accessibility - when a modal is open,
 * keyboard navigation (Tab) should stay within the modal.
 *
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null);
 * const triggerRef = useRef<HTMLButtonElement>(null);
 *
 * useFocusTrap({
 *   isActive: isOpen,
 *   returnFocusRef: triggerRef
 * });
 *
 * return (
 *   <div ref={modalRef} className="modal">
 *     <button>Button 1</button>
 *     <button>Button 2</button>
 *   </div>
 * );
 * ```
 */
export function useFocusTrap({
  isActive,
  returnFocusRef,
  excludeSelectors = []
}: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    // Store the currently focused element when trap activates
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      // Get focusable elements in container
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      );

      // Filter out excluded elements
      const filtered = focusableElements.filter(el => {
        return !excludeSelectors.some(selector =>
          el.matches(selector) || el.closest(selector)
        );
      });

      return filtered;
    };

    // Find first and last focusable elements
    const getTabBoundaries = () => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        return null;
      }
      return {
        first: focusableElements[0],
        last: focusableElements[focusableElements.length - 1]
      };
    };

    // Focus the first element when trap activates
    const focusFirstElement = () => {
      const boundaries = getTabBoundaries();
      if (boundaries) {
        boundaries.first.focus();
      }
    };

    // Initial focus
    const timeoutId = setTimeout(() => {
      focusFirstElement();
    }, 50); // Small delay to ensure DOM is ready

    // Handle Tab key press
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const boundaries = getTabBoundaries();
      if (!boundaries) {
        return;
      }

      const { first, last } = boundaries;
      const focusedElement = document.activeElement;

      // If no element is focused or it's outside the container, focus first
      if (!focusedElement || !container.contains(focusedElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      // Handle Tab and Shift+Tab
      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (focusedElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (focusedElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleTabKey);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleTabKey);

      // Return focus to the previously focused element or the trigger
      if (previouslyFocusedElement.current) {
        // Use setTimeout to ensure this happens after any state updates
        setTimeout(() => {
          if (returnFocusRef?.current) {
            returnFocusRef.current.focus();
          } else if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 0);
      }
    };
  }, [isActive, returnFocusRef, excludeSelectors]);

  return containerRef;
}

/**
 * Simplified version for components that don't need return focus
 */
export function useFocusTrapSimple(isActive: boolean) {
  return useFocusTrap({ isActive });
}
