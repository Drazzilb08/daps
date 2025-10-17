/**
 * API Data Hook
 * Provides standardized data fetching, caching, and error handling for DAPS components
 * Integrates seamlessly with existing ToastProvider and API utilities
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useToast } from '../components/providers/ToastProvider';

/**
 * Custom hook for standardized API data fetching
 *
 * Provides consistent loading states, error handling, and caching for API operations.
 * Integrates with DAPS ToastProvider for user feedback and existing API utilities.
 *
 * @param {Object} config - Hook configuration options
 * @param {Function} config.apiFunction - API function to execute (from utils/api.js)
 * @param {Array} [config.params=[]] - Parameters to pass to API function
 * @param {Object} [config.options={}] - Additional options
 * @param {Function} [config.options.transform] - Transform function for response data
 * @param {boolean} [config.options.immediate=true] - Execute immediately on mount
 * @param {boolean} [config.options.showErrorToast=true] - Show error notifications
 * @param {boolean} [config.options.showSuccessToast=false] - Show success notifications
 * @param {string} [config.options.successMessage] - Custom success message
 * @param {string} [config.options.errorMessage] - Custom error message
 * @param {Array} [config.dependencies=[]] - Dependencies for re-execution
 * @param {number} [config.options.retryAttempts=0] - Number of retry attempts on failure
 * @param {number} [config.options.retryDelay=1000] - Delay between retry attempts (ms)
 *
 * @returns {Object} API data state and control functions
 * @returns {*} data - Current data from API
 * @returns {boolean} isLoading - Loading state indicator
 * @returns {Error|null} error - Current error state
 * @returns {Function} execute - Manual execution function
 * @returns {Function} retry - Retry last failed request
 * @returns {Function} reset - Reset all state to initial values
 * @returns {boolean} hasExecuted - Whether the API has been called at least once
 *
 * @example
 * // Basic data fetching with automatic execution
 * const { data: config, isLoading, error } = useApiData({
 *   apiFunction: fetchConfig,
 *   params: ['instances'],
 * });
 *
 * @example
 * // Manual execution with success notification
 * const { execute, isLoading } = useApiData({
 *   apiFunction: postConfig,
 *   options: {
 *     immediate: false,
 *     showSuccessToast: true,
 *     successMessage: 'Configuration saved successfully!',
 *   },
 * });
 *
 * @example
 * // Data transformation and custom error handling
 * const { data: instances } = useApiData({
 *   apiFunction: fetchInstances,
 *   options: {
 *     transform: (data) => Object.keys(data).length,
 *     errorMessage: 'Failed to load service instances',
 *   },
 * });
 *
 * @example
 * // With retry logic and dependencies
 * const { data, retry, hasExecuted } = useApiData({
 *   apiFunction: fetchJobStats,
 *   dependencies: [refreshTrigger],
 *   options: {
 *     retryAttempts: 3,
 *     retryDelay: 2000,
 *   },
 * });
 */
