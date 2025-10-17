import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook to manage search state and autocomplete functionality
 * Extracted from SearchInterface.jsx to improve maintainability and reduce complexity
 *
 * @param {Object} params - Configuration parameters
 * @param {string} params.initialSearchTerm - Initial search term value
 * @param {Object} params.searchAdapter - Search adapter with getAutocompleteSuggestions method
 * @param {Function} params.executeHeaderSearch - Function to execute search
 * @param {Function} params.onMobileCollapse - Function to collapse mobile search
 * @returns {Object} Search state and handlers
 */
export function useSearchState({
    initialSearchTerm = '',
    searchAdapter = null,
    executeHeaderSearch = null,
    onMobileCollapse = null,
} = {}) {
    // Search term state
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [isSearching, setIsSearching] = useState(false);

    // Autocomplete state
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

    // Refs for DOM elements
    const searchInputRef = useRef(null);
    const autocompleteRef = useRef();

    /**
     * Handle search execution
     */
    const handleSearch = useCallback(() => {
        if (!executeHeaderSearch) return;

        // Always execute search, even for empty/blank terms to return all results
        executeHeaderSearch(searchTerm.trim());
        setShowAutocomplete(false);

        // Auto-close mobile search after search execution if on mobile
        if (window.innerWidth <= 768 && onMobileCollapse) {
            onMobileCollapse();
        }
    }, [searchTerm, executeHeaderSearch, onMobileCollapse]);

    /**
     * Handle clear search
     */
    const handleClear = useCallback(() => {
        setSearchTerm('');
        setShowAutocomplete(false);
        if (executeHeaderSearch) {
            executeHeaderSearch('');
        }
    }, [executeHeaderSearch]);

    /**
     * Handle autocomplete suggestion selection
     */
    const selectSuggestion = useCallback(
        suggestion => {
            setSearchTerm(suggestion.title);
            setShowAutocomplete(false);
            setSelectedSuggestionIndex(-1);

            // Pass exact match options to filter to this specific item
            if (executeHeaderSearch) {
                setTimeout(
                    () =>
                        executeHeaderSearch(suggestion.title, {
                            exactMatch: true,
                            suggestionId: suggestion.id,
                            suggestionData: suggestion,
                        }),
                    100
                );
            }
        },
        [executeHeaderSearch]
    );

    /**
     * Handle key navigation for autocomplete
     */
    const handleKeyDown = useCallback(
        e => {
            if (showAutocomplete && autocompleteSuggestions.length > 0) {
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev =>
                            prev < autocompleteSuggestions.length - 1 ? prev + 1 : -1
                        );
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev =>
                            prev > -1 ? prev - 1 : autocompleteSuggestions.length - 1
                        );
                        break;
                    case 'Enter':
                        if (selectedSuggestionIndex >= 0) {
                            e.preventDefault();
                            const suggestion = autocompleteSuggestions[selectedSuggestionIndex];
                            selectSuggestion(suggestion);
                            return;
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        setShowAutocomplete(false);
                        setSelectedSuggestionIndex(-1);
                        return;
                }
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        },
        [
            showAutocomplete,
            autocompleteSuggestions,
            selectedSuggestionIndex,
            handleSearch,
            selectSuggestion,
        ]
    );

    /**
     * Update autocomplete suggestions based on search term
     */
    const updateAutocompleteSuggestions = useCallback(() => {
        if (!searchAdapter?.getAutocompleteSuggestions || !searchTerm || searchTerm.length < 2) {
            setAutocompleteSuggestions([]);
            setShowAutocomplete(false);
            return;
        }

        try {
            const suggestions = searchAdapter.getAutocompleteSuggestions(searchTerm);
            setAutocompleteSuggestions(suggestions);
            setShowAutocomplete(suggestions.length > 0);
            setSelectedSuggestionIndex(-1);
        } catch (error) {
            console.warn('Header autocomplete error:', error);
            setAutocompleteSuggestions([]);
            setShowAutocomplete(false);
        }
    }, [searchTerm, searchAdapter]);

    /**
     * Handle autocomplete focus management
     */
    const handleAutocompleteItemHover = useCallback(index => {
        setSelectedSuggestionIndex(index);
    }, []);

    /**
     * Close autocomplete dropdown
     */
    const closeAutocomplete = useCallback(() => {
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
    }, []);

    /**
     * Show autocomplete if suggestions exist and term is valid
     */
    const showAutocompleteDropdown = useCallback(() => {
        if (searchTerm.length >= 2 && autocompleteSuggestions.length > 0) {
            setShowAutocomplete(true);
        }
    }, [searchTerm.length, autocompleteSuggestions.length]);

    return {
        // State values
        searchTerm,
        isSearching,
        autocompleteSuggestions,
        showAutocomplete,
        selectedSuggestionIndex,

        // Refs
        searchInputRef,
        autocompleteRef,

        // State setters (for external control)
        setSearchTerm,
        setIsSearching,
        setShowAutocomplete,

        // Handlers
        handleSearch,
        handleClear,
        handleKeyDown,
        selectSuggestion,
        handleAutocompleteItemHover,
        closeAutocomplete,
        showAutocompleteDropdown,
        updateAutocompleteSuggestions,
    };
}

export default useSearchState;
