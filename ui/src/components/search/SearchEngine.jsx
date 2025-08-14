// ui/src/components/search/SearchEngine.jsx
// Main orchestrator component for the SearchEngine system
// Maintains 100% feature parity with existing poster_search components

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchControls from './SearchControls';
import ModularSearchResults from './ModularSearchResults';
import ModalTrigger from './ModalTrigger';
import useHoverPreview from './HoverPreview';
import LoadingSpinner from '../common/LoadingSpinner';
import { useToast } from '../providers/ToastProvider';

export default function SearchEngine({
    // Adapter for search logic
    searchAdapter,

    // Configuration
    sources = [],
    filters = [],
    sortOptions = [],

    // UI Configuration
    className = 'search-engine',
    placeholder = 'Search...',
    enableHoverPreview = true,

    // View configuration
    defaultView = 'grid',
    defaultSort = 'alpha',
    defaultSource = null,

    // Results display configuration
    renderer = 'simple', // Which renderer to use ('simple', 'poster', etc.)
    groupBy = null, // Grouping configuration (e.g., 'location' for GDrive)

    // Event handlers
    onError = () => {},
    onResultClick = null,
    onResultDelete = () => {},
    onDataLoaded = () => {},
    onSourceChange = () => {},

    // Additional props for customization
    // debounceMs = 300, // Reserved for future autocomplete features
    enableVirtualization = true, // Phase 2 Enhancement: result virtualization
    virtualizationThreshold = 100, // Enable for 100+ items
    ...additionalProps
}) {
    // ===== STATE MANAGEMENT =====
    const [isLoading, setIsLoading] = useState(false);
    const [searchData, setSearchData] = useState(null);
    const [error, setError] = useState(null);

    // Search state
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // UI state
    const [currentSource, setCurrentSource] = useState(defaultSource || sources[0]?.key || null);
    const [currentSort, setCurrentSort] = useState(defaultSort);
    const [currentView, setCurrentView] = useState(defaultView);
    const [activeFilters, setActiveFilters] = useState({});

    // Modal state
    const [modalInfo, setModalInfo] = useState(null);

    // Keyboard navigation state (Phase 2 Enhancement)
    const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

    // ===== HOOKS =====
    const toast = useToast();
    const isMountedRef = useRef(true);
    const debounceTimeoutRef = useRef(null);
    const searchInputRef = useRef(null);
    const resultsContainerRef = useRef(null);
    // Hook must be called unconditionally
    const hoverPreviewImgRef = useHoverPreview();
    const activeHoverPreviewRef = enableHoverPreview ? hoverPreviewImgRef : null;

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

    // ===== DATA LOADING =====
    // Moved data loading logic into useEffect to prevent infinite loops

    // Load data on mount and source change
    useEffect(() => {
        // Only run once on mount or when source changes
        let cancelled = false;

        const loadData = async () => {
            if (!searchAdapter?.loadInitialData || cancelled) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await searchAdapter.loadInitialData(currentSource);
                if (!cancelled) {
                    setSearchData(data);
                    if (onDataLoaded) onDataLoaded(data);

                    // Log if there were errors but still got some data
                    if (data.errorSources && data.errorSources.length > 0) {
                        console.warn('Some sources failed to load:', data.errorSources);
                        // No toast notification - just console logging
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    const errorMessage = err.message || 'Failed to load data';
                    setError(errorMessage);

                    // Don't retry on SearchEngine errors - let the adapter handle graceful degradation
                    toast.error('Failed to load data');
                    if (onError) onError(err);
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
    }, [searchAdapter, currentSource, onDataLoaded, onError, toast]); // Include all dependencies

    // ===== SEARCH LOGIC =====
    const performSearch = useCallback(
        (overrideTerm = undefined) => {
            if (!searchAdapter?.search || !searchData) return;

            setIsSearching(true);

            // Use setTimeout to allow UI to update with loading state
            setTimeout(() => {
                try {
                    const term = overrideTerm !== undefined ? overrideTerm : pendingSearchTerm;

                    // Perform basic search (without filters initially like original)
                    let results = searchAdapter.search(searchData, term, {}, currentSource);

                    // Apply current filters
                    if (searchAdapter.filter) {
                        results = searchAdapter.filter(results, activeFilters, currentSource);
                    }

                    // Apply sorting (but not for priority sorts - those are handled at UI grouping level)
                    if (searchAdapter.sort && currentSort && !currentSort.startsWith('priority-')) {
                        results = searchAdapter.sort(results, currentSort, currentSource);
                    }

                    // Format results for display
                    if (searchAdapter.formatResult) {
                        results = results.map(item => ({
                            ...searchAdapter.formatResult(item, currentSource),
                            original: item,
                        }));
                    }

                    setSearchTerm(term || '');
                    setSearchResults(results);
                } catch (err) {
                    console.error('Search error:', err);
                    setError(err.message || 'Search failed');
                    toast('Search failed', 'error');
                    if (onError) onError(err);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 0);
        },
        [
            searchAdapter,
            searchData,
            pendingSearchTerm,
            activeFilters,
            currentSource,
            currentSort,
            onError,
            toast,
        ]
    );

    // Re-apply filters and sorting to existing search results (don't re-search)
    useEffect(() => {
        // Only re-filter if we have already performed a search
        if (!searchTerm || !searchData) return;

        // Re-apply filters and sorting to current search term without re-searching
        const applyFiltersAndSort = () => {
            if (!searchAdapter?.search) return;

            // Get the raw search results for current term
            let results = searchAdapter.search(searchData, searchTerm, {}, currentSource);

            // Apply current filters
            if (searchAdapter.filter) {
                results = searchAdapter.filter(results, activeFilters, currentSource);
            }

            // Apply sorting (but not for priority sorts - those are handled at UI grouping level)
            if (searchAdapter.sort && currentSort && !currentSort.startsWith('priority-')) {
                results = searchAdapter.sort(results, currentSort, currentSource);
            }

            // Format results for display
            if (searchAdapter.formatResult) {
                results = results.map(item => ({
                    ...searchAdapter.formatResult(item, currentSource),
                    original: item,
                }));
            }

            setSearchResults(results);
        };

        applyFiltersAndSort();
    }, [activeFilters, currentSort, currentSource, searchAdapter, searchData, searchTerm]); // Include all dependencies

    // ===== DEBOUNCED LOGIC (Reserved for future autocomplete features) =====
    // const debouncedPerformSearch = useCallback((searchTerm) => {
    //     if (debounceTimeoutRef.current) {
    //         clearTimeout(debounceTimeoutRef.current);
    //     }
    //
    //     debounceTimeoutRef.current = setTimeout(() => {
    //         performSearch(searchTerm);
    //     }, debounceMs);
    // }, [performSearch, debounceMs]);

    // Handle search term changes - all searches are manual (Enter/button only)
    const handleSearchTermChange = useCallback(newTerm => {
        setPendingSearchTerm(newTerm);

        // Clear search results immediately when term is empty
        if (!newTerm.trim()) {
            setSearchTerm('');
            setSearchResults([]);
        }
        // Note: No auto-search - all searches require explicit user action (Enter/button)
    }, []);

    // ===== EVENT HANDLERS =====
    const handleSearch = () => {
        // Clear any pending debounced search
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        performSearch();
    };

    const handleClearSearch = useCallback(() => {
        // Clear any pending debounced search
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
        setActiveFilters({});
    }, []);

    const handleSourceChange = newSource => {
        // Clear any pending debounced search
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        // Clear search state when source changes
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
        setActiveFilters({});

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
                // Default behavior: open modal
                setModalInfo(result.original || result);
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
        // Note: Removed automatic reload to prevent infinite loops
        // Data will be refreshed on next manual action
    };

    // ===== KEYBOARD NAVIGATION (Phase 2 Enhancement) =====
    const handleGlobalKeyDown = useCallback(
        e => {
            // Only handle if not typing in an input
            if (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.tagName === 'SELECT'
            ) {
                return;
            }

            switch (e.key) {
                case '/':
                    // Focus search input when pressing '/'
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    break;

                case 'Escape':
                    // Clear search or close modal
                    e.preventDefault();
                    if (modalInfo) {
                        setModalInfo(null);
                    } else if (searchTerm || pendingSearchTerm) {
                        handleClearSearch();
                        setFocusedResultIndex(-1);
                    }
                    break;

                case 'ArrowDown':
                    // Navigate down through results
                    e.preventDefault();
                    setFocusedResultIndex(prev => {
                        const nextIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
                        return nextIndex;
                    });
                    break;

                case 'ArrowUp':
                    // Navigate up through results
                    e.preventDefault();
                    setFocusedResultIndex(prev => {
                        const nextIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
                        return nextIndex;
                    });
                    break;

                case 'Enter':
                    // Open focused result
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

    // Reset focused result when search results change
    useEffect(() => {
        setFocusedResultIndex(-1);
    }, [searchResults]);

    // Add global keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [handleGlobalKeyDown]);

    // ===== ERROR HANDLING =====
    const displayError = error || (searchData === null && !isLoading ? 'No data available' : null);

    // ===== RENDER =====
    return (
        <div
            className={`${className} poster-search-root`}
            role="search"
            aria-label="Poster search interface"
        >
            <div className="poster-search-card">
                <div className="poster-search-content">
                    <SearchControls
                        // Source management
                        sources={sources}
                        currentSource={currentSource}
                        onSourceChange={handleSourceChange}
                        // Search functionality
                        searchTerm={pendingSearchTerm}
                        onSearchTermChange={handleSearchTermChange}
                        onSearch={handleSearch}
                        onClear={handleClearSearch}
                        placeholder={placeholder}
                        isSearching={isSearching || isLoading}
                        searchInputRef={searchInputRef}
                        // Filters
                        filters={filters}
                        activeFilters={activeFilters}
                        onFilterChange={handleFilterChange}
                        // Sort and view
                        sortOptions={sortOptions}
                        currentSort={currentSort}
                        onSortChange={setCurrentSort}
                        currentView={currentView}
                        onViewChange={setCurrentView}
                        // Additional data for dynamic filters
                        searchData={searchData}
                        {...additionalProps}
                    />

                    {isLoading || isSearching ? (
                        <div
                            className="search-loading-container"
                            role="status"
                            aria-live="polite"
                            aria-label="Loading content"
                        >
                            <div className="search-loading-content">
                                <LoadingSpinner />
                                <div className="search-loading-text">
                                    {isLoading ? 'Loading search data...' : 'Searching...'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ModularSearchResults
                            error={displayError}
                            results={searchResults}
                            searchTerm={searchTerm}
                            renderer={renderer}
                            currentSort={currentSort}
                            currentView={currentView}
                            onResultClick={handleResultClick}
                            hoverPreviewImgRef={activeHoverPreviewRef}
                            enableHoverPreview={enableHoverPreview}
                            priorityOrder={searchData?.priorityOrder || {}}
                            groupBy={groupBy}
                            focusedResultIndex={focusedResultIndex}
                            resultsContainerRef={resultsContainerRef}
                            enableVirtualization={enableVirtualization}
                            virtualizationThreshold={virtualizationThreshold}
                        />
                    )}
                </div>
            </div>

            {modalInfo && (
                <ModalTrigger
                    obj={modalInfo}
                    onClose={handleModalClose}
                    onDeleted={handleResultDeleted}
                />
            )}
        </div>
    );
}
