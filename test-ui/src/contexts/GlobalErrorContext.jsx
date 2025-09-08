import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useToast, TOAST_TYPES } from './ToastContext.jsx';

/**
 * Global error context for managing application-wide error state
 * Provides error boundaries, user-friendly messages, and recovery options
 */

// Error types
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Create context
const GlobalErrorContext = createContext();

/**
 * Custom hook to use global error context
 * @returns {Object} Global error context value with methods and state
 */
export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
};

/**
 * Generate user-friendly error messages based on error type and details
 * @param {Object} error - Error object
 * @returns {string} User-friendly message
 */
const generateUserMessage = (error) => {
  const { type, originalError, message } = error;
  
  switch (type) {
    case ERROR_TYPES.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case ERROR_TYPES.VALIDATION:
      return message || 'Please check your input and try again.';
    
    case ERROR_TYPES.AUTHENTICATION:
      return 'Your session has expired. Please refresh the page and try again.';
    
    case ERROR_TYPES.PERMISSION:
      return 'You do not have permission to perform this action.';
    
    case ERROR_TYPES.NOT_FOUND:
      return 'The requested resource could not be found.';
    
    case ERROR_TYPES.SERVER:
      return 'A server error occurred. Please try again in a few moments.';
    
    case ERROR_TYPES.CLIENT:
      return message || 'An error occurred while processing your request.';
    
    case ERROR_TYPES.UNKNOWN:
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Determine error severity based on type and original error
 * @param {Object} error - Error object
 * @returns {string} Error severity level
 */
const determineErrorSeverity = (error) => {
  const { type, originalError } = error;
  
  switch (type) {
    case ERROR_TYPES.AUTHENTICATION:
    case ERROR_TYPES.SERVER:
      return ERROR_SEVERITY.CRITICAL;
    
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.PERMISSION:
      return ERROR_SEVERITY.HIGH;
    
    case ERROR_TYPES.VALIDATION:
    case ERROR_TYPES.NOT_FOUND:
      return ERROR_SEVERITY.MEDIUM;
    
    case ERROR_TYPES.CLIENT:
    default:
      return ERROR_SEVERITY.LOW;
  }
};

/**
 * Global Error Provider component
 * Manages global error state and provides error handling utilities
 * Now uses elegant toast notifications instead of intrusive modals
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Function} props.onError - Optional error callback
 * @param {boolean} props.enableLogging - Whether to log errors to console
 */
export const GlobalErrorProvider = ({ 
  children, 
  onError,
  enableLogging = true 
}) => {
  const [currentError, setCurrentError] = useState(null);
  const [errorHistory, setErrorHistory] = useState([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const toast = useToast();

  /**
   * Log error to console and external services
   * @param {Object} error - Error object to log
   */
  const logError = useCallback((error) => {
    if (!enableLogging) return;

    const logData = {
      timestamp: new Date().toISOString(),
      type: error.type,
      message: error.message,
      userMessage: error.userMessage,
      severity: error.severity,
      originalError: error.originalError,
      stack: error.originalError?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Global Error:', logData);

    // Send to external error tracking service (implement as needed)
    // Example: Sentry, LogRocket, etc.
    if (onError) {
      try {
        onError(logData);
      } catch (callbackError) {
        console.warn('Error in onError callback:', callbackError);
      }
    }
  }, [enableLogging, onError]);

  /**
   * Set global error
   * @param {Error|string} errorInput - Error object or string
   * @param {Object} options - Error options
   */
  const setError = useCallback((errorInput, options = {}) => {
    const {
      type = ERROR_TYPES.UNKNOWN,
      severity,
      recoverable = true,
      persistent = false
    } = options;

    // Normalize error input
    let originalError, message;
    if (errorInput instanceof Error) {
      originalError = errorInput;
      message = errorInput.message;
    } else if (typeof errorInput === 'string') {
      message = errorInput;
    } else {
      message = 'Unknown error occurred';
    }

    // Create error object
    const error = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      originalError,
      severity: severity || determineErrorSeverity({ type, originalError }),
      userMessage: generateUserMessage({ type, originalError, message }),
      recoverable,
      persistent
    };

    // Set current error (for context state tracking)
    setCurrentError(error);

    // Add to history
    setErrorHistory(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors

    // Log error
    logError(error);

    // Show elegant toast notification instead of modal
    const toastOptions = {
      id: error.id,
      timeout: error.severity === ERROR_SEVERITY.CRITICAL ? 0 : // Critical errors persist
                error.severity === ERROR_SEVERITY.HIGH ? 10000 : // High severity: 10s
                error.severity === ERROR_SEVERITY.MEDIUM ? 8000 : // Medium severity: 8s
                6000, // Low severity: 6s
      persistent: error.severity === ERROR_SEVERITY.CRITICAL
    };

    // DEBUG: Log the error and toast details
    console.log('GlobalError: Showing toast for error:', {
      errorId: error.id,
      severity: error.severity,
      userMessage: error.userMessage,
      toastOptions
    });

    toast.showError(error.userMessage, toastOptions);

    // Auto-clear current error after toast timeout (unless critical)
    if (error.severity !== ERROR_SEVERITY.CRITICAL) {
      setTimeout(() => {
        setCurrentError(null);
      }, toastOptions.timeout);
    }

    return error.id;
  }, [logError, toast]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setCurrentError(null);
    setIsRecovering(false);
  }, []);

  /**
   * Attempt error recovery
   * @param {Function} recoveryFunction - Function to attempt recovery
   */
  const attemptRecovery = useCallback(async (recoveryFunction) => {
    if (!currentError?.recoverable) {
      console.warn('Cannot recover from non-recoverable error');
      return false;
    }

    setIsRecovering(true);
    
    try {
      if (typeof recoveryFunction === 'function') {
        await recoveryFunction();
      }
      
      clearError();
      return true;
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      setError(recoveryError, { 
        type: ERROR_TYPES.CLIENT,
        recoverable: false 
      });
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [currentError, setError, clearError]);

  /**
   * Handle JavaScript errors globally
   */
  useEffect(() => {
    const handleGlobalError = (event) => {
      setError(event.error || event.message, {
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.MEDIUM
      });
    };

    const handleUnhandledRejection = (event) => {
      setError(event.reason, {
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.HIGH
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [setError]);

  const contextValue = {
    // Current state
    currentError,
    errorHistory,
    isRecovering,
    
    // Actions
    setError,
    clearError,
    attemptRecovery,
    
    // Utilities
    hasError: !!currentError,
    currentErrorSeverity: currentError?.severity,
    isRecoverable: currentError?.recoverable || false,
    
    // Constants
    errorTypes: ERROR_TYPES,
    errorSeverities: ERROR_SEVERITY
  };

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
      {/* Errors now display via toast notifications instead of intrusive modals */}
    </GlobalErrorContext.Provider>
  );
};

GlobalErrorProvider.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  enableLogging: PropTypes.bool
};

/**
 * Toast-based error display utility
 * Provides helpful recovery actions through toast interactions
 */
export const showErrorWithRecovery = (toast, error, recoveryFn) => {
  const recoveryMessage = error.recoverable 
    ? `${error.userMessage}\n\nTip: You can try refreshing the page to recover.`
    : error.userMessage;

  return toast.showError(recoveryMessage, {
    timeout: error.severity === ERROR_SEVERITY.CRITICAL ? 0 : 8000,
    persistent: error.severity === ERROR_SEVERITY.CRITICAL
  });
};

/**
 * Error Boundary component
 * Catches React component errors and reports them to GlobalError
 */
export class ErrorBoundary extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.elementType,
    onError: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Report error to global error context if available
    if (this.context && this.context.setError) {
      this.context.setError(error, {
        type: ERROR_TYPES.CLIENT,
        severity: ERROR_SEVERITY.HIGH,
        recoverable: true
      });
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.contextType = GlobalErrorContext;