// ui/src/components/search/core/SearchCore.jsx
// Core search functionality as reusable components - NOT plugins

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchControls from '../SearchControls';
import ModularSearchResults from '../ModularSearchResults';
import ModalTrigger from '../ModalTrigger';
import useHoverPreview from '../HoverPreview';
import LoadingSpinner from '../../common/LoadingSpinner';
import { useToast } from '../../providers/ToastProvider';

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
    enableHoverPreview = true,
    defaultView = 'grid',
    defaultSort = 'alpha',
    defaultSource = null,
    
    // Results display configuration
    renderer = 'simple',
    groupBy = null,
    
    // Event handlers
    onError = defaultOnError,
    onResultClick = null,
    onResultDelete = defaultOnResultDelete,
    onDataLoaded = defaultOnDataLoaded,
    onSourceChange = defaultOnSourceChange,
    
    // Virtualization
    enableVirtualization = true,
    virtualizationThreshold = 100,
    
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

    // Keyboard navigation state
    const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

    // ===== HOOKS =====
    const toast = useToast();
    const isMountedRef = useRef(true);
    const debounceTimeoutRef = useRef(null);
    const searchInputRef = useRef(null);
    const resultsContainerRef = useRef(null);
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
    useEffect(() => {
        if (!searchAdapter?.loadInitialData || !currentSource) return;

        let cancelled = false;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await searchAdapter.loadInitialData(currentSource);
                if (!cancelled) {
                    setSearchData(data);
                    if (onDataLoaded) onDataLoaded(data);

                    if (data.errorSources && data.errorSources.length > 0) {
                        console.warn('Some sources failed to load:', data.errorSources);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    const errorMessage = err.message || 'Failed to load data';
                    setError(errorMessage);

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
    }, [searchAdapter, currentSource]); // Remove unstable functions from deps

    // ===== SEARCH LOGIC =====
    const performSearch = useCallback(
        (overrideTerm = undefined) => {
            if (!searchAdapter?.search || !searchData) return;

            setIsSearching(true);

            setTimeout(() => {
                try {
                    const term = overrideTerm !== undefined ? overrideTerm : pendingSearchTerm;

                    let results = searchAdapter.search(searchData, term, {}, currentSource);

                    // Ensure results is always an array
                    if (!Array.isArray(results)) {
                        console.warn('Search adapter returned non-array:', results);
                        results = [];
                    }

                    if (searchAdapter.filter) {
                        results = searchAdapter.filter(results, activeFilters, currentSource);
                        if (!Array.isArray(results)) {
                            console.warn('Filter adapter returned non-array:', results);
                            results = [];
                        }
                    }

                    if (searchAdapter.sort && currentSort && !currentSort.startsWith('priority-')) {
                        results = searchAdapter.sort(results, currentSort, currentSource);
                        if (!Array.isArray(results)) {
                            console.warn('Sort adapter returned non-array:', results);
                            results = [];
                        }
                    }

                    if (searchAdapter.formatResult && results.length > 0) {
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
        [searchAdapter, searchData, pendingSearchTerm, activeFilters, currentSource, currentSort]
    );

    // Re-apply filters and sorting to existing search results
    useEffect(() => {
        if (!searchTerm || !searchData || !searchAdapter?.search) return;

        const applyFiltersAndSort = () => {
            let results = searchAdapter.search(searchData, searchTerm, {}, currentSource);

            if (searchAdapter.filter) {
                results = searchAdapter.filter(results, activeFilters, currentSource);
            }

            if (searchAdapter.sort && currentSort && !currentSort.startsWith('priority-')) {
                results = searchAdapter.sort(results, currentSort, currentSource);
            }

            if (searchAdapter.formatResult) {
                results = results.map(item => ({
                    ...searchAdapter.formatResult(item, currentSource),
                    original: item,
                }));
            }

            setSearchResults(results);
        };

        applyFiltersAndSort();
    }, [activeFilters, currentSort, currentSource, searchAdapter, searchData, searchTerm]);

    // ===== EVENT HANDLERS =====
    const handleSearchTermChange = useCallback(newTerm => {
        setPendingSearchTerm(newTerm);

        if (!newTerm.trim()) {
            setSearchTerm('');
            setSearchResults([]);
        }
    }, []);

    const handleSearch = () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        performSearch();
    };

    const handleClearSearch = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
        setActiveFilters({});
    }, []);

    const handleSourceChange = newSource => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
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

                case 'Enter':
                    if (focusedResultIndex >= 0 && focusedResultIndex < searchResults.length) {
                        e.preventDefault();
                        const focusedResult = searchResults[focusedResultIndex];
                        handleResultClick(focusedResult);
                    }
                    break;
            }
        },
        [modalInfo, searchTerm, pendingSearchTerm, searchResults, focusedResultIndex, handleClearSearch, handleResultClick]
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
    const displayError = null; // Remove error banner completely

    // ===== RENDER =====
    return (
        <div className={className}>
            <div
                className="search-root"
                role="search"
                aria-label="Search interface"
            >
                <SearchControls
                    sources={sources}
                    currentSource={currentSource}
                    onSourceChange={handleSourceChange}
                    
                    searchTerm={pendingSearchTerm}
                    onSearchTermChange={handleSearchTermChange}
                    onSearch={handleSearch}
                    onClear={handleClearSearch}
                    placeholder={placeholder}
                    isSearching={isSearching || isLoading}
                    searchInputRef={searchInputRef}
                    
                    filters={filters}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    
                    sortOptions={sortOptions}
                    currentSort={currentSort}
                    onSortChange={setCurrentSort}
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    
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