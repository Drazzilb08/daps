import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Search Coordinator context for managing unified search state
 * Handles search across different pages, history, and configurations
 */

// Search types
export const SEARCH_TYPES = {
    MEDIA: 'media',
    LOGS: 'logs',
    SETTINGS: 'settings',
    MODULES: 'modules',
    GLOBAL: 'global',
};

// Search status
export const SEARCH_STATUS = {
    IDLE: 'idle',
    SEARCHING: 'searching',
    SUCCESS: 'success',
    ERROR: 'error',
    NO_RESULTS: 'no_results',
};

// Default debounce delay
const DEFAULT_DEBOUNCE_DELAY = 300;

// Max history items
const MAX_HISTORY_ITEMS = 50;

// Storage key for search history
const SEARCH_HISTORY_KEY = 'daps-search-history';

// Create context
const SearchCoordinatorContext = createContext();

/**
 * Custom hook to use search coordinator context
 * @returns {Object} Search coordinator context value with methods and state
 */
export const useSearchCoordinator = () => {
    const context = useContext(SearchCoordinatorContext);
    if (!context) {
        throw new Error('useSearchCoordinator must be used within a SearchCoordinatorProvider');
    }
    return context;
};

/**
 * Load search history from localStorage
 * @returns {Array} Search history array
 */
const loadSearchHistory = () => {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Failed to load search history:', error);
        return [];
    }
};

/**
 * Save search history to localStorage
 * @param {Array} history - Search history to save
 */
const saveSearchHistory = history => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.warn('Failed to save search history:', error);
    }
};

/**
 * Search Coordinator Provider component
 * Manages global search state with history and debouncing
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} props.debounceDelay - Debounce delay in ms
 * @param {boolean} props.persistHistory - Whether to persist search history
 */
