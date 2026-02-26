import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for automatic guided scrolling in forms
 * 
 * Features:
 * - Automatically scrolls to next field when current field becomes valid
 * - Respects accessibility preferences (reduced motion, screen readers)
 * - Allows manual scroll override
 * - Works on both desktop and mobile
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.formData - Current form data object
 * @param {Object} options.errors - Current errors object
 * @param {Function} options.validateField - Function to validate a field (fieldName, value) => boolean
 * @param {Array} options.fieldOrder - Array of field names in order they should be filled
 * @param {React.RefObject} options.formRef - Ref to the form element (optional)
 * @param {boolean} options.enabled - Whether auto-scroll is enabled (default: true)
 * @param {number} options.scrollOffset - Offset in pixels from top when scrolling (default: 100)
 * @param {number} options.scrollDelay - Delay in ms before scrolling (default: 300)
 */
export const useAutoScrollForm = ({
  formData,
  errors,
  validateField,
  fieldOrder,
  formRef,
  enabled = true,
  scrollOffset = 100,
  scrollDelay = 300,
}) => {
  const previousValidFields = useRef(new Set());
  const scrollTimeoutRef = useRef(null);
  const isUserScrolling = useRef(false);
  const userScrollTimeoutRef = useRef(null);
  const lastScrolledField = useRef(null);

  // Check if user prefers reduced motion (accessibility)
  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check if screen reader is active
  // We check for common screen reader indicators
  const isScreenReaderActive = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for screen reader via various methods
    // 1. Check if user is navigating with keyboard (no mouse activity)
    // 2. Check for screen reader specific ARIA attributes
    // 3. Check for screen reader user agent strings (heuristic)
    
    // Most reliable: Check if prefers-reduced-motion is set (often set by screen reader users)
    if (prefersReducedMotion()) {
      return true;
    }
    
    // Check for common screen reader indicators in the DOM
    const hasScreenReader = document.querySelector('[role="application"]') ||
                           document.querySelector('[aria-live]') ||
                           navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/i);
    
    return !!hasScreenReader;
  }, [prefersReducedMotion]);

  // Track user scrolling to allow manual override
  // Distinguish between user-initiated scroll and programmatic scroll
  const programmaticScrollRef = useRef(false);
  const lastScrollTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // Track scrollbar interaction (mousedown on scrollbar area)
    const handleMouseDown = (e) => {
      // Check if click is on or near scrollbar
      const isScrollbarClick = e.clientX > window.innerWidth - 20 || 
                               e.clientY > window.innerHeight - 20;
      if (isScrollbarClick) {
        isUserScrolling.current = true;
        programmaticScrollRef.current = false;
      }
    };

    const handleScroll = () => {
      const now = Date.now();
      const timeSinceLastScroll = now - lastScrollTimeRef.current;
      
      // If this is a programmatic scroll (set by our code), don't block auto-scroll
      // Only block if it's been more than 150ms since the programmatic scroll started
      // This allows smooth scrolling to complete without being blocked
      if (programmaticScrollRef.current && timeSinceLastScroll < 150) {
        // This is our programmatic scroll, allow it
        return;
      }
      
      // Otherwise, treat as user scroll
      isUserScrolling.current = true;
      programmaticScrollRef.current = false;
      lastScrollTimeRef.current = now;
      
      clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrolling.current = false;
      }, 500); // Reduced to 500ms for faster recovery
    };

    const handleWheel = () => {
      isUserScrolling.current = true;
      programmaticScrollRef.current = false;
      clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrolling.current = false;
      }, 500);
    };

    const handleTouchMove = () => {
      isUserScrolling.current = true;
      programmaticScrollRef.current = false;
      clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrolling.current = false;
      }, 500);
    };

    // Track keyboard navigation (arrow keys, page up/down)
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        isUserScrolling.current = true;
        programmaticScrollRef.current = false;
        clearTimeout(userScrollTimeoutRef.current);
        userScrollTimeoutRef.current = setTimeout(() => {
          isUserScrolling.current = false;
        }, 500);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(userScrollTimeoutRef.current);
    };
  }, [enabled]);

  // Smooth scroll to element
  const scrollToField = useCallback((fieldName) => {
    // Don't scroll if disabled, reduced motion, or screen reader active
    if (!enabled || prefersReducedMotion() || isScreenReaderActive()) {
      return;
    }

    // Don't scroll if user is manually scrolling
    if (isUserScrolling.current) {
      return;
    }

    // Don't scroll to the same field twice in quick succession
    if (lastScrolledField.current === fieldName) {
      return;
    }

    const container = formRef?.current || document;
    const fieldElement = container.querySelector(`[name="${fieldName}"]`) ||
                        container.querySelector(`#${fieldName}`) ||
                        container.querySelector(`[data-field="${fieldName}"]`);

    if (!fieldElement) {
      return;
    }

    // Clear any pending scroll
    clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      // Double-check user isn't scrolling
      if (isUserScrolling.current) {
        return;
      }

      const elementRect = fieldElement.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const offsetPosition = absoluteElementTop - scrollOffset;

      // Only scroll if field is not already visible in viewport
      const isVisible = elementRect.top >= scrollOffset && 
                       elementRect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

      if (!isVisible) {
        // Mark this as programmatic scroll BEFORE scrolling
        programmaticScrollRef.current = true;
        lastScrollTimeRef.current = Date.now();
        
        // Use requestAnimationFrame to ensure flag is set before scroll event fires
        requestAnimationFrame(() => {
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        });

        lastScrolledField.current = fieldName;

        // Reset programmatic scroll flag after smooth scroll animation completes (~500-1000ms)
        setTimeout(() => {
          programmaticScrollRef.current = false;
        }, 1200);

        // Reset last scrolled field after delay
        setTimeout(() => {
          lastScrolledField.current = null;
        }, 2000);
      }
    }, scrollDelay);
  }, [enabled, formRef, scrollOffset, scrollDelay, prefersReducedMotion, isScreenReaderActive]);

  // Main effect: detect when fields become valid and scroll to next
  useEffect(() => {
    if (!enabled || !fieldOrder || fieldOrder.length === 0) return;

    const currentValidFields = new Set();

    // Check which fields are currently valid
    fieldOrder.forEach((fieldName) => {
      const value = formData[fieldName];
      const hasError = errors[fieldName];
      
      // Field is valid if:
      // 1. It has a value (not empty)
      // 2. No error for this field
      // 3. Validation function confirms it's valid (if provided)
      const isValid = value !== undefined && 
                     value !== null && 
                     value !== '' &&
                     !hasError &&
                     (!validateField || validateField(fieldName, value));

      if (isValid) {
        currentValidFields.add(fieldName);
      }
    });

    // Find the first newly valid field (one that just became valid)
    let newlyValidField = null;
    for (const fieldName of fieldOrder) {
      if (currentValidFields.has(fieldName) && !previousValidFields.current.has(fieldName)) {
        newlyValidField = fieldName;
        break;
      }
    }

    // If a field just became valid, scroll to the next field
    if (newlyValidField) {
      const currentIndex = fieldOrder.indexOf(newlyValidField);
      const nextIndex = currentIndex + 1;

      if (nextIndex < fieldOrder.length) {
        const nextFieldName = fieldOrder[nextIndex];
        const nextFieldValue = formData[nextFieldName];
        const nextFieldHasError = errors[nextFieldName];

        // Only scroll to next field if it's not already valid
        // This prevents scrolling past fields that are already filled
        const isNextFieldValid = nextFieldValue !== undefined && 
                                nextFieldValue !== null && 
                                nextFieldValue !== '' &&
                                !nextFieldHasError &&
                                (!validateField || validateField(nextFieldName, nextFieldValue));

        if (!isNextFieldValid) {
          scrollToField(nextFieldName);
        }
      }
    }

    // Update previous valid fields
    previousValidFields.current = currentValidFields;
  }, [formData, errors, fieldOrder, validateField, enabled, scrollToField]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(scrollTimeoutRef.current);
      clearTimeout(userScrollTimeoutRef.current);
    };
  }, []);

  return {
    scrollToField,
  };
};

