/**
 * Touch Device Detection Utilities
 *
 * Provides reliable touch device detection for showing appropriate UI controls:
 * - Touch devices: Show up/down arrow buttons for reordering
 * - Non-touch devices: Show drag handles for drag-and-drop
 */

import React from 'react';

/**
 * Detect if the current device supports touch input
 * Uses multiple detection methods for reliability
 *
 * @returns {boolean} True if touch device is detected
 */
export const isTouchDevice = () => {
    // Check for touch events support
    if ('ontouchstart' in window) {
        return true;
    }

    // Check for touch points
    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) {
        return true;
    }

    // Check for msMaxTouchPoints (IE/Edge)
    if (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) {
        return true;
    }

    // Check for pointer support with fine pointer (non-touch)
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
        return false;
    }

    // Check for coarse pointer (touch)
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        return true;
    }

    // Fallback: assume non-touch for desktop-like environments
    return false;
};

/**
 * React hook for touch device detection with re-render on changes
 * Useful for responsive touch/non-touch UI
 *
 * @returns {boolean} True if touch device is detected
 */
export const useTouchDevice = () => {
    const [isTouch, setIsTouch] = React.useState(isTouchDevice);

    React.useEffect(() => {
        // Update detection if media queries change
        const mediaQueryList = window.matchMedia('(pointer: coarse)');

        const handleChange = () => {
            setIsTouch(isTouchDevice());
        };

        // Listen for media query changes
        if (mediaQueryList.addEventListener) {
            mediaQueryList.addEventListener('change', handleChange);
        } else if (mediaQueryList.addListener) {
            // Fallback for older browsers
            mediaQueryList.addListener(handleChange);
        }

        // Listen for custom touch capability change events (for DevTools simulation)
        const handleTouchCapabilityChange = () => {
            setIsTouch(isTouchDevice());
        };

        window.addEventListener('touchCapabilityChanged', handleTouchCapabilityChange);

        // Cleanup function
        return () => {
            if (mediaQueryList.removeEventListener) {
                mediaQueryList.removeEventListener('change', handleChange);
            } else if (mediaQueryList.removeListener) {
                mediaQueryList.removeListener(handleChange);
            }
            window.removeEventListener('touchCapabilityChanged', handleTouchCapabilityChange);
        };
    }, []);

    return isTouch;
};

/**
 * CSS class helper for conditional touch/non-touch styling
 *
 * @param {string} touchClasses - Classes to apply on touch devices
 * @param {string} nonTouchClasses - Classes to apply on non-touch devices
 * @returns {string} Appropriate classes for current device
 */
export const touchClasses = (touchClasses = '', nonTouchClasses = '') => {
    return isTouchDevice() ? touchClasses : nonTouchClasses;
};