export const SearchCoordinatorProvider = ({
    children,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    persistHistory = true,
}) => {
    const [searchStates, setSearchStates] = useState({});
    const [searchHistory, setSearchHistory] = useState(() =>
        persistHistory ? loadSearchHistory() : []
    );
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [activeSearchType, setActiveSearchType] = useState(null);

    // Refs for debouncing
    const debounceTimeouts = useRef({});
    const searchCallbacks = useRef({});

    /**
     * Initialize search history
     */
    useEffect(() => {
        if (persistHistory && searchHistory.length === 0) {
            const history = loadSearchHistory();
            if (history.length > 0) {
                setSearchHistory(history);
            }
        }
    }, [persistHistory, searchHistory.length]);

    /**
     * Save search history when it changes
     */
    useEffect(() => {
        if (persistHistory && searchHistory.length > 0) {
            saveSearchHistory(searchHistory);
        }
    }, [searchHistory, persistHistory]);

    /**
     * Get search state for a specific type
     * @param {string} searchType - Type of search
     * @returns {Object} Search state object
     */
    const getSearchState = useCallback(
        searchType => {
            return (
                searchStates[searchType] || {
                    term: '',
                    status: SEARCH_STATUS.IDLE,
                    results: [],
                    totalCount: 0,
                    lastSearchTime: null,
                    error: null,
                }
            );
        },
        [searchStates]
    );

    /**
     * Set search state for a specific type
     * @param {string} searchType - Type of search
     * @param {Object} updates - State updates
     */
    const setSearchState = useCallback(
        (searchType, updates) => {
            setSearchStates(prev => ({
                ...prev,
                [searchType]: {
                    ...getSearchState(searchType),
                    ...updates,
                    lastSearchTime: Date.now(),
                },
            }));
        },
        [getSearchState]
    );

    /**
     * Add search term to history
     * @param {string} term - Search term to add
     * @param {string} searchType - Type of search
     */
    const addToHistory = useCallback((term, searchType) => {
        if (!term || term.length < 2) return;

        const historyItem = {
            term,
            searchType,
            timestamp: Date.now(),
            id: `${searchType}-${term}-${Date.now()}`,
        };

        setSearchHistory(prev => {
            // Remove duplicate if exists
            const filtered = prev.filter(
                item => !(item.term === term && item.searchType === searchType)
            );

            // Add to beginning and limit size
            const updated = [historyItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
            return updated;
        });
    }, []);

    /**
     * Clear search history for specific type or all
     * @param {string} searchType - Type to clear (optional)
     */
    const clearHistory = useCallback((searchType = null) => {
        if (searchType) {
            setSearchHistory(prev => prev.filter(item => item.searchType !== searchType));
        } else {
            setSearchHistory([]);
        }
    }, []);

    /**
     * Get search history for specific type or all
     * @param {string} searchType - Type to filter by (optional)
     * @param {number} limit - Max items to return
     * @returns {Array} Search history items
     */
    const getHistory = useCallback(
        (searchType = null, limit = 10) => {
            let history = searchHistory;

            if (searchType) {
                history = history.filter(item => item.searchType === searchType);
            }

            return history.slice(0, limit);
        },
        [searchHistory]
    );

    /**
     * Register search handler for a specific type
     * @param {string} searchType - Type of search
     * @param {Function} searchFunction - Function to handle search
     */
    const registerSearchHandler = useCallback((searchType, searchFunction) => {
        searchCallbacks.current[searchType] = searchFunction;
    }, []);

    /**
     * Unregister search handler
     * @param {string} searchType - Type of search
     */
    const unregisterSearchHandler = useCallback(searchType => {
        delete searchCallbacks.current[searchType];

        // Clear any pending debounce
        if (debounceTimeouts.current[searchType]) {
            clearTimeout(debounceTimeouts.current[searchType]);
            delete debounceTimeouts.current[searchType];
        }
    }, []);

    /**
     * Perform search with debouncing
     * @param {string} searchType - Type of search
     * @param {string} term - Search term
     * @param {Object} options - Search options
     */
    const search = useCallback(
        (searchType, term, options = {}) => {
            const {
                immediate = false,
                addToHistory: shouldAddToHistory = true,
                ...searchOptions
            } = options;

            // Update search state immediately
            setSearchState(searchType, {
                term,
                status: term ? SEARCH_STATUS.SEARCHING : SEARCH_STATUS.IDLE,
                error: null,
            });

            // Update global search if this is the active type
            if (activeSearchType === searchType) {
                setGlobalSearchTerm(term);
            }

            // Clear existing timeout
            if (debounceTimeouts.current[searchType]) {
                clearTimeout(debounceTimeouts.current[searchType]);
            }

            // If no term, clear results immediately
            if (!term) {
                setSearchState(searchType, {
                    term: '',
                    status: SEARCH_STATUS.IDLE,
                    results: [],
                    totalCount: 0,
                    error: null,
                });
                return;
            }

            // Execute search function
            const executeSearch = async () => {
                const searchFunction = searchCallbacks.current[searchType];

                if (!searchFunction) {
                    console.warn(`No search handler registered for type: ${searchType}`);
                    setSearchState(searchType, {
                        status: SEARCH_STATUS.ERROR,
                        error: `No search handler for ${searchType}`,
                    });
                    return;
                }

                try {
                    const results = await searchFunction(term, searchOptions);

                    // Check if this is still the current search
                    const currentState = getSearchState(searchType);
                    if (currentState.term !== term) {
                        return; // Search term has changed, ignore results
                    }

                    const status =
                        results.length === 0 ? SEARCH_STATUS.NO_RESULTS : SEARCH_STATUS.SUCCESS;

                    setSearchState(searchType, {
                        status,
                        results,
                        totalCount: results.length,
                        error: null,
                    });

                    // Add to history if successful and requested
                    if (shouldAddToHistory && status === SEARCH_STATUS.SUCCESS) {
                        addToHistory(term, searchType);
                    }
                } catch (error) {
                    console.error(`Search failed for ${searchType}:`, error);

                    setSearchState(searchType, {
                        status: SEARCH_STATUS.ERROR,
                        error: error.message || 'Search failed',
                        results: [],
                        totalCount: 0,
                    });
                }
            };

            // Execute immediately or with debounce
            if (immediate) {
                executeSearch();
            } else {
                debounceTimeouts.current[searchType] = setTimeout(executeSearch, debounceDelay);
            }
        },
        [
            activeSearchType,
            debounceDelay,
            addToHistory,
            getSearchState,
            setSearchState,
        ]
    );

    /**
     * Clear search results for specific type
     * @param {string} searchType - Type of search to clear
     */
    const clearSearch = useCallback(
        searchType => {
            // Clear debounce timeout
            if (debounceTimeouts.current[searchType]) {
                clearTimeout(debounceTimeouts.current[searchType]);
                delete debounceTimeouts.current[searchType];
            }

            // Clear search state
            setSearchState(searchType, {
                term: '',
                status: SEARCH_STATUS.IDLE,
                results: [],
                totalCount: 0,
                error: null,
            });

            // Clear global search if this was the active type
            if (activeSearchType === searchType) {
                setGlobalSearchTerm('');
            }
        },
        [activeSearchType, setSearchState]
    );

    /**
     * Set active search type (for global search coordination)
     * @param {string} searchType - Type to set as active
     */
    const setActiveSearch = useCallback(
        searchType => {
            setActiveSearchType(searchType);
            const currentState = getSearchState(searchType);
            setGlobalSearchTerm(currentState.term);
        },
        [getSearchState]
    );

    /**
     * Get suggestions based on search history
     * @param {string} searchType - Type of search
     * @param {string} partialTerm - Partial search term
     * @param {number} limit - Max suggestions to return
     * @returns {Array} Suggestion strings
     */
    const getSuggestions = useCallback(
        (searchType, partialTerm, limit = 5) => {
            if (!partialTerm || partialTerm.length < 1) return [];

            const lowerPartial = partialTerm.toLowerCase();

            return searchHistory
                .filter(
                    item =>
                        item.searchType === searchType &&
                        item.term.toLowerCase().includes(lowerPartial) &&
                        item.term.toLowerCase() !== lowerPartial
                )
                .map(item => item.term)
                .slice(0, limit);
        },
        [searchHistory]
    );

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            // Clear all debounce timeouts
            // eslint-disable-next-line react-hooks/exhaustive-deps
            const currentTimeouts = debounceTimeouts.current;
            Object.values(currentTimeouts).forEach(timeout => {
                clearTimeout(timeout);
            });
        };
    }, []);

    const contextValue = {
        // Search state
        searchStates,
        getSearchState,

        // Global state
        globalSearchTerm,
        activeSearchType,
        setActiveSearch,

        // Search operations
        search,
        clearSearch,
        registerSearchHandler,
        unregisterSearchHandler,

        // History
        searchHistory,
        addToHistory,
        clearHistory,
        getHistory,
        getSuggestions,

        // Utilities
        isSearching: searchType => getSearchState(searchType).status === SEARCH_STATUS.SEARCHING,
        hasResults: searchType => getSearchState(searchType).results.length > 0,
        hasError: searchType => getSearchState(searchType).status === SEARCH_STATUS.ERROR,

        // Constants
        searchTypes: SEARCH_TYPES,
        searchStatus: SEARCH_STATUS,
    };

    return (
        <SearchCoordinatorContext.Provider value={contextValue}>
            {children}
        </SearchCoordinatorContext.Provider>
    );
};

