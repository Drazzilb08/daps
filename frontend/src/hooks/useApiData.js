/**
 * Hook for API calls with loading/error states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../contexts/ToastContext.jsx';
import { APIError } from '../utils/api/core.js';

export const useApiData = ({ apiFunction, options = {}, dependencies = [] }) => {
    const {
        immediate = true,
        showErrorToast = true,
        showSuccessToast = false,
        successMessage = 'Operation completed successfully',
        transform = null,
        retryAttempts = 0,
        retryDelay = 1000,
        shouldRetry = null,
    } = options;

    const toast = useToast();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(immediate);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const abortControllerRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);

    const cleanup = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
    }, []);

    // Determine if retry should happen
    const shouldAttemptRetry = useCallback(
        (err, currentRetryCount) => {
            if (currentRetryCount >= retryAttempts) return false;

            if (shouldRetry) {
                return shouldRetry(err, currentRetryCount);
            }

            // Default retry logic
            if (err instanceof APIError) {
                return err.isRetryable();
            }

            // Retry network errors
            return err.name === 'TypeError' || err.message.includes('fetch');
        },
        [retryAttempts, shouldRetry]
    );

    // Execute API function with error handling
    const executeRequest = useCallback(
        async (retryAttempt = 0, executeOptions = {}) => {
            cleanup();

            abortControllerRef.current = new AbortController();

            try {
                setIsLoading(true);
                setError(null);

                if (retryAttempt > 0) {
                    setRetryCount(retryAttempt);
                }

                if (!apiFunction) {
                    throw new Error('API function is required');
                }

                const result = await apiFunction(executeOptions);

                if (!isMountedRef.current) {
                    return;
                }

                const finalData = transform ? transform(result) : result;

                setData(finalData);
                setRetryCount(0);

                // Show success toast if enabled
                if (showSuccessToast && toast && toast.success) {
                    toast.success(successMessage);
                }
            } catch (err) {
                if (!isMountedRef.current) {
                    return;
                }

                if (err.name === 'AbortError') {
                    return;
                }

                setError(err);

                // Determine if we should retry
                if (shouldAttemptRetry(err, retryAttempt)) {
                    retryTimeoutRef.current = setTimeout(() => {
                        if (isMountedRef.current) {
                            executeRequest(retryAttempt + 1, executeOptions);
                        }
                    }, retryDelay);
                    return;
                }

                // Show error toast if enabled
                if (showErrorToast) {
                    let errorMessage = 'An unexpected error occurred';

                    if (err instanceof APIError) {
                        errorMessage = err.message;
                    } else if (err.message) {
                        errorMessage = err.message;
                    }

                    if (toast && toast.error) {
                        toast.error(errorMessage);
                    }
                }
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [
            apiFunction,
            transform,
            showSuccessToast,
            successMessage,
            showErrorToast,
            shouldAttemptRetry,
            retryDelay,
            toast,
            cleanup,
        ]
    );

    // Manual execution function
    const execute = useCallback(
        (executeOptions = {}) => {
            return executeRequest(0, executeOptions);
        },
        [executeRequest]
    );

    // Retry function
    const retry = useCallback(() => {
        if (error) {
            executeRequest(0);
        }
    }, [error, executeRequest]);

    // Refresh function (alias for execute)
    const refresh = useCallback(() => {
        return execute();
    }, [execute]);

    // Effect for automatic execution
    useEffect(() => {
        if (immediate) {
            executeRequest(0);
        }

        // Cleanup previous request when dependencies change (but don't mark as unmounted)
        return () => {
            cleanup();
        };
    }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        // Ensure mounted ref is true when component mounts
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            cleanup();
        };
    }, [cleanup]); // Include cleanup dependency

    return {
        /** Current data */
        data,

        /** Loading state */
        isLoading,

        /** Error state */
        error,

        /** Current retry count */
        retryCount,

        /** Manual execution function */
        execute,

        /** Retry failed request */
        retry,

        /** Refresh data (alias for execute) */
        refresh,

        /** Clear current data and error */
        clear: useCallback(() => {
            setData(null);
            setError(null);
            setRetryCount(0);
        }, []),

        /** Cancel ongoing request */
        cancel: cleanup,
    };
};

/**
 * Simple API data fetching hook
 *
 * @param {Function} apiFunction - API function to execute
 * @param {Array} dependencies - Dependencies for re-execution
 * @returns {Object} Hook state
 */
export const useApiCall = (apiFunction, dependencies = []) => {
    return useApiData({
        apiFunction,
        dependencies,
        options: {
            immediate: true,
            showErrorToast: true,
        },
    });
};

/**
 * Hook for manual API operations (form submissions, etc.)
 *
 * @param {Function} apiFunction - API function to execute
 * @param {Object} options - Hook options
 * @returns {Object} Hook state with manual execution
 */
export const useApiMutation = (apiFunction, options = {}) => {
    return useApiData({
        apiFunction,
        dependencies: [],
        options: {
            immediate: false,
            showErrorToast: true,
            showSuccessToast: true,
            ...options,
        },
    });
};
