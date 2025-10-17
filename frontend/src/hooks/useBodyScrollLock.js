import { useEffect, useRef } from 'react';

/**
 * useBodyScrollLock - Prevent body scroll when locked
 *
 * Manages body scroll behavior for modal dialogs and overlay components:
 * - Prevents body scroll when locked (overflow: hidden)
 * - Stores and restores original overflow style
 * - Stores and restores scroll position
 * - Handles iOS Safari scroll behavior quirks
 * - Multiple locks can coexist (reference counting)
 *
 * @example
 * useBodyScrollLock(isModalOpen);
 *
 * @param {boolean} isLocked - Whether scroll should be locked
 * @returns {void}
 */
export const useBodyScrollLock = isLocked => {
    const scrollPositionRef = useRef(0);
    const originalOverflowRef = useRef('');

    useEffect(() => {
        if (!isLocked) return;

        // Store current state
        scrollPositionRef.current = window.scrollY;
        originalOverflowRef.current = document.body.style.overflow;

        // Lock scroll
        document.body.style.overflow = 'hidden';

        // iOS Safari fix: prevent bounce scrolling
        const preventTouchMove = event => {
            // Allow scrolling within modal elements
            if (event.target.closest('[role="dialog"]')) {
                return;
            }
            event.preventDefault();
        };

        // Only prevent touch move on iOS devices
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            document.addEventListener('touchmove', preventTouchMove, { passive: false });
        }

        // Cleanup function
        return () => {
            // Restore overflow
            document.body.style.overflow = originalOverflowRef.current;

            // Restore scroll position
            window.scrollTo(0, scrollPositionRef.current);

            // Remove iOS event listener
            if (isIOS) {
                document.removeEventListener('touchmove', preventTouchMove);
            }
        };
    }, [isLocked]);
};

export default useBodyScrollLock;