SearchCoordinatorProvider.propTypes = {
    children: PropTypes.node.isRequired,
    debounceDelay: PropTypes.number,
    persistHistory: PropTypes.bool,
};

/**
 * Hook for managing search state for a specific type
 * @param {string} searchType - Type of search to manage
 * @param {Function} searchFunction - Function to handle searches
 * @returns {Object} Search management object
 */
export const useSearch = (searchType, searchFunction) => {
    const {
        search,
        clearSearch,
        getSearchState,
        registerSearchHandler,
        unregisterSearchHandler,
        getSuggestions,
    } = useSearchCoordinator();

    // Register search handler on mount
    useEffect(() => {
        if (searchFunction) {
            registerSearchHandler(searchType, searchFunction);
        }

        return () => unregisterSearchHandler(searchType);
    }, [searchType, searchFunction, registerSearchHandler, unregisterSearchHandler]);

    const searchState = getSearchState(searchType);

    const performSearch = useCallback(
        (term, options = {}) => {
            search(searchType, term, options);
        },
        [search, searchType]
    );

    const clear = useCallback(() => {
        clearSearch(searchType);
    }, [clearSearch, searchType]);

    const suggestions = useCallback(
        (partialTerm, limit) => {
            return getSuggestions(searchType, partialTerm, limit);
        },
        [getSuggestions, searchType]
    );

    return {
        ...searchState,
        search: performSearch,
        clear,
        getSuggestions: suggestions,
        isSearching: searchState.status === SEARCH_STATUS.SEARCHING,
        hasResults: searchState.results.length > 0,
        hasError: searchState.status === SEARCH_STATUS.ERROR,
        isEmpty: searchState.status === SEARCH_STATUS.NO_RESULTS,
    };
};
