/**
 * Search Data Hook
 * Handles data loading, processing, and API calls for search functionality
 * Manages integration with search adapters and result processing
 */

import { useEffect, useRef, useCallback } from 'react';
import { SearchSorter } from '../components/search/sorting';
import { useToast } from '../components/providers/ToastProvider';

/**
 * Custom hook for managing search data operations
 * Handles initial data loading, search processing, filtering, and sorting
 * @param {Object} options - Configuration options
 * @param {Object} options.searchAdapter - Search adapter instance
 * @param {string} options.currentSource - Current selected source
 * @param {Object} options.searchState - Search state from useSearchState
 * @param {string} options.groupBy - Grouping option for results
 * @param {Function} options.onDataLoaded - Callback when data is loaded
 * @param {Function} options.onError - Error callback
 * @param {number} options.refreshTrigger - Trigger for refresh operations
 * @returns {Object} Data processing utilities and effects
 */
export function useSearchData({
    searchAdapter,
    currentSource,
    searchState,
    groupBy = null,
    onDataLoaded,
    onError,
    refreshTrigger = 0,
}) {
    const toast = useToast();
    const isMountedRef = useRef(true);

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

    // Stable callback wrappers
    const stableOnDataLoaded = useCallback(data => {
        if (onDataLoadedRef.current) {
            onDataLoadedRef.current(data);
        }
    }, []);

    const stableOnError = useCallback(error => {
        if (onErrorRef.current) {
            onErrorRef.current(error);
        }
    }, []);

    // ===== INITIAL DATA LOADING =====
    useEffect(() => {
        if (!searchAdapter?.loadInitialData || !currentSource) return;

        const loadData = async () => {
            searchState.setIsLoading(true);

            try {
                const data = await searchAdapter.loadInitialData(currentSource);

                // Always set data and call callbacks if component is still mounted
                if (isMountedRef.current) {
                    searchState.setSearchData(data);
                    stableOnDataLoaded(data);

                    if (data.errorSources && data.errorSources.length > 0) {
                        console.warn('Some sources failed to load:', data.errorSources);
                    }
                }
            } catch (err) {
                console.error('useSearchData: Error loading data:', err);
                if (isMountedRef.current) {
                    toast.error('Failed to load data');
                    stableOnError(err);
                }
            } finally {
                // Always set loading to false if component is mounted, regardless of cancellation
                // This prevents stuck loading states caused by React strict mode double mounting
                if (isMountedRef.current) {
                    searchState.setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            // Cleanup function
        };
    }, [
        searchAdapter,
        currentSource,
        stableOnDataLoaded,
        stableOnError,
        toast,
        refreshTrigger,
        searchState.setIsLoading,
        searchState.setSearchData,
    ]);

    // ===== SEARCH RESULTS PROCESSING =====
    useEffect(() => {
        if (!searchState.searchData || !searchAdapter?.search) return;

        const processResults = () => {
            try {
                // Get results based on whether the user has actively searched
                let results;

                if (searchState.searchTerm && searchState.searchTerm.trim()) {
                    // User is actively searching: filter data by search term
                    results = searchAdapter.search(
                        searchState.searchData,
                        searchState.searchTerm,
                        {},
                        currentSource
                    );

                    // Apply exact match filtering if specified (autocomplete selection)
                    if (
                        searchState.searchOptions.exactMatch &&
                        searchState.searchOptions.suggestionData
                    ) {
                        const suggestionData = searchState.searchOptions.suggestionData;
                        results = results.filter(item => {
                            // Match by ID if available, otherwise by title
                            if (suggestionData.id && item.id) {
                                return item.id === suggestionData.id;
                            }
                            // Fallback to exact title match
                            return item.title === suggestionData.title;
                        });
                    }
                } else if (searchState.hasUserSearched) {
                    // User previously searched but cleared search: show all data with sorting/filtering
                    results = searchAdapter.search(searchState.searchData, '', {}, currentSource);
                } else {
                    // Initial state: no results until user searches
                    results = [];
                }

                // Ensure results is always an array
                if (!Array.isArray(results)) {
                    console.warn('SearchData: search() returned non-array:', results);
                    results = [];
                }

                // Apply filters
                if (searchAdapter.filter && Object.keys(searchState.activeFilters).length > 0) {
                    results = searchAdapter.filter(
                        results,
                        searchState.activeFilters,
                        currentSource
                    );
                    // Ensure filter result is always an array
                    if (!Array.isArray(results)) {
                        console.warn('SearchData: filter() returned non-array:', results);
                        results = [];
                    }
                }

                // Apply sorting
                if (searchState.currentSort) {
                    const searchType = SearchSorter.inferSearchType(results);
                    results = SearchSorter.sort(results, searchState.currentSort, {
                        priorityOrder: searchState.searchData?.priorityOrder || {},
                        ownerPriorityOrder: searchState.searchData?.ownerPriorityOrder || {},
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

                searchState.setSearchResults(results);
            } catch (error) {
                console.error('SearchData: processResults error:', error);
                searchState.setSearchResults([]);
            }
        };

        processResults();
    }, [
        searchState.searchData,
        searchState.searchTerm,
        searchState.searchOptions,
        searchState.hasUserSearched,
        searchState.activeFilters,
        searchState.currentSort,
        searchAdapter,
        currentSource,
        groupBy,
        searchState.setSearchResults,
    ]);

    // ===== MOUNT/UNMOUNT TRACKING =====
    useEffect(() => {
        // Set to true on mount (handles React strict mode remounting)
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ===== UTILITY FUNCTIONS =====

    /**
     * Force refresh data loading
     * Useful for manual refresh operations
     */
    const refreshData = useCallback(async () => {
        if (!searchAdapter?.loadInitialData || !currentSource) return;

        searchState.setIsLoading(true);

        try {
            const data = await searchAdapter.loadInitialData(currentSource);
            if (isMountedRef.current) {
                searchState.setSearchData(data);
                stableOnDataLoaded(data);
            }
        } catch (err) {
            if (isMountedRef.current) {
                toast.error('Failed to refresh data');
                stableOnError(err);
            }
        } finally {
            if (isMountedRef.current) {
                searchState.setIsLoading(false);
            }
        }
    }, [
        searchAdapter,
        currentSource,
        stableOnDataLoaded,
        stableOnError,
        toast,
        searchState.setIsLoading,
        searchState.setSearchData,
    ]);

    /**
     * Get autocomplete suggestions
     * Provides suggestions for search input based on current data
     */
    const getAutocompleteSuggestions = useCallback(
        (term, minLength = 2) => {
            if (
                !searchAdapter?.getAutocompleteSuggestions ||
                !searchState.searchData ||
                term.length < minLength
            ) {
                return [];
            }

            try {
                return searchAdapter.getAutocompleteSuggestions(
                    searchState.searchData,
                    term,
                    currentSource
                );
            } catch (error) {
                console.error('SearchData: getAutocompleteSuggestions error:', error);
                return [];
            }
        },
        [searchAdapter, searchState.searchData, currentSource]
    );

    return {
        // Utility functions
        refreshData,
        getAutocompleteSuggestions,

        // State indicators
        hasData: !!searchState.searchData,
        isDataLoading: searchState.isLoading,

        // Data access
        searchData: searchState.searchData,
        searchResults: searchState.searchResults,
    };
}
