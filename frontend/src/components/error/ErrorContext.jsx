import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorContext - Centralized error state and recovery management
 *
 * Provides:
 * - Global error reporting with unique IDs
 * - Error history tracking (last 10 errors)
 * - Context-based error filtering
 * - Error recovery hooks
 */

const ErrorContext = createContext(null);

/**
 * Hook to access error context
 * @returns {Object} Error context value
 */
export const useErrorContext = () => {
    const context = useContext(ErrorContext);
    if (!context) {
        throw new Error('useErrorContext must be used within ErrorProvider');
    }
    return context;
};

/**
 * ErrorProvider - Centralized error state management
 */
export const ErrorProvider = ({ children }) => {
    const [globalError, setGlobalError] = useState(null);
    const [errorHistory, setErrorHistory] = useState([]);

    const reportError = useCallback((error, context = {}) => {
        const errorEntry = {
            error,
            context,
            timestamp: new Date().toISOString(),
            id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        setGlobalError(errorEntry);
        setErrorHistory(prev => [errorEntry, ...prev.slice(0, 9)]); // Keep last 10

        console.error('[ErrorContext] Error reported:', errorEntry);

        return errorEntry.id;
    }, []);

    const clearError = useCallback(() => {
        setGlobalError(null);
    }, []);

    const getErrorHistory = useCallback(() => {
        return errorHistory;
    }, [errorHistory]);

    const value = {
        globalError,
        errorHistory,
        reportError,
        clearError,
        getErrorHistory,
    };

    return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};

ErrorProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

/**
 * useErrorRecovery - Recovery action management hook
 * @param {Object} options - Recovery configuration
 * @returns {Object} Recovery methods
 */
export const useErrorRecovery = (options = {}) => {
    const { reportError } = useErrorContext();
    const { onRecovery, retryLimit = 3 } = options;

    const [retryCount, setRetryCount] = useState(0);
    const [isRecovering, setIsRecovering] = useState(false);

    const retry = useCallback(
        async operation => {
            if (retryCount >= retryLimit) {
                reportError(new Error('Retry limit exceeded'), { retryCount });
                return false;
            }

            setIsRecovering(true);
            try {
                await operation();
                setRetryCount(0);
                onRecovery?.('retry');
                return true;
            } catch (error) {
                setRetryCount(prev => prev + 1);
                reportError(error, { retryCount: retryCount + 1 });
                return false;
            } finally {
                setIsRecovering(false);
            }
        },
        [retryCount, retryLimit, reportError, onRecovery]
    );

    const reset = useCallback(() => {
        setRetryCount(0);
        setIsRecovering(false);
        onRecovery?.('reset');
    }, [onRecovery]);

    const goHome = useCallback(() => {
        window.location.href = '/';
        onRecovery?.('home');
    }, [onRecovery]);

    const goBack = useCallback(() => {
        window.history.back();
        onRecovery?.('back');
    }, [onRecovery]);

    return {
        retry,
        reset,
        goHome,
        goBack,
        retryCount,
        isRecovering,
        canRetry: retryCount < retryLimit,
    };
};
