// ui/src/components/search/core/SearchCore.jsx
// Core search functionality as reusable components - NOT plugins

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import SearchResults from '../SearchResults';
import LoadingSpinner from '../../common/LoadingSpinner';
import { useSearchCoordinator } from '../../../contexts/SearchCoordinatorProvider';
import { useSearchState } from '../../../hooks/useSearchState';
import { useSearchData } from '../../../hooks/useSearchData';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';

// Stable default functions to prevent infinite loops
const defaultOnError = () => {};
const defaultOnResultDelete = () => {};
const defaultOnDataLoaded = () => {};
const defaultOnSourceChange = () => {};

/**
 * Core Search Engine - Common functionality as reusable component
 * This handles all the common search UI patterns and state management
 * Only the data adapter changes between different search types
 */
function SearchCore({
    // Data adapter - this is what makes each search type unique
    searchAdapter,

    // Configuration - can be provided directly or via plugin
    sources = [],
    filters = [],
    sortOptions = [],

    // UI Configuration
    className = 'search-engine',
    // placeholder = 'Search...', // Unused - removed to fix ESLint
    // enableHoverPreview = true, // Unused for now
    defaultView = 'grid',
    defaultSort = 'alpha',
    defaultSource = null,

    // Autocomplete configuration - unused, commented out to fix ESLint
    // enableAutocomplete = false,
    // autocompleteMinLength = 2,

    // Results display configuration
    renderer = 'simple',
    groupBy = null,
    // showJumpBar = true, // Control jump bar visibility - unused for now

    // Modal configuration - plugin can provide custom modal component
    modalComponent = null,

    // Event handlers
    onError = defaultOnError,
    onResultClick = null,
    onResultDelete = defaultOnResultDelete,
    onDataLoaded = defaultOnDataLoaded,
    onSourceChange = defaultOnSourceChange,

    // Refresh functionality
    showRefreshControls = false,
    onRefresh = null,
    // isRefreshing = false, // Unused - removed to fix ESLint

    // UI Customization - unused, commented out to fix ESLint
    // selectorLabel = 'Source',

    // Visibility control - for mobile header search coordination

    // Refresh trigger - extract explicitly to avoid dependency array issues
    refreshTrigger = 0,

    // ...additionalProps // Unused - removed to fix ESLint
}) {
    // ===== STATE MANAGEMENT =====
    // Use centralized search state hook instead of manual state management
    const {
        // State values
        isLoading,
        setIsLoading,
        searchData,
        setSearchData,
        pendingSearchTerm,
        searchTerm,
        searchOptions,
        searchResults,
        setSearchResults,
        hasUserSearched,
        currentSource,
        currentSort,
        currentView,
        activeFilters,
        modalInfo,
        focusedResultIndex,

        // State actions
        executeSearchWithTerm,
        // updatePendingSearchTerm, // Unused - removed to fix ESLint
        // executeSearch, // Unused - removed to fix ESLint
        clearSearch,
        changeSource,
        updateSort,
        updateView,
        updateFilter,
        openModal,
        closeModal,
        setFocusIndex,
        resetFocusIndex,
    } = useSearchState({
        defaultSource: defaultSource || sources[0]?.key || null,
        defaultSort,
        defaultView,
        sources,
        onSourceChange,
    });

    // ===== HOOKS =====
    const isMountedRef = useRef(true);
    const { registerPageSearch } = useSearchCoordinator();
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

    // ===== DATA MANAGEMENT HOOK =====
    // Memoize searchState to prevent infinite loops from object recreation
    const memoizedSearchState = useMemo(
        () => ({
            isLoading,
            setIsLoading,
            searchData,
            setSearchData,
            searchTerm,
            searchOptions,
            hasUserSearched,
            activeFilters,
            currentSort,
            setSearchResults,
        }),
        [
            isLoading,
            setIsLoading,
            searchData,
            setSearchData,
            searchTerm,
            searchOptions,
            hasUserSearched,
            activeFilters,
            currentSort,
            setSearchResults,
        ]
    );

    // Use useSearchData hook to handle data loading and search processing
    const { refreshData, getAutocompleteSuggestions } = useSearchData({
        searchAdapter,
        currentSource,
        searchState: memoizedSearchState,
        groupBy,
        onDataLoaded: stableOnDataLoaded,
        onError: stableOnError,
        refreshTrigger,
    });

    // ===== KEYBOARD NAVIGATION HOOK =====
    // Use useKeyboardNavigation hook to handle keyboard shortcuts and navigation
    const { getKeyboardShortcuts, hasFocusedResult } = useKeyboardNavigation({
        searchState: {
            modalInfo,
            searchTerm,
            pendingSearchTerm,
            searchResults,
            focusedResultIndex,
            closeModal,
            clearSearch: clearSearch,
            resetFocusIndex,
            setFocusIndex,
        },
        onResultClick: result => {
            if (onResultClick) {
                onResultClick(result);
            } else {
                openModal(result);
            }
        },
        searchInputRef,
        resultsContainerRef,
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ===== HEADER SEARCH INTEGRATION =====
    // Register this SearchCore with the HeaderSearchProvider
    useEffect(() => {
        if (!registerPageSearch) return;

        const searchCoreAPI = {
            executeSearch: executeSearchWithTerm,
            changeSource: changeSource,
            changeView: updateView,
            changeSort: updateSort,
            changeFilter: (filterKey, value) => {
                updateFilter(filterKey, value);
            },
            executeRefresh: options => {
                if (onRefresh) {
                    onRefresh(options);
                }
            },
        };

        const searchConfig = {
            adapter: searchAdapter,
            sources,
            filters,
            sortOptions,
            defaultView,
            defaultSort,
            defaultSource: currentSource,
            showRefreshControls,
        };

        registerPageSearch(searchCoreAPI, searchConfig);
    }, [
        registerPageSearch,
        searchAdapter,
        sources,
        filters,
        sortOptions,
        defaultView,
        defaultSort,
        currentSource,
        showRefreshControls,
        executeSearchWithTerm,
        changeSource,
        updateView,
        updateSort,
        updateFilter,
        onSourceChange,
        onRefresh,
    ]);

    // ===== DATA LOADING =====
    // Data loading is now handled by useSearchData hook
    // No manual data loading effect needed

    // ===== SEARCH LOGIC =====
    // Search processing is now handled by useSearchData hook
    // No manual search processing effect needed

    // ===== JUMP BAR DATA PROVIDER =====
    // Update page-level jump bar with current search data
    // Jump bar functionality removed for simplification

    // ===== EVENT HANDLERS =====
    // Handlers removed - using hook actions directly to fix ESLint unused vars
    // const handleSearchTermChange = updatePendingSearchTerm;
    // const handleSearch = executeSearch;
    // const handleClearSearch = clearSearch;
    // const handleSourceChange = changeSource;
    // const handleFilterChange = (filterKey, value) => { updateFilter(filterKey, value); };

    // Event handlers now use the keyboard navigation hook
    const handleResultClick = useCallback(
        result => {
            if (onResultClick) {
                onResultClick(result);
            } else {
                openModal(result);
            }
        },
        [onResultClick, openModal]
    );

    const handleModalClose = closeModal;

    const handleResultDeleted = () => {
        closeModal();
        if (onResultDelete) onResultDelete();
    };

    // ===== KEYBOARD NAVIGATION =====
    // Keyboard navigation is now handled by useKeyboardNavigation hook
    // The hook automatically registers global keyboard event listeners

    // Reset focus index when results change
    useEffect(() => {
        resetFocusIndex();
    }, [searchResults, resetFocusIndex]);

    // ===== ERROR HANDLING =====
    const displayError = null;

    // ===== RENDER =====
    return (
        <div className={className} role="search" aria-label="Search interface">
            {isLoading ? (
                <div
                    className="search-loading-container"
                    role="status"
                    aria-live="polite"
                    aria-label="Loading content"
                >
                    <div className="search-loading-content">
                        <LoadingSpinner />
                        <div className="search-loading-text">Loading search data...</div>
                    </div>
                </div>
            ) : (
                <SearchResults
                    error={displayError}
                    results={searchResults}
                    searchTerm={searchTerm}
                    renderer={renderer}
                    currentSort={currentSort}
                    currentView={currentView}
                    onResultClick={handleResultClick}
                    priorityOrder={searchData?.priorityOrder || {}}
                    ownerPriorityOrder={searchData?.ownerPriorityOrder || {}}
                    groupBy={groupBy}
                    focusedResultIndex={focusedResultIndex}
                    resultsContainerRef={resultsContainerRef}
                    showRefreshControls={showRefreshControls}
                    refreshData={refreshData}
                    getAutocompleteSuggestions={getAutocompleteSuggestions}
                    keyboardShortcuts={getKeyboardShortcuts()}
                    hasFocusedResult={hasFocusedResult}
                />
            )}

            {modalInfo &&
                modalComponent &&
                React.createElement(modalComponent, {
                    obj: modalInfo,
                    onClose: handleModalClose,
                    onDeleted: handleResultDeleted,
                })}
        </div>
    );
}

// Export memoized component for performance optimization
export default React.memo(SearchCore);
