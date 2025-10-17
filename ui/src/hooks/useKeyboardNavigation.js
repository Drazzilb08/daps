/**
 * Keyboard Navigation Hook
 * Handles keyboard navigation logic for search interfaces
 * Manages focus states, keyboard shortcuts, and navigation actions
 */

import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard navigation in search interfaces
 * Provides comprehensive keyboard shortcut handling and focus management
 * @param {Object} options - Configuration options
 * @param {Object} options.searchState - Search state from useSearchState
 * @param {Function} options.onResultClick - Callback when result is clicked/selected
 * @param {Object} options.searchInputRef - Ref to search input element
 * @param {Object} options.resultsContainerRef - Ref to results container element
 * @returns {Object} Keyboard navigation handlers and state
 */
export function useKeyboardNavigation({
    searchState,
    onResultClick,
    searchInputRef,
    resultsContainerRef,
}) {
    // ===== SCROLL UTILITIES =====

    /**
     * Smooth scroll container in specified direction
     * @param {HTMLElement} container - Container element to scroll
     * @param {string} direction - 'up' or 'down'
     */
    const scrollContainer = useCallback((container, direction) => {
        const scrollAmount = container.clientHeight * 0.8; // Scroll by 80% of viewport height
        const currentScrollTop = container.scrollTop;

        let newScrollTop;
        if (direction === 'down') {
            const maxScrollTop = container.scrollHeight - container.clientHeight;
            newScrollTop = Math.min(currentScrollTop + scrollAmount, maxScrollTop);
        } else {
            newScrollTop = Math.max(currentScrollTop - scrollAmount, 0);
        }

        container.scrollTo({
            top: newScrollTop,
            behavior: 'smooth',
        });
    }, []);

    // ===== KEYBOARD EVENT HANDLER =====
    const handleGlobalKeyDown = useCallback(
        e => {
            // Skip if user is typing in form elements
            if (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.tagName === 'SELECT'
            ) {
                return;
            }

            switch (e.key) {
                case '/':
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    break;

                case 'Escape':
                    e.preventDefault();
                    if (searchState.modalInfo) {
                        searchState.closeModal();
                    } else if (searchState.searchTerm || searchState.pendingSearchTerm) {
                        searchState.clearSearch();
                        searchState.resetFocusIndex();
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    searchState.setFocusIndex(prev => {
                        const nextIndex =
                            prev < searchState.searchResults.length - 1 ? prev + 1 : 0;
                        return nextIndex;
                    });
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    searchState.setFocusIndex(prev => {
                        const nextIndex =
                            prev > 0 ? prev - 1 : searchState.searchResults.length - 1;
                        return nextIndex;
                    });
                    break;

                case 'PageDown':
                    e.preventDefault();
                    if (resultsContainerRef.current) {
                        scrollContainer(resultsContainerRef.current, 'down');
                    }
                    break;

                case 'PageUp':
                    e.preventDefault();
                    if (resultsContainerRef.current) {
                        scrollContainer(resultsContainerRef.current, 'up');
                    }
                    break;

                case 'Enter':
                    if (
                        searchState.focusedResultIndex >= 0 &&
                        searchState.focusedResultIndex < searchState.searchResults.length
                    ) {
                        e.preventDefault();
                        const focusedResult =
                            searchState.searchResults[searchState.focusedResultIndex];
                        if (onResultClick) {
                            onResultClick(focusedResult);
                        }
                    }
                    break;

                case 'Home':
                    e.preventDefault();
                    searchState.setFocusIndex(0);
                    break;

                case 'End':
                    e.preventDefault();
                    searchState.setFocusIndex(searchState.searchResults.length - 1);
                    break;
            }
        },
        [searchState, onResultClick, searchInputRef, resultsContainerRef, scrollContainer]
    );

    /**
     * Scroll to ensure focused result is visible
     * @param {number} focusedIndex - Index of currently focused result
     */
    const scrollToFocusedResult = useCallback(
        focusedIndex => {
            if (!resultsContainerRef.current || focusedIndex < 0) return;

            const container = resultsContainerRef.current;
            const focusedElement = container.querySelector(`[data-result-index="${focusedIndex}"]`);

            if (focusedElement) {
                focusedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest',
                });
            }
        },
        [resultsContainerRef]
    );

    // ===== KEYBOARD SHORTCUTS INFO =====

    /**
     * Get available keyboard shortcuts for display
     * @returns {Array} Array of shortcut objects
     */
    const getKeyboardShortcuts = useCallback(
        () => [
            { key: '/', description: 'Focus search input' },
            { key: 'Escape', description: 'Clear search or close modal' },
            { key: '↑/↓', description: 'Navigate results' },
            { key: 'Enter', description: 'Open focused result' },
            { key: 'Page Up/Down', description: 'Scroll results' },
            { key: 'Home/End', description: 'Go to first/last result' },
        ],
        []
    );

    // ===== NAVIGATION STATE UTILITIES =====

    /**
     * Navigate to specific result index
     * @param {number} index - Target index
     */
    const navigateToIndex = useCallback(
        index => {
            const clampedIndex = Math.max(0, Math.min(index, searchState.searchResults.length - 1));
            searchState.setFocusIndex(clampedIndex);
            scrollToFocusedResult(clampedIndex);
        },
        [searchState, scrollToFocusedResult]
    );

    /**
     * Navigate to next result
     */
    const navigateNext = useCallback(() => {
        const nextIndex =
            searchState.focusedResultIndex < searchState.searchResults.length - 1
                ? searchState.focusedResultIndex + 1
                : 0;
        navigateToIndex(nextIndex);
    }, [searchState.focusedResultIndex, searchState.searchResults.length, navigateToIndex]);

    /**
     * Navigate to previous result
     */
    const navigatePrevious = useCallback(() => {
        const prevIndex =
            searchState.focusedResultIndex > 0
                ? searchState.focusedResultIndex - 1
                : searchState.searchResults.length - 1;
        navigateToIndex(prevIndex);
    }, [searchState.focusedResultIndex, searchState.searchResults.length, navigateToIndex]);

    /**
     * Select currently focused result
     */
    const selectFocused = useCallback(() => {
        if (
            searchState.focusedResultIndex >= 0 &&
            searchState.focusedResultIndex < searchState.searchResults.length
        ) {
            const focusedResult = searchState.searchResults[searchState.focusedResultIndex];
            if (onResultClick) {
                onResultClick(focusedResult);
            }
        }
    }, [searchState.focusedResultIndex, searchState.searchResults, onResultClick]);

    // ===== EFFECTS =====

    // Register global keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [handleGlobalKeyDown]);

    // Auto-scroll to focused result when focus changes
    useEffect(() => {
        if (searchState.focusedResultIndex >= 0) {
            scrollToFocusedResult(searchState.focusedResultIndex);
        }
    }, [searchState.focusedResultIndex, scrollToFocusedResult]);

    return {
        // Navigation actions
        navigateToIndex,
        navigateNext,
        navigatePrevious,
        selectFocused,

        // Scroll utilities
        scrollContainer,
        scrollToFocusedResult,

        // Keyboard info
        getKeyboardShortcuts,

        // Current state
        focusedResultIndex: searchState.focusedResultIndex,
        hasFocusedResult:
            searchState.focusedResultIndex >= 0 &&
            searchState.focusedResultIndex < searchState.searchResults.length,

        // Handler for manual keyboard event processing
        handleGlobalKeyDown,
    };
}
