import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSearchCoordinator } from '../../contexts/SearchCoordinatorProvider';
import { getSearchPlaceholder, useSearchControls } from '../useSearchControls';
import { ASSETS_SEARCH_SCHEMA } from '../../pages/AssetsSearch';
import { GDRIVE_SEARCH_SCHEMA } from '../../pages/GdriveSearch';
import { MEDIA_SEARCH_SCHEMA } from '../../pages/MediaSearch';
import { useSearchState } from './useSearchState';
import { useInstancesData } from './useInstancesData';
import { useSearchEffects } from './useSearchEffects';

/**
 * Custom hook that manages all search interface functionality
 * Extracted from SearchInterface.jsx to reduce complexity and improve maintainability
 * Combines schema resolution, context integration, and hook composition
 *
 * @param {Function} onMobileCollapse - Function to collapse mobile search
 * @param {Function} onSearchInputFocus - Function called when search input receives focus
 * @param {Function} onSearchInputBlur - Function called when search input loses focus
 * @returns {Object} All search state, handlers, and configuration
 */
export function useSearchInterface({ onMobileCollapse, onSearchInputFocus, onSearchInputBlur }) {
    const location = useLocation();
    const headerSearchContext = useSearchCoordinator();

    // Get schema based on current route
    const getPageSchema = useCallback(() => {
        if (location.pathname.startsWith('/media/search')) {
            return MEDIA_SEARCH_SCHEMA;
        }
        if (location.pathname.startsWith('/poster/search/assets')) {
            return ASSETS_SEARCH_SCHEMA;
        }
        if (location.pathname.startsWith('/poster/search/gdrive')) {
            return GDRIVE_SEARCH_SCHEMA;
        }
        return null;
    }, [location.pathname]);

    const pageSchema = getPageSchema();

    // Extract context values
    const {
        searchAdapter,
        searchConfig,
        executeHeaderSearch,
        changeSource,
        changeView,
        changeSort,
        changeFilter,
        executeRefresh,
        registerHeaderSearch,
        isRefreshing,
    } = headerSearchContext;

    // Use schema-driven controls
    const schemaControls = useSearchControls(pageSchema, searchConfig, {
        changeSource,
        changeView,
        changeSort,
        changeFilter,
    });

    // Local state for header search - must be initialized before hooks that depend on setters
    const [, setCurrentView] = useState('grid');
    const [, setCurrentSource] = useState(null);
    const [, setCurrentSort] = useState('alpha');

    // Refs for DOM elements - must be initialized before hooks that depend on them
    const searchButtonRef = useRef(null);
    const clearButtonRef = useRef(null);
    const headerSearchRef = useRef(null);

    // Use extracted useSearchState hook
    const searchStateResults = useSearchState({
        searchAdapter,
        executeHeaderSearch,
        onMobileCollapse,
    });

    // Use extracted useInstancesData hook
    const instancesDataResults = useInstancesData({
        executeRefresh,
    });

    // Use extracted useSearchEffects hook
    const effectsResults = useSearchEffects({
        registerHeaderSearch,
        searchConfig,
        setSearchTerm: searchStateResults.setSearchTerm,
        setIsSearching: searchStateResults.setIsSearching,
        setCurrentSource,
        setCurrentView,
        setCurrentSort,
        searchInputRef: searchStateResults.searchInputRef,
        showAutocomplete: searchStateResults.showAutocomplete,
        autocompleteRef: searchStateResults.autocompleteRef,
        closeAutocomplete: searchStateResults.closeAutocomplete,
        onMobileCollapse,
        headerSearchRef,
        updateAutocompleteSuggestions: searchStateResults.updateAutocompleteSuggestions,
    });

    // Create focus/blur handlers with autocomplete logic
    const handleInputFocus = useCallback(() => {
        const { searchTerm, autocompleteSuggestions, setShowAutocomplete } = searchStateResults;

        // Show autocomplete if suggestions exist
        if (searchTerm.length >= 2 && autocompleteSuggestions.length > 0) {
            setShowAutocomplete(true);
        }
        // Trigger progressive disclosure of controls
        if (onSearchInputFocus) {
            onSearchInputFocus();
        }
    }, [searchStateResults, onSearchInputFocus]);

    const handleInputBlur = useCallback(() => {
        // Delay blur to allow for interactions with controls
        setTimeout(() => {
            if (onSearchInputBlur) {
                onSearchInputBlur();
            }
        }, 150);
    }, [onSearchInputBlur]);

    // Get current page placeholder from schema
    const placeholder = getSearchPlaceholder(location.pathname);

    return {
        // Location and schema
        location,
        pageSchema,
        placeholder,

        // Context and configuration
        searchConfig,
        schemaControls,
        isRefreshing,

        // Refs
        searchButtonRef,
        clearButtonRef,
        headerSearchRef,

        // Search state (from useSearchState)
        ...searchStateResults,

        // Instances data (from useInstancesData)
        ...instancesDataResults,

        // Effects results (from useSearchEffects)
        ...effectsResults,

        // Focus/blur handlers
        handleInputFocus,
        handleInputBlur,
    };
}

export default useSearchInterface;
