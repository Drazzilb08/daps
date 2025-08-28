import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SearchCoordinatorContext = createContext();

/**
 * SearchCoordinatorProvider - Manages state and communication between header search and page search components
 * Provides a centralized way to coordinate search functionality across header and page interfaces
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that need access to search context
 * @returns {JSX.Element} Context provider wrapping children
 */
export function SearchCoordinatorProvider({ children }) {
    const [isHeaderSearchActive, setIsHeaderSearchActive] = useState(false);
    const [searchAdapter, setSearchAdapter] = useState(null);
    const [searchConfig, setSearchConfig] = useState(null);
    const [isRefreshing, setIsRefreshingState] = useState(false);

    // Memoize setIsRefreshing to prevent infinite loops
    const setIsRefreshing = useCallback(value => {
        setIsRefreshingState(value);
    }, []);

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
        // Only update searchAdapter if it's actually different
        setSearchAdapter(prevAdapter => {
            if (prevAdapter !== config.adapter) {
                return config.adapter;
            }
            return prevAdapter;
        });
        // Only update searchConfig if it's actually different to prevent infinite loops
        setSearchConfig(prevConfig => {
            if (!prevConfig || JSON.stringify(prevConfig) !== JSON.stringify(config)) {
                return config;
            }
            return prevConfig;
        });
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
        isRefreshing,
        setIsRefreshing,

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

    return (
        <SearchCoordinatorContext.Provider value={value}>
            {children}
        </SearchCoordinatorContext.Provider>
    );
}

/**
 * Hook to access search coordinator context
 * @returns {Object} Search coordinator context value
 * @throws {Error} When used outside SearchCoordinatorProvider
 */
export function useSearchCoordinator() {
    const context = useContext(SearchCoordinatorContext);
    if (!context) {
        throw new Error('useSearchCoordinator must be used within a SearchCoordinatorProvider');
    }
    return context;
}

export default SearchCoordinatorProvider;
