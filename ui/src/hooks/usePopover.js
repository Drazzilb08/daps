import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for managing popover state and behavior
 *
 * @param {boolean} initialState - Initial show/hide state for the popover
 * @returns {Object} Popover state management object
 * @returns {boolean} returns.show - Current visibility state
 * @returns {Function} returns.open - Function to show the popover
 * @returns {Function} returns.close - Function to hide the popover
 * @returns {Function} returns.toggle - Function to toggle popover visibility
 * @returns {Object} returns.triggerRef - Ref to attach to the trigger element
 */
const usePopover = (initialState = false) => {
    const [show, setShow] = useState(initialState);
    const triggerRef = useRef(null);

    const open = useCallback(() => {
        setShow(true);
    }, []);

    const close = useCallback(() => {
        setShow(false);
    }, []);

    const toggle = useCallback(() => {
        setShow(prev => !prev);
    }, []);

    return {
        show,
        open,
        close,
        toggle,
        triggerRef,
    };
};

export default usePopover;
