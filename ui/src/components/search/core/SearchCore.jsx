// ui/src/components/search/core/SearchCore.jsx
// Core search functionality as reusable components - NOT plugins

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchControls from '../SearchControls';
import SearchResults from '../SearchResults';
import LoadingSpinner from '../../common/LoadingSpinner';
import { useToast } from '../../providers/ToastProvider';
import { SearchSorter } from '../sorting';
import { useSearchCoordinator } from '../../../contexts/SearchCoordinatorProvider';

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
export default function SearchCore({
    // Data adapter - this is what makes each search type unique
    searchAdapter,

    // Configuration - can be provided directly or via plugin
    sources = [],
    filters = [],
    sortOptions = [],

    // UI Configuration
    className = 'search-engine',
    placeholder = 'Search...',
    // enableHoverPreview = true, // Unused for now
    defaultView = 'grid',
    defaultSort = 'alpha',
    defaultSource = null,

    // Autocomplete configuration
    enableAutocomplete = false,
    autocompleteMinLength = 2,

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
    isRefreshing = false,

    // UI Customization
    selectorLabel = 'Source',

    // Visibility control - for mobile header search coordination
    hideMainSearchInterface = false,

    // Refresh trigger - extract explicitly to avoid dependency array issues
    refreshTrigger = 0,

    ...additionalProps
}) {
    // ===== STATE MANAGEMENT =====
    const [isLoading, setIsLoading] = useState(false);
    const [searchData, setSearchData] = useState(null);

    // Search state
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOptions, setSearchOptions] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [hasUserSearched, setHasUserSearched] = useState(false);

    // UI state
    const [currentSource, setCurrentSource] = useState(defaultSource || sources[0]?.key || null);
    const [currentSort, setCurrentSort] = useState(defaultSort);
    const [currentView, setCurrentView] = useState(defaultView);
    const [activeFilters, setActiveFilters] = useState({});

    // Modal state
    const [modalInfo, setModalInfo] = useState(null);

    // Keyboard navigation state
    const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

    // ===== HOOKS =====
    const toast = useToast();
    const isMountedRef = useRef(true);
    const { registerPageSearch } = useSearchCoordinator();
    const debounceTimeoutRef = useRef(null);
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

    // Cleanup on unmount
    useEffect(() => {
        const timeoutRef = debounceTimeoutRef;
        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // ===== HEADER SEARCH INTEGRATION =====
    // Register this SearchCore with the HeaderSearchProvider
    useEffect(() => {
        if (!registerPageSearch) return;

        const searchCoreAPI = {
            executeSearch: (term, options = {}) => {
                setPendingSearchTerm(term);
                setSearchTerm(term);
                setSearchOptions(options);
                setHasUserSearched(true);
            },
            changeSource: newSource => {
                setCurrentSource(newSource);
                onSourceChange(newSource);
            },
            changeView: newView => {
                setCurrentView(newView);
            },
            changeSort: newSort => {
                setCurrentSort(newSort);
            },
            changeFilter: (filterKey, value) => {
                setActiveFilters(prev => ({
                    ...prev,
                    [filterKey]: value,
                }));
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
        onSourceChange,
        onRefresh,
    ]);

    // ===== DATA LOADING =====
    useEffect(() => {
        if (!searchAdapter?.loadInitialData || !currentSource) return;

        let cancelled = false;

        const loadData = async () => {
            setIsLoading(true);

            try {
                const data = await searchAdapter.loadInitialData(currentSource);
                if (!cancelled) {
                    setSearchData(data);
                    stableOnDataLoaded(data);

                    if (data.errorSources && data.errorSources.length > 0) {
                        console.warn('Some sources failed to load:', data.errorSources);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    toast.error('Failed to load data');
                    stableOnError(err);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [searchAdapter, currentSource, stableOnDataLoaded, stableOnError, toast, refreshTrigger]);

    // ===== SEARCH LOGIC =====
    // Search is now handled by the useEffect that processes results based on searchTerm changes

    // Apply filters and sorting to results (works for both search results and initial data)
    useEffect(() => {
        if (!searchData || !searchAdapter?.search) return;

        const processResults = () => {
            try {
                // Get results based on whether the user has actively searched
                let results;
                if (searchTerm && searchTerm.trim()) {
                    // User is actively searching: filter data by search term
                    results = searchAdapter.search(searchData, searchTerm, {}, currentSource);

                    // Apply exact match filtering if specified (autocomplete selection)
                    if (searchOptions.exactMatch && searchOptions.suggestionData) {
                        // Filter to only show the specific selected item
                        const suggestionData = searchOptions.suggestionData;
                        results = results.filter(item => {
                            // Match by ID if available, otherwise by title
                            if (suggestionData.id && item.id) {
                                return item.id === suggestionData.id;
                            }
                            // Fallback to exact title match
                            return item.title === suggestionData.title;
                        });
                    }
                } else if (hasUserSearched) {
                    // User previously searched but cleared search: show all data with sorting/filtering
                    results = searchAdapter.search(searchData, '', {}, currentSource);
                } else {
                    // Initial state: no results until user searches
                    results = [];
                }

                // Ensure results is always an array
                if (!Array.isArray(results)) {
                    console.warn('SearchCore: search() returned non-array:', results);
                    results = [];
                }

                // Apply filters
                if (searchAdapter.filter) {
                    results = searchAdapter.filter(results, activeFilters, currentSource);
                    // Ensure filter result is always an array
                    if (!Array.isArray(results)) {
                        console.warn('SearchCore: filter() returned non-array:', results);
                        results = [];
                    }
                }

                // Apply sorting
                if (currentSort) {
                    const searchType = SearchSorter.inferSearchType(results);
                    results = SearchSorter.sort(results, currentSort, {
                        priorityOrder: searchData?.priorityOrder || {},
                        ownerPriorityOrder: searchData?.ownerPriorityOrder || {},
                        groupBy,
                        currentSource,
                        searchType,
                    });
                    // Ensure sort result is always an array
                    if (!Array.isArray(results)) {
                        console.warn('SearchSorter returned non-array:', results);
                        results = [];
                    }
                }

                // Format results for display
                if (searchAdapter.formatResult && results.length > 0) {
                    results = results.map(item => ({
                        ...searchAdapter.formatResult(item, currentSource),
                        original: item,
                    }));
                }

                setSearchResults(results);
            } catch (error) {
                console.error('SearchCore: processResults error:', error);
                setSearchResults([]);
            }
        };

        processResults();
    }, [
        activeFilters,
        currentSort,
        currentSource,
        groupBy,
        hasUserSearched,
        searchAdapter,
        searchData,
        searchTerm,
        searchOptions,
    ]);

    // ===== JUMP BAR DATA PROVIDER =====
    // Update page-level jump bar with current search data
    // Jump bar functionality removed for simplification

    // ===== EVENT HANDLERS =====
    const handleSearchTermChange = useCallback(newTerm => {
        setPendingSearchTerm(newTerm);

        // Clear exact match options when user manually types (not autocomplete selection)
        setSearchOptions({});

        if (!newTerm.trim()) {
            setSearchTerm('');
            // Don't clear results - let useEffect handle displaying all data
        }
    }, []);

    const handleSearch = () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setHasUserSearched(true); // Mark that user has explicitly searched
        setSearchTerm(pendingSearchTerm); // Apply the pending search term
    };

    const handleClearSearch = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchOptions({});
        setSearchResults([]);
        setActiveFilters({});
    }, []);

    const handleSourceChange = newSource => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchOptions({});
        setSearchResults([]);
        setActiveFilters({});
        setHasUserSearched(false); // Reset search state for new source

        setCurrentSource(newSource);
        onSourceChange(newSource);
    };

    const handleFilterChange = (filterKey, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterKey]: value,
        }));
    };

    const handleResultClick = useCallback(
        result => {
            if (onResultClick) {
                onResultClick(result);
            } else {
                setModalInfo(result);
            }
        },
        [onResultClick]
    );

    const handleModalClose = () => {
        setModalInfo(null);
    };

    const handleResultDeleted = () => {
        setModalInfo(null);
        if (onResultDelete) onResultDelete();
    };

    // ===== KEYBOARD NAVIGATION =====
    const handleGlobalKeyDown = useCallback(
        e => {
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
                    if (modalInfo) {
                        setModalInfo(null);
                    } else if (searchTerm || pendingSearchTerm) {
                        handleClearSearch();
                        setFocusedResultIndex(-1);
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedResultIndex(prev => {
                        const nextIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
                        return nextIndex;
                    });
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedResultIndex(prev => {
                        const nextIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
                        return nextIndex;
                    });
                    break;

                case 'PageDown':
                    e.preventDefault();
                    if (resultsContainerRef.current) {
                        const container = resultsContainerRef.current;
                        const scrollAmount = container.clientHeight * 0.8; // Scroll by 80% of viewport height
                        const currentScrollTop = container.scrollTop;
                        const maxScrollTop = container.scrollHeight - container.clientHeight;
                        const newScrollTop = Math.min(
                            currentScrollTop + scrollAmount,
                            maxScrollTop
                        );

                        container.scrollTo({
                            top: newScrollTop,
                            behavior: 'smooth',
                        });
                    }
                    break;

                case 'PageUp':
                    e.preventDefault();
                    if (resultsContainerRef.current) {
                        const container = resultsContainerRef.current;
                        const scrollAmount = container.clientHeight * 0.8; // Scroll by 80% of viewport height
                        const currentScrollTop = container.scrollTop;
                        const newScrollTop = Math.max(currentScrollTop - scrollAmount, 0);

                        container.scrollTo({
                            top: newScrollTop,
                            behavior: 'smooth',
                        });
                    }
                    break;

                case 'Enter':
                    if (focusedResultIndex >= 0 && focusedResultIndex < searchResults.length) {
                        e.preventDefault();
                        const focusedResult = searchResults[focusedResultIndex];
                        handleResultClick(focusedResult);
                    }
                    break;
            }
        },
        [
            modalInfo,
            searchTerm,
            pendingSearchTerm,
            searchResults,
            focusedResultIndex,
            handleClearSearch,
            handleResultClick,
        ]
    );

    useEffect(() => {
        setFocusedResultIndex(-1);
    }, [searchResults]);

    useEffect(() => {
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [handleGlobalKeyDown]);

    // ===== ERROR HANDLING =====
    const displayError = null;

    // ===== RENDER =====
    return (
        <div className={className} role="search" aria-label="Search interface">
            {!hideMainSearchInterface && (
                <SearchControls
                    sources={sources}
                    currentSource={currentSource}
                    onSourceChange={handleSourceChange}
                    searchTerm={pendingSearchTerm}
                    onSearchTermChange={handleSearchTermChange}
                    onSearch={handleSearch}
                    onClear={handleClearSearch}
                    placeholder={placeholder}
                    isSearching={isLoading}
                    searchInputRef={searchInputRef}
                    enableAutocomplete={enableAutocomplete}
                    autocompleteMinLength={autocompleteMinLength}
                    searchAdapter={searchAdapter}
                    filters={filters}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    sortOptions={sortOptions}
                    currentSort={currentSort}
                    onSortChange={setCurrentSort}
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    searchData={searchData}
                    showRefreshControls={showRefreshControls}
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                    selectorLabel={selectorLabel}
                    {...additionalProps}
                />
            )}

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
