/**
 * Search Provider Component
 * Encapsulates all search state management, data processing, and integration logic
 * Provides clean interface between SearchCore configuration and hook orchestration
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchState } from '../../../hooks/useSearchState';
import { useSearchData } from '../../../hooks/useSearchData';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';
import { useSearchIntegration } from '../../../hooks/useSearchIntegration';

// Stable default functions to prevent infinite loops
const defaultOnError = () => {};
const defaultOnResultDelete = () => {};
const defaultOnDataLoaded = () => {};
const defaultOnSourceChange = () => {};

/**
 * SearchProvider - Manages all search hooks and provides render props to children
 * Centralizes the complex hook orchestration and callback management
 * @param {Object} props - Configuration props
 * @param {Object} props.searchAdapter - Data adapter for search operations
 * @param {Array} props.sources - Available search sources
 * @param {Array} props.filters - Available search filters
 * @param {Array} props.sortOptions - Available sort options
 * @param {string} props.defaultView - Default view mode
 * @param {string} props.defaultSort - Default sort option
 * @param {string} props.defaultSource - Default source selection
 * @param {string} props.groupBy - Grouping option for results
 * @param {Function} props.onError - Error callback
 * @param {Function} props.onResultDelete - Result deletion callback
 * @param {Function} props.onDataLoaded - Data loading callback
 * @param {Function} props.onSourceChange - Source change callback
 * @param {Function} props.onRefresh - Refresh callback
 * @param {number} props.refreshTrigger - Refresh trigger counter
 * @param {Function} props.children - Render prop function receiving search state and actions
 * @returns {JSX.Element} Provider component
 */
function SearchProvider({
    // Data configuration
    searchAdapter,
    sources = [],
    filters = [],
    sortOptions = [],

    // Default settings
    defaultView = 'grid',
    defaultSort = 'alpha',
    defaultSource = null,
    groupBy = null,

    // Event handlers
    onError = defaultOnError,
    onResultDelete = defaultOnResultDelete,
    onDataLoaded = defaultOnDataLoaded,
    onSourceChange = defaultOnSourceChange,
    onRefresh = null,

    // Refresh control
    refreshTrigger = 0,

    // Render prop
    children,
}) {
    // ===== REFS AND STABLE CALLBACKS =====
    const isMountedRef = useRef(true);
    const searchInputRef = useRef(null);
    const resultsContainerRef = useRef(null);

    // Stable callback refs to prevent infinite loops
    const onDataLoadedRef = useRef(onDataLoaded);
    const onErrorRef = useRef(onError);

    // Update refs when callbacks change
    useEffect(() => {
        onDataLoadedRef.current = onDataLoaded;
    }, [onDataLoaded]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const stableOnDataLoaded = useCallback(data => {
        if (onDataLoadedRef.current) onDataLoadedRef.current(data);
    }, []);

    const stableOnError = useCallback(error => {
        if (onErrorRef.current) onErrorRef.current(error);
    }, []);

    // ===== SEARCH STATE HOOK =====
    const searchState = useSearchState({
        defaultSource: defaultSource || sources[0]?.key || null,
        defaultSort,
        defaultView,
        sources,
        onSourceChange,
    });

    // ===== DATA MANAGEMENT HOOK =====
    // Memoize searchState to prevent infinite loops from object recreation
    const memoizedSearchState = useMemo(
        () => ({
            isLoading: searchState.isLoading,
            setIsLoading: searchState.setIsLoading,
            searchData: searchState.searchData,
            setSearchData: searchState.setSearchData,
            searchTerm: searchState.searchTerm,
            searchOptions: searchState.searchOptions,
            hasUserSearched: searchState.hasUserSearched,
            activeFilters: searchState.activeFilters,
            currentSort: searchState.currentSort,
            setSearchResults: searchState.setSearchResults,
        }),
        [
            searchState.isLoading,
            searchState.setIsLoading,
            searchState.searchData,
            searchState.setSearchData,
            searchState.searchTerm,
            searchState.searchOptions,
            searchState.hasUserSearched,
            searchState.activeFilters,
            searchState.currentSort,
            searchState.setSearchResults,
        ]
    );

    const { refreshData, getAutocompleteSuggestions } = useSearchData({
        searchAdapter,
        currentSource: searchState.currentSource,
        searchState: memoizedSearchState,
        groupBy,
        onDataLoaded: stableOnDataLoaded,
        onError: stableOnError,
        refreshTrigger,
    });

    // ===== KEYBOARD NAVIGATION HOOK =====
    // Create a default result click handler for keyboard navigation
    const defaultKeyboardResultClick = useCallback(
        result => {
            // Default behavior: open modal
            searchState.openModal(result);
        },
        [searchState.openModal]
    );

    const keyboardNavigation = useKeyboardNavigation({
        searchState: {
            modalInfo: searchState.modalInfo,
            searchTerm: searchState.searchTerm,
            pendingSearchTerm: searchState.pendingSearchTerm,
            searchResults: searchState.searchResults,
            focusedResultIndex: searchState.focusedResultIndex,
            closeModal: searchState.closeModal,
            clearSearch: searchState.clearSearch,
            resetFocusIndex: searchState.resetFocusIndex,
            setFocusIndex: searchState.setFocusIndex,
        },
        onResultClick: defaultKeyboardResultClick,
        searchInputRef,
        resultsContainerRef,
    });

    // ===== HEADER SEARCH INTEGRATION =====
    useSearchIntegration({
        searchAdapter,
        sources,
        filters,
        sortOptions,
        defaultView,
        defaultSort,
        currentSource: searchState.currentSource,
        showRefreshControls: !!onRefresh,
        executeSearchWithTerm: searchState.executeSearchWithTerm,
        changeSource: searchState.changeSource,
        updateView: searchState.updateView,
        updateSort: searchState.updateSort,
        updateFilter: searchState.updateFilter,
        onRefresh,
    });

    // ===== LIFECYCLE MANAGEMENT =====
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Reset focus index when results change
    useEffect(() => {
        searchState.resetFocusIndex();
    }, [searchState.searchResults, searchState.resetFocusIndex]);

    // ===== RENDER PROP =====
    const searchProviderValue = {
        // State values
        isLoading: searchState.isLoading,
        searchData: searchState.searchData,
        searchTerm: searchState.searchTerm,
        searchResults: searchState.searchResults,
        modalInfo: searchState.modalInfo,
        focusedResultIndex: searchState.focusedResultIndex,
        currentSource: searchState.currentSource,
        currentSort: searchState.currentSort,
        currentView: searchState.currentView,
        activeFilters: searchState.activeFilters,

        // State actions
        clearSearch: searchState.clearSearch,
        openModal: searchState.openModal,
        closeModal: searchState.closeModal,

        // Data utilities
        refreshData,
        getAutocompleteSuggestions,

        // Keyboard navigation
        keyboardNavigation,

        // Refs
        searchInputRef,
        resultsContainerRef,

        // Event handlers for SearchCore to customize
        onResultDelete,
    };

    return children(searchProviderValue);
}

export default SearchProvider;
