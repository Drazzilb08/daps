import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to manage all effect chains and lifecycle management for search interface
 * Extracted from SearchInterface.jsx to improve maintainability and reduce complexity
 *
 * @param {Object} params - Configuration parameters
 * @param {Function} params.registerHeaderSearch - Function to register header search API
 * @param {Object} params.searchConfig - Search configuration object
 * @param {Function} params.setSearchTerm - Function to update search term (from useSearchState)
 * @param {Function} params.setIsSearching - Function to update searching state
 * @param {Function} params.setCurrentSource - Function to update current source
 * @param {Function} params.setCurrentView - Function to update current view
 * @param {Function} params.setCurrentSort - Function to update current sort
 * @param {Ref} params.searchInputRef - Ref to search input element
 * @param {boolean} params.showAutocomplete - Whether autocomplete is shown
 * @param {Ref} params.autocompleteRef - Ref to autocomplete dropdown
 * @param {Function} params.closeAutocomplete - Function to close autocomplete
 * @param {Function} params.onMobileCollapse - Function to collapse mobile search
 * @param {Ref} params.headerSearchRef - Ref to header search container
 * @param {Function} params.updateAutocompleteSuggestions - Function to update autocomplete
 * @returns {Object} Effects state and handlers
 */
export function useSearchEffects({
    registerHeaderSearch = null,
    searchConfig = null,
    setSearchTerm = null,
    setIsSearching = null,
    setCurrentSource = null,
    setCurrentView = null,
    setCurrentSort = null,
    searchInputRef = null,
    showAutocomplete = false,
    autocompleteRef = null,
    closeAutocomplete = null,
    onMobileCollapse = null,
    headerSearchRef = null,
    updateAutocompleteSuggestions = null,
} = {}) {
    const location = useLocation();

    // State for effects management
    const [inputKey, setInputKey] = useState(() => `search-${location.pathname}-${Date.now()}`);
    const [showTooltips, setShowTooltips] = useState({});

    // Tooltip helper
    const setTooltip = useCallback((key, show) => {
        setShowTooltips(prev => ({ ...prev, [key]: show }));
    }, []);

    // Register with HeaderSearchProvider - run only once
    useEffect(() => {
        if (!registerHeaderSearch) return;

        const headerSearchAPI = {
            updateSearchTerm: term => setSearchTerm && setSearchTerm(term),
            updateView: view => setCurrentView && setCurrentView(view),
            updateSource: source => setCurrentSource && setCurrentSource(source),
            updateSearching: searching => setIsSearching && setIsSearching(searching),
        };

        registerHeaderSearch(headerSearchAPI);
    }, [registerHeaderSearch, setSearchTerm, setIsSearching, setCurrentSource, setCurrentView]);

    // Initialize with current search config when it becomes available
    useEffect(() => {
        if (searchConfig) {
            if (setCurrentSource) setCurrentSource(searchConfig.defaultSource);
            if (setCurrentView) setCurrentView(searchConfig.defaultView || 'grid');
            if (setCurrentSort) setCurrentSort(searchConfig.defaultSort || 'alpha');
        }
    }, [searchConfig, setCurrentSource, setCurrentView, setCurrentSort]);

    // Prevent browser autocomplete by clearing search term and regenerating input key on location change
    useEffect(() => {
        // Clear any existing search term to prevent browser form restoration
        if (setSearchTerm) setSearchTerm('');
        // Generate new unique key to force React to create a fresh input element
        setInputKey(`search-${location.pathname}-${Date.now()}`);

        // Additional safeguard: programmatically clear the input field value after a short delay
        const clearInputTimeout = setTimeout(() => {
            if (searchInputRef?.current && searchInputRef.current.value) {
                searchInputRef.current.value = '';
            }
        }, 50);

        return () => clearTimeout(clearInputTimeout);
    }, [location.pathname, setSearchTerm, searchInputRef]);

    // Handle autocomplete - delegate to useSearchState hook
    useEffect(() => {
        if (updateAutocompleteSuggestions) {
            updateAutocompleteSuggestions();
        }
    }, [updateAutocompleteSuggestions]);

    // Handle click outside autocomplete to close it
    useEffect(() => {
        if (!showAutocomplete) return;

        const handleClickOutside = e => {
            if (
                autocompleteRef?.current &&
                !autocompleteRef.current.contains(e.target) &&
                searchInputRef?.current &&
                !searchInputRef.current.contains(e.target)
            ) {
                if (closeAutocomplete) closeAutocomplete();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showAutocomplete, autocompleteRef, searchInputRef, closeAutocomplete]);

    // Handle click outside mobile search area to close it
    useEffect(() => {
        const handleClickOutsideMobileSearch = e => {
            // Don't close if clicking on popover content (which is rendered in portals)
            const clickedElement = e.target;

            // Check if click is on a popover element
            const isPopoverClick =
                clickedElement.closest('.popover') ||
                clickedElement.closest('[role="dialog"]') ||
                clickedElement.closest('.btn-tooltip');

            // Check if click is on autocomplete dropdown
            const isAutocompleteClick = clickedElement.closest('.header-search__autocomplete');

            if (isPopoverClick || isAutocompleteClick) {
                return; // Don't close mobile search for popover/autocomplete interactions
            }

            // Close mobile search if clicking outside the header search area
            if (
                headerSearchRef?.current &&
                !headerSearchRef.current.contains(e.target) &&
                onMobileCollapse
            ) {
                onMobileCollapse();
            }
        };

        // Add small delay to avoid immediate closure when opening
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutsideMobileSearch);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutsideMobileSearch);
        };
    }, [onMobileCollapse, headerSearchRef]);

    return {
        // State values
        inputKey,
        showTooltips,

        // Handlers
        setTooltip,
    };
}

export default useSearchEffects;
