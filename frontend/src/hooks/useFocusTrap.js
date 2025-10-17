import { useEffect, useRef } from 'react';

/**
 * Focusable element selector query
 * Includes all interactive elements that can receive keyboard focus
 */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * useFocusTrap - Trap keyboard focus within a container element
 *
 * Manages focus behavior for modal dialogs and other overlay components:
 * - Stores original focused element for restoration on deactivation
 * - Focuses first focusable element when activated
 * - TAB cycles forward through focusable elements (wraps to beginning)
 * - Shift+TAB cycles backward through focusable elements (wraps to end)
 * - Restores focus to original element when deactivated
 * - Handles dynamic content with MutationObserver
 *
 * @example
 * const containerRef = useRef(null);
 * useFocusTrap(containerRef, isModalOpen);
 *
 * return (
 *   <div ref={containerRef} role="dialog">
 *     <button>First focusable</button>
 *     <input type="text" />
 *     <button>Last focusable</button>
 *   </div>
 * );
 *
 * @param {React.RefObject} containerRef - Reference to container element to trap focus within
 * @param {boolean} isActive - Whether focus trap is currently active
 * @returns {void}
 */
export const useFocusTrap = (containerRef, isActive) => {
    const previousFocusRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;

        // Store currently focused element for restoration
        previousFocusRef.current = document.activeElement;

        /**
         * Get all currently focusable elements within container
         * @returns {HTMLElement[]} Array of focusable elements
         */
        const getFocusableElements = () => {
            return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
        };

        // Focus first focusable element on activation
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        /**
         * Handle TAB and Shift+TAB key navigation
         * Cycles through focusable elements with wrapping
         * @param {KeyboardEvent} event - Keyboard event
         */
        const handleKeyDown = event => {
            if (event.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            // Shift+TAB: cycle backward
            if (event.shiftKey) {
                if (activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            }
            // TAB: cycle forward
            else {
                if (activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };

        /**
         * Handle dynamic content changes
         * Refocuses container if active element is removed
         */
        const handleMutation = () => {
            const focusableElements = getFocusableElements();
            const activeElement = document.activeElement;

            // If focused element was removed, focus first available element
            if (!container.contains(activeElement) && focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        };

        // Set up MutationObserver for dynamic content
        observerRef.current = new MutationObserver(handleMutation);
        observerRef.current.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'tabindex'],
        });

        // Add keyboard event listener
        container.addEventListener('keydown', handleKeyDown);

        // Cleanup function
        return () => {
            container.removeEventListener('keydown', handleKeyDown);

            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }

            // Restore focus to original element
            if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
                previousFocusRef.current.focus();
            }

            previousFocusRef.current = null;
        };
    }, [containerRef, isActive]);
};

export default useFocusTrap;
