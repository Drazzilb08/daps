import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const HeaderSearchContext = createContext();

/**
 * HeaderSearchProvider - Manages state and communication between header search and page search components
 * Provides a centralized way to coordinate search functionality across header and page interfaces
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that need access to search context
 * @returns {JSX.Element} Context provider wrapping children
 */
export function HeaderSearchProvider({ children }) {
    const [isHeaderSearchActive, setIsHeaderSearchActive] = useState(false);
    const [searchAdapter, setSearchAdapter] = useState(null);
    const [searchConfig, setSearchConfig] = useState(null);

    const pageSearchRef = useRef(null);
    const headerSearchRef = useRef(null);

    const location = useLocation();

    /**
     * Registers page-level search component with the context
     * @param {Object} searchCore - Search core API
     * @param {Object} config - Search configuration
     */
    const registerPageSearch = useCallback((searchCore, config) => {
        pageSearchRef.current = searchCore;
        setSearchAdapter(config.adapter);
        setSearchConfig(config);
    }, []);

    /**
     * Registers header search component with the context
     * @param {Object} headerSearch - Header search API
     */
    const registerHeaderSearch = useCallback(headerSearch => {
        headerSearchRef.current = headerSearch;
    }, []);

    /**
     * Checks if current page supports header search functionality
     * @returns {boolean} Whether current page is a search page
     */
    const isSearchPage = useCallback(() => {
        const searchPages = ['/media/search', '/poster/search/assets', '/poster/search/gdrive'];
        return searchPages.some(page => location.pathname.startsWith(page));
    }, [location.pathname]);

    /**
     * Executes search from header, delegating to page search component
     * @param {string} searchTerm - Search query
     * @param {Object} [options={}] - Additional search options
     */
    const executeHeaderSearch = useCallback((searchTerm, options = {}) => {
        if (pageSearchRef.current) {
            pageSearchRef.current.executeSearch(searchTerm, options);
        }
    }, []);

    /**
     * Syncs search term between header and page components
     * @param {string} searchTerm - Search term to sync
     */
    const syncSearchTerm = useCallback(searchTerm => {
        if (headerSearchRef.current) {
            headerSearchRef.current.updateSearchTerm(searchTerm);
        }
    }, []);

    /**
     * Changes search source from header interface
     * @param {string} newSource - New source to switch to
     */
    const changeSource = useCallback(newSource => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeSource(newSource);
        }
    }, []);

    /**
     * Changes view mode from header interface
     * @param {string} newView - New view mode (grid/list)
     */
    const changeView = useCallback(newView => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeView(newView);
        }
    }, []);

    /**
     * Changes sort order from header interface
     * @param {string} newSort - New sort option
     */
    const changeSort = useCallback(newSort => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeSort(newSort);
        }
    }, []);

    /**
     * Changes filter from header interface
     * @param {string} filterKey - Filter key to change
     * @param {*} value - New filter value
     */
    const changeFilter = useCallback((filterKey, value) => {
        if (pageSearchRef.current) {
            pageSearchRef.current.changeFilter(filterKey, value);
        }
    }, []);

    /**
     * Executes refresh operation from header interface
     * @param {Object} options - Refresh options
     */
    const executeRefresh = useCallback(options => {
        if (pageSearchRef.current) {
            pageSearchRef.current.executeRefresh(options);
        }
    }, []);

    const value = {
        isHeaderSearchActive,
        setIsHeaderSearchActive,
        searchAdapter,
        searchConfig,

        registerPageSearch,
        registerHeaderSearch,

        isSearchPage,

        executeHeaderSearch,
        syncSearchTerm,
        changeSource,
        changeView,
        changeSort,
        changeFilter,
        executeRefresh,

        pageSearchRef,
        headerSearchRef,
    };

    return <HeaderSearchContext.Provider value={value}>{children}</HeaderSearchContext.Provider>;
}

/**
 * Hook to access header search context
 * @returns {Object} Header search context value
 * @throws {Error} When used outside HeaderSearchProvider
 */
export function useHeaderSearch() {
    const context = useContext(HeaderSearchContext);
    if (!context) {
        throw new Error('useHeaderSearch must be used within a HeaderSearchProvider');
    }
    return context;
}

export default HeaderSearchProvider;