export function useApiData({ apiFunction, params = [], options = {}, dependencies = [] }) {
    // ===== CONFIGURATION =====
    const {
        transform,
        immediate = true,
        showErrorToast = true,
        showSuccessToast = false,
        successMessage,
        errorMessage,
        retryAttempts = 0,
        retryDelay = 1000,
    } = options;

    // ===== STATE MANAGEMENT =====
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasExecuted, setHasExecuted] = useState(false);

    // ===== DEPENDENCIES =====
    const toast = useToast();
    const lastParamsRef = useRef(params);
    const retryCountRef = useRef(0);
    const abortControllerRef = useRef(null);

    // ===== CORE EXECUTION FUNCTION =====
    const executeRequest = useCallback(
        async (executeParams = params, isRetry = false) => {
            // Validate API function
            if (typeof apiFunction !== 'function') {
                console.error('useApiData: apiFunction must be a function');
                return;
            }

            // Cancel any pending request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller for this request
            abortControllerRef.current = new AbortController();

            try {
                setIsLoading(true);
                if (!isRetry) {
                    setError(null);
                    retryCountRef.current = 0;
                }

                // Execute API function with parameters
                const result = await apiFunction(...executeParams);

                // Check if request was aborted
                if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
                    return;
                }

                // Transform data if transform function provided
                const processedData = transform ? transform(result) : result;

                setData(processedData);
                setError(null);
                setHasExecuted(true);

                // Show success notification if configured
                if (showSuccessToast) {
                    const message = successMessage || 'Operation completed successfully';
                    toast.success(message);
                }

                return processedData;
            } catch (err) {
                // Check if request was aborted
                if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
                    return;
                }

                console.error('useApiData execution error:', err);
                setError(err);

                // Handle retry logic
                if (!isRetry && retryAttempts > 0 && retryCountRef.current < retryAttempts) {
                    retryCountRef.current += 1;

                    setTimeout(() => {
                        executeRequest(executeParams, true);
                    }, retryDelay);
                    return;
                }

                // Show error notification if configured
                if (showErrorToast) {
                    const message = errorMessage || err.message || 'An error occurred';
                    toast.error(message);
                }

                throw err;
            } finally {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        },
        [
            apiFunction,
            params,
            transform,
            showErrorToast,
            showSuccessToast,
            successMessage,
            errorMessage,
            retryAttempts,
            retryDelay,
            toast,
        ]
    );

    // ===== PUBLIC INTERFACE FUNCTIONS =====

    /**
     * Execute the API request manually
     * @param {Array} [customParams] - Custom parameters for this execution
     * @returns {Promise<*>} API response data
     */
    const execute = useCallback(
        async customParams => {
            const executeParams = customParams || params;
            lastParamsRef.current = executeParams;
            return await executeRequest(executeParams);
        },
        [executeRequest, params]
    );

    /**
     * Retry the last failed request
     * @returns {Promise<*>} API response data
     */
    const retry = useCallback(async () => {
        return await executeRequest(lastParamsRef.current);
    }, [executeRequest]);

    /**
     * Reset all state to initial values
     */
    const reset = useCallback(() => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setData(null);
        setIsLoading(false);
        setError(null);
        setHasExecuted(false);
        retryCountRef.current = 0;
    }, []);

    // ===== AUTOMATIC EXECUTION =====
    useEffect(() => {
        if (immediate && apiFunction) {
            execute();
        }
    }, [immediate, apiFunction, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

    // ===== CLEANUP =====
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // ===== RETURN INTERFACE =====
    return {
        // Data state
        data,
        isLoading,
        error,
        hasExecuted,

        // Control functions
        execute,
        retry,
        reset,

        // Utility getters
        get isSuccess() {
            return hasExecuted && !error && !isLoading;
        },
        get isEmpty() {
            return hasExecuted && !error && !isLoading && !data;
        },
    };
}

/**
 * Specialized hook for API mutations (POST, PUT, DELETE operations)
 *
 * Optimized for operations that modify data rather than fetch it.
 * Provides consistent patterns for form submissions and data updates.
 *
 * @param {Function} apiFunction - API function to execute
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.showSuccessToast=true] - Show success notification
 * @param {string} [options.successMessage] - Custom success message
 * @param {Function} [options.onSuccess] - Success callback function
 * @param {Function} [options.onError] - Error callback function
 * @param {Function} [options.transform] - Transform function for response data
 *
 * @returns {Object} Mutation state and control functions
 *
 * @example
 * // Form submission with success callback
 * const { mutate, isLoading } = useApiMutation(postConfig, {
 *   successMessage: 'Settings saved!',
 *   onSuccess: (data) => {
 *     // Refresh form or navigate
 *   },
 * });
 *
 * @example
 * // Delete operation with confirmation
 * const { mutate: deleteItem } = useApiMutation(deleteInstance, {
 *   successMessage: 'Instance deleted successfully',
 *   onSuccess: () => refreshInstanceList(),
 * });
 */
export function useApiMutation(apiFunction, options = {}) {
    const { showSuccessToast = true, onSuccess, onError, ...restOptions } = options;

    const { execute, isLoading, error, data, hasExecuted } = useApiData({
        apiFunction,
        options: {
            immediate: false,
            showSuccessToast,
            ...restOptions,
        },
    });

    /**
     * Execute the mutation with provided data
     * @param {...any} args - Arguments to pass to API function
     * @returns {Promise<*>} API response data
     */
    const mutate = useCallback(
        async (...args) => {
            try {
                const result = await execute(args);

                // Call success callback if provided
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess(result, ...args);
                }

                return result;
            } catch (err) {
                // Call error callback if provided
                if (onError && typeof onError === 'function') {
                    onError(err, ...args);
                }

                throw err;
            }
        },
        [execute, onSuccess, onError]
    );

    return {
        mutate,
        isLoading,
        error,
        data,
        hasExecuted,
        isSuccess: hasExecuted && !error && !isLoading,
    };
}

