import { useState, useEffect, useRef } from 'react';

/**
 * useLogSearch Hook
 *
 * Custom hook to manage search functionality with debouncing and keyboard shortcuts.
 * Separates search logic from UI components.
 *
 * @returns {Object} Search state and actions
 */
export function useLogSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const searchTimeoutRef = useRef(null);

    // Clear search function
    const clearSearch = () => {
        setSearchTerm('');
    };

    // Toggle collapse function
    const toggleCollapse = () => {
        setIsCollapsed(c => !c);
    };

    // Keyboard shortcuts setup
    useEffect(() => {
        function onKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const el = document.querySelector('.search-logs');
                if (el) {
                    el.focus();
                    el.select();
                }
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Cleanup search timeout on unmount
    useEffect(() => {
        const timeoutRef = searchTimeoutRef;
        return () => {
            const timeout = timeoutRef.current;
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, []);

    return {
        searchTerm,
        isCollapsed,
        setSearchTerm,
        clearSearch,
        toggleCollapse,
    };
}
