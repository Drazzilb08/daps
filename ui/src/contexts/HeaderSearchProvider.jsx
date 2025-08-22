import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const HeaderSearchContext = createContext();

/**
 * HeaderSearchProvider - Manages the state and communication between header search and page search
 */
export function HeaderSearchProvider({ children }) {
    // Core search state
    const [isHeaderSearchActive, setIsHeaderSearchActive] = useState(false);
    const [searchAdapter, setSearchAdapter] = useState(null);
    const [searchConfig, setSearchConfig] = useState(null);

    // Communication refs between header and page
    const pageSearchRef = useRef(null);
    const headerSearchRef = useRef(null);

    const location = useLocation();

    // Register the page-level search component
    const registerPageSearch = useCallback((searchCore, config) => {
        pageSearchRef.current = searchCore;
        setSearchAdapter(config.adapter);
        setSearchConfig(config);
    }, []);

    // Register the header search component
    const registerHeaderSearch = useCallback(headerSearch => {
        headerSearchRef.current = headerSearch;
    }, []);

    // Check if current page supports header search
    const isSearchPage = useCallback(() => {
        const searchPages = ['/media/search', '/poster/search/assets', '/poster/search/gdrive'];
        return searchPages.some(page => location.pathname.startsWith(page));
    }, [location.pathname]);

    // Execute search from header - delegates to page search
    const executeHeaderSearch = useCallback((searchTerm, options = {}) => {
        if (pageSearchRef.current) {
            pageSearchRef.current.executeSearch(searchTerm, options);
        }
    }, []);

    // Sync header search input with page search state
    const syncSearchTerm = useCallback(searchTerm => {
        if (headerSearchRef.current) {
            headerSearchRef.current.updateSearchTerm(searchTerm);
        }
    }, []);

    // Handle source changes from header
    const changeSource = useCallback(newSource => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeSource(newSource);
        }
    }, []);

    // Handle view changes from header
    const changeView = useCallback(newView => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeView(newView);
        }
    }, []);

    // Handle sort changes from header
    const changeSort = useCallback(newSort => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeSort(newSort);
        }
    }, []);

    // Handle filter changes from header
    const changeFilter = useCallback((filterKey, value) => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeFilter(filterKey, value);
        }
    }, []);

    // Handle refresh from header
    const executeRefresh = useCallback(options => {
        if (pageSearchRef.current) {
            pageSearchRef.current.executeRefresh(options);
        }
    }, []);

    const value = {
        // State
        isHeaderSearchActive,
        setIsHeaderSearchActive,
        searchAdapter,
        searchConfig,

        // Registration
        registerPageSearch,
        registerHeaderSearch,

        // Page detection
        isSearchPage,

        // Search operations
        executeHeaderSearch,
        syncSearchTerm,
        changeSource,
        changeView,
        changeSort,
        changeFilter,
        executeRefresh,

        // Refs for direct communication
        pageSearchRef,
        headerSearchRef,
    };

    return <HeaderSearchContext.Provider value={value}>{children}</HeaderSearchContext.Provider>;
}

export function useHeaderSearch() {
    const context = useContext(HeaderSearchContext);
    if (!context) {
        throw new Error('useHeaderSearch must be used within a HeaderSearchProvider');
    }
    return context;
}

export default HeaderSearchProvider;
