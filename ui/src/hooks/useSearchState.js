/**
 * Search State Hook
 * Manages all state related to search functionality
 * Provides clean actions for state updates with proper optimization
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing search-related state
 * Centralizes all state management for SearchCore component
 * @param {Object} options - Configuration options
 * @param {string} options.defaultSource - Default source selection
 * @param {string} options.defaultSort - Default sort option
 * @param {string} options.defaultView - Default view mode
 * @param {Array} options.sources - Available sources
 * @param {Function} options.onSourceChange - Source change callback
 * @returns {Object} State values and actions
 */
export function useSearchState({
    defaultSource = null,
    defaultSort = 'alpha',
    defaultView = 'grid',
    sources = [],
    onSourceChange,
}) {
    // ===== CORE SEARCH STATE =====
    const [isLoading, setIsLoading] = useState(false);
    const [searchData, setSearchData] = useState(null);

    // Search term state - separate pending and active for debouncing
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOptions, setSearchOptions] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [hasUserSearched, setHasUserSearched] = useState(false);

    // ===== UI CONTROL STATE =====
    const [currentSource, setCurrentSource] = useState(defaultSource || sources[0]?.key || null);
    const [currentSort, setCurrentSort] = useState(defaultSort);
    const [currentView, setCurrentView] = useState(defaultView);
    const [activeFilters, setActiveFilters] = useState({});

    // ===== MODAL STATE =====
    const [modalInfo, setModalInfo] = useState(null);

    // ===== KEYBOARD NAVIGATION STATE =====
    const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

    // ===== DEBOUNCE MANAGEMENT =====
    const debounceTimeoutRef = useRef(null);

    // ===== STATE ACTIONS =====

    /**
     * Update pending search term (for real-time input)
     * Clears exact match options when user manually types
     */
    const updatePendingSearchTerm = useCallback(newTerm => {
        setPendingSearchTerm(newTerm);
        // Clear exact match options when user manually types (not autocomplete selection)
        setSearchOptions({});

        if (!newTerm.trim()) {
            setSearchTerm('');
        }
    }, []);

    /**
     * Execute search with current pending term
     * Handles debouncing and marks user as having searched
     */
    const executeSearch = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setHasUserSearched(true);
        setSearchTerm(pendingSearchTerm);
    }, [pendingSearchTerm]);

    /**
     * Execute search with specific term and options
     * Used by header search integration
     */
    const executeSearchWithTerm = useCallback((term, options = {}) => {
        setPendingSearchTerm(term);
        setSearchTerm(term);
        setSearchOptions(options);
        setHasUserSearched(true);
    }, []);

    /**
     * Clear all search state
     * Resets search terms, results, options, and filters
     */
    const clearSearch = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchOptions({});
        setSearchResults([]);
        setActiveFilters({});
    }, []);

    /**
     * Change source and reset search state
     * Clears all search-related state for new source
     */
    const changeSource = useCallback(
        newSource => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            setPendingSearchTerm('');
            setSearchTerm('');
            setSearchOptions({});
            setSearchResults([]);
            setActiveFilters({});
            setHasUserSearched(false);

            setCurrentSource(newSource);
            if (onSourceChange) {
                onSourceChange(newSource);
            }
        },
        [onSourceChange]
    );

    /**
     * Update filter value
     * Merges new filter value with existing filters
     */
    const updateFilter = useCallback((filterKey, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterKey]: value,
        }));
    }, []);

    /**
     * Update sort option
     */
    const updateSort = useCallback(newSort => {
        setCurrentSort(newSort);
    }, []);

    /**
     * Update view mode
     */
    const updateView = useCallback(newView => {
        setCurrentView(newView);
    }, []);

    /**
     * Modal actions
     */
    const openModal = useCallback(info => {
        setModalInfo(info);
    }, []);

    const closeModal = useCallback(() => {
        setModalInfo(null);
    }, []);

    /**
     * Keyboard navigation actions
     */
    const setFocusIndex = useCallback(index => {
        setFocusedResultIndex(index);
    }, []);

    const resetFocusIndex = useCallback(() => {
        setFocusedResultIndex(-1);
    }, []);

    // ===== DERIVED STATE =====
    const hasResults = searchResults.length > 0;
    const isSearchActive = searchTerm.trim().length > 0 || hasUserSearched;
    const shouldShowResults = hasUserSearched || searchTerm.trim().length > 0;

    // ===== CLEANUP =====
    useEffect(() => {
        const timeoutRef = debounceTimeoutRef;
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Reset focus when search results change
    useEffect(() => {
        setFocusedResultIndex(-1);
    }, [searchResults]);

    return {
        // ===== STATE VALUES =====
        // Loading and data
        isLoading,
        setIsLoading,
        searchData,
        setSearchData,

        // Search terms and options
        pendingSearchTerm,
        searchTerm,
        searchOptions,
        setSearchOptions,
        searchResults,
        setSearchResults,
        hasUserSearched,

        // UI controls
        currentSource,
        currentSort,
        currentView,
        activeFilters,

        // Modal
        modalInfo,

        // Keyboard navigation
        focusedResultIndex,

        // ===== STATE ACTIONS =====
        updatePendingSearchTerm,
        executeSearch,
        executeSearchWithTerm,
        clearSearch,
        changeSource,
        updateFilter,
        updateSort,
        updateView,
        openModal,
        closeModal,
        setFocusIndex,
        resetFocusIndex,

        // ===== DERIVED STATE =====
        hasResults,
        isSearchActive,
        shouldShowResults,

        // ===== REFS FOR EXTERNAL USE =====
        debounceTimeoutRef,
    };
}