/**
 * Hook for managing multiple related API calls
 *
 * This hook is designed to work with a fixed set of queries defined at the component level.
 * For dynamic queries, consider using individual useApiData hooks or a different pattern.
 *
 * @param {Object} queries - Object mapping query names to API configurations
 *
 * @returns {Object} Combined state for all queries
 *
 * @example
 * // Load multiple data sources with fixed query structure
 * const queries = useMemo(() => ({
 *   config: { apiFunction: fetchConfig },
 *   instances: { apiFunction: fetchInstances },
 *   stats: { apiFunction: fetchJobStats },
 * }), []);
 *
 * const { data, isLoading, errors } = useApiQueries(queries);
 *
 * // Access individual results
 * const config = data.config;
 * const instances = data.instances;
 * const isConfigLoading = isLoading.config;
 *
 * @deprecated This hook has limitations with React's rules of hooks.
 * Consider using individual useApiData hooks for better flexibility and safety.
 *
 * @example
 * // Recommended approach for multiple API calls
 * const configQuery = useApiData({ apiFunction: fetchConfig });
 * const instancesQuery = useApiData({ apiFunction: fetchInstances });
 * const statsQuery = useApiData({ apiFunction: fetchJobStats });
 *
 * const isAnyLoading = configQuery.isLoading || instancesQuery.isLoading || statsQuery.isLoading;
 */
export function useApiQueries(queries) {
    // Create a stable reference for the queries to prevent unnecessary re-renders
    const stableQueries = useMemo(() => queries, [queries]);

    // Use individual state management instead of dynamic hook calls
    const [results, setResults] = useState({});
    const [combinedData, setCombinedData] = useState({});
    const [combinedLoading, setCombinedLoading] = useState({});
    const [combinedErrors, setCombinedErrors] = useState({});

    // Track initialization
    const [initialized, setInitialized] = useState(false);
    const queryKeysRef = useRef([]);

    // Initialize queries only once when the component mounts or queries change
    useEffect(() => {
        const queryKeys = Object.keys(stableQueries);

        // Check if queries structure has changed
        const keysChanged = JSON.stringify(queryKeys) !== JSON.stringify(queryKeysRef.current);

        if (!initialized || keysChanged) {
            console.warn(
                'useApiQueries: This hook has limitations due to React rules of hooks. ' +
                    'Consider using individual useApiData hooks for better safety and flexibility.'
            );

            queryKeysRef.current = queryKeys;
            setInitialized(true);

            // Initialize empty states for all query keys
            const initialData = {};
            const initialLoading = {};
            const initialErrors = {};

            queryKeys.forEach(key => {
                initialData[key] = null;
                initialLoading[key] = false;
                initialErrors[key] = null;
            });

            setCombinedData(initialData);
            setCombinedLoading(initialLoading);
            setCombinedErrors(initialErrors);
        }
    }, [stableQueries, initialized]);

    // Execute queries manually using the base API pattern
    useEffect(() => {
        if (!initialized) return;

        const executeQueries = async () => {
            const newResults = {};
            const newData = {};
            const newLoading = {};
            const newErrors = {};

            // Execute all queries sequentially to avoid race conditions
            for (const [key, config] of Object.entries(stableQueries)) {
                try {
                    newLoading[key] = true;
                    newErrors[key] = null;

                    // Update loading state immediately
                    setCombinedLoading(prev => ({ ...prev, [key]: true }));

                    const { apiFunction, params = [], options = {} } = config;

                    if (typeof apiFunction === 'function') {
                        const result = await apiFunction(...params);
                        const processedData = options.transform
                            ? options.transform(result)
                            : result;

                        newData[key] = processedData;
                        newResults[key] = {
                            data: processedData,
                            isLoading: false,
                            error: null,
                            hasExecuted: true,
                        };
                    }
                } catch (error) {
                    console.error(`useApiQueries - Error in query ${key}:`, error);
                    newErrors[key] = error;
                    newData[key] = null;
                    newResults[key] = { data: null, isLoading: false, error, hasExecuted: true };
                }

                newLoading[key] = false;
            }

            // Update all states at once to prevent multiple re-renders
            setResults(newResults);
            setCombinedData(newData);
            setCombinedLoading(newLoading);
            setCombinedErrors(newErrors);
        };

        executeQueries();
    }, [stableQueries, initialized]);

    // Calculate aggregate states
    const isAnyLoading = useMemo(
        () => Object.values(combinedLoading).some(loading => loading),
        [combinedLoading]
    );

    const hasAnyError = useMemo(
        () => Object.values(combinedErrors).some(error => error),
        [combinedErrors]
    );

    const allExecuted = useMemo(
        () => Object.values(results).every(result => result?.hasExecuted),
        [results]
    );

    return {
        data: combinedData,
        isLoading: combinedLoading,
        errors: combinedErrors,

        // Aggregate states
        isAnyLoading,
        hasAnyError,
        allExecuted,

        // Individual query controls
        queries: results,
    };
}
