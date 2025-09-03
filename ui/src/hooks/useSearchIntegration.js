/**
 * Search Integration Hook
 * Manages integration between SearchCore and header search components
 * Handles registration and API coordination for header search functionality
 */

import { useEffect } from 'react';
import { useSearchCoordinator } from '../contexts/SearchCoordinatorProvider';

/**
 * Custom hook for managing search integration between page and header components
 * Handles registration of SearchCore with the SearchCoordinator and API construction
 * @param {Object} options - Configuration options
 * @param {Object} options.searchAdapter - Search adapter instance
 * @param {Array} options.sources - Available search sources
 * @param {Array} options.filters - Available search filters
 * @param {Array} options.sortOptions - Available sort options
 * @param {string} options.defaultView - Default view mode
 * @param {string} options.defaultSort - Default sort option
 * @param {string} options.currentSource - Current selected source
 * @param {boolean} options.showRefreshControls - Whether refresh controls are available
 * @param {Function} options.executeSearchWithTerm - Function to execute search with term
 * @param {Function} options.changeSource - Function to change source
 * @param {Function} options.updateView - Function to update view mode
 * @param {Function} options.updateSort - Function to update sort option
 * @param {Function} options.updateFilter - Function to update filter
 * @param {Function} options.onRefresh - Refresh handler callback
 * @returns {Object} Integration state and utilities
 */
export function useSearchIntegration({
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
    onRefresh,
}) {
    const { registerPageSearch } = useSearchCoordinator();

    // ===== HEADER SEARCH INTEGRATION =====
    // Register this SearchCore with the SearchCoordinatorProvider
    useEffect(() => {
        if (!registerPageSearch) return;

        // Construct SearchCore API for header integration
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

        // Construct search configuration for header
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

        // Register with coordinator
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
        onRefresh,
    ]);

    // Return utilities (currently minimal, but extensible)
    return {
        isRegistered: !!registerPageSearch,
    };
}
