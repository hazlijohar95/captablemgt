/**
 * Focus management hooks for accessible keyboard navigation
 * Implements proper focus handling for complex interfaces
 */

import { useRef, useEffect, useCallback, useState } from 'react';

export interface UseFocusTrapOptions {
  enabled?: boolean;
  initialFocus?: 'first' | 'last' | HTMLElement;
  returnFocus?: boolean;
  restoreFocus?: HTMLElement;
}

export function useFocusTrap({
  enabled = true,
  initialFocus = 'first',
  returnFocus = true,
  restoreFocus
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    const elements = container.querySelectorAll(focusableSelectors.join(','));
    return Array.from(elements) as HTMLElement[];
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements(containerRef.current);
      
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab: move to previous element
        if (activeElement === firstElement || !containerRef.current.contains(activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move to next element
        if (activeElement === lastElement || !containerRef.current.contains(activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    if (e.key === 'Escape') {
      // Allow escape key to bubble up for modal closing, etc.
      return;
    }
  }, [enabled, getFocusableElements]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Save current focus
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Set initial focus
    const focusableElements = getFocusableElements(containerRef.current);
    
    if (focusableElements.length > 0) {
      if (initialFocus === 'first') {
        focusableElements[0].focus();
      } else if (initialFocus === 'last') {
        focusableElements[focusableElements.length - 1].focus();
      } else if (initialFocus instanceof HTMLElement) {
        initialFocus.focus();
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      if (returnFocus) {
        const elementToFocus = restoreFocus || previousActiveElementRef.current;
        if (elementToFocus && document.body.contains(elementToFocus)) {
          elementToFocus.focus();
        }
      }
    };
  }, [enabled, initialFocus, returnFocus, restoreFocus, handleKeyDown, getFocusableElements]);

  return containerRef;
}

export interface UseRovingTabIndexOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  enabled?: boolean;
}

export function useRovingTabIndex({
  orientation = 'horizontal',
  loop = true,
  enabled = true
}: UseRovingTabIndexOptions = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getNavigableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const selector = '[role="option"], [role="tab"], [role="menuitem"], button:not([disabled])';
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }, []);

  const updateTabIndices = useCallback((elements: HTMLElement[], activeIdx: number) => {
    elements.forEach((element, index) => {
      element.tabIndex = index === activeIdx ? 0 : -1;
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    const elements = getNavigableElements(containerRef.current);
    if (elements.length === 0) return;

    const currentIndex = elements.findIndex(el => el === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    let shouldPreventDefault = false;

    const canMoveHorizontally = orientation === 'horizontal' || orientation === 'both';
    const canMoveVertically = orientation === 'vertical' || orientation === 'both';

    switch (e.key) {
      case 'ArrowLeft':
        if (canMoveHorizontally) {
          nextIndex = currentIndex - 1;
          shouldPreventDefault = true;
        }
        break;
      case 'ArrowRight':
        if (canMoveHorizontally) {
          nextIndex = currentIndex + 1;
          shouldPreventDefault = true;
        }
        break;
      case 'ArrowUp':
        if (canMoveVertically) {
          nextIndex = currentIndex - 1;
          shouldPreventDefault = true;
        }
        break;
      case 'ArrowDown':
        if (canMoveVertically) {
          nextIndex = currentIndex + 1;
          shouldPreventDefault = true;
        }
        break;
      case 'Home':
        nextIndex = 0;
        shouldPreventDefault = true;
        break;
      case 'End':
        nextIndex = elements.length - 1;
        shouldPreventDefault = true;
        break;
    }

    if (shouldPreventDefault) {
      e.preventDefault();

      // Handle looping
      if (loop) {
        if (nextIndex < 0) {
          nextIndex = elements.length - 1;
        } else if (nextIndex >= elements.length) {
          nextIndex = 0;
        }
      } else {
        nextIndex = Math.max(0, Math.min(elements.length - 1, nextIndex));
      }

      setActiveIndex(nextIndex);
      elements[nextIndex].focus();
    }
  }, [enabled, orientation, loop, getNavigableElements]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const elements = getNavigableElements(containerRef.current);
    updateTabIndices(elements, activeIndex);

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, activeIndex, handleKeyDown, getNavigableElements, updateTabIndices]);

  // Initialize tab indices when container is set
  useEffect(() => {
    if (!containerRef.current) return;
    
    const elements = getNavigableElements(containerRef.current);
    updateTabIndices(elements, activeIndex);
  }, [activeIndex, getNavigableElements, updateTabIndices]);

  return {
    containerRef,
    activeIndex,
    setActiveIndex
  };
}

export function useAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);
    
    // Clear announcement after a short delay to allow for re-announcements
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  const AnnouncerComponent = useCallback(() => (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  ), [announcement]);

  return { announce, AnnouncerComponent };
}

export interface UseSkipLinksOptions {
  links: Array<{
    href: string;
    label: string;
  }>;
}

export function useSkipLinks({ links }: UseSkipLinksOptions) {
  const [isVisible, setIsVisible] = useState(false);

  const SkipLinksComponent = useCallback(() => (
    <div className={`
      fixed top-0 left-0 z-[9999] 
      ${isVisible ? 'block' : 'sr-only'}
    `}>
      {links.map((link, index) => (
        <a
          key={link.href}
          href={link.href}
          onFocus={() => setIsVisible(true)}
          onBlur={() => setIsVisible(false)}
          className="
            block px-4 py-2 bg-blue-600 text-white font-medium
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            hover:bg-blue-700
          "
        >
          {link.label}
        </a>
      ))}
    </div>
  ), [links, isVisible]);

  return { SkipLinksComponent };
}

// Utility hook for managing reduced motion preferences
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}