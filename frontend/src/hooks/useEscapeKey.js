import { useEffect } from 'react';

/**
 * useEscapeKey - Enhanced ESC key handling for modals and overlays
 *
 * Manages ESC key behavior for dismissible components:
 * - Calls callback when ESC key pressed
 * - Only active when isActive=true
 * - Proper cleanup on unmount or deactivation
 * - Multiple modals support (last modal wins - last mounted handler executes first)
 * - Event listener added at document level for global scope
 *
 * @example
 * const handleClose = () => setIsOpen(false);
 * useEscapeKey(handleClose, isOpen);
 *
 * @param {Function} onEscape - Callback function to execute when ESC is pressed
 * @param {boolean} isActive - Whether ESC key handling is currently active
 * @returns {void}
 */
export const useEscapeKey = (onEscape, isActive) => {
    useEffect(() => {
        if (!isActive) return;

        /**
         * Handle ESC key press
         * @param {KeyboardEvent} event - Keyboard event
         */
        const handleEscape = event => {
            if (event.key === 'Escape') {
                onEscape();
            }
        };

        // Add event listener at document level
        // Last mounted modal will handle ESC first (event propagation)
        document.addEventListener('keydown', handleEscape);

        // Cleanup: remove event listener
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onEscape, isActive]);
};

export default useEscapeKey;
