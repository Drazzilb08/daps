import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Toast context for managing global toast notifications
 * Provides queue management, auto-dismiss, and ARIA announcements
 */

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Default toast timeout (5 seconds)
const DEFAULT_TIMEOUT = 5000;

// Create context
const ToastContext = createContext();

/**
 * Custom hook to use toast context
 * @returns {Object} Toast context value with methods and state
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast Provider component
 * Manages global toast notification state and behavior
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} props.defaultTimeout - Default auto-dismiss timeout in ms
 * @param {number} props.maxToasts - Maximum number of toasts to show
 */
export const ToastProvider = ({ 
  children, 
  defaultTimeout = DEFAULT_TIMEOUT,
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState([]);

  /**
   * Generate unique ID for toast
   */
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Dismiss a specific toast
   * @param {string} toastId - ID of toast to dismiss
   */
  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  /**
   * Show a new toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {Object} options - Additional options
   * @param {number} options.timeout - Auto-dismiss timeout in ms (0 = no auto-dismiss)
   * @param {boolean} options.persistent - If true, toast won't auto-dismiss
   * @param {string} options.id - Custom toast ID
   */
  const showToast = useCallback((message, type = TOAST_TYPES.INFO, options = {}) => {
    const {
      timeout = defaultTimeout,
      persistent = false,
      id = generateId()
    } = options;

    const newToast = {
      id,
      message,
      type,
      timestamp: Date.now(),
      timeout: persistent ? 0 : timeout,
      persistent
    };

    // DEBUG: Log toast creation
    console.log('ToastContext: showToast creating toast:', {
      toast: newToast,
      maxToasts
    });

    setToasts(prev => {
      // Remove oldest toast if we're at max capacity
      const updatedToasts = prev.length >= maxToasts ? prev.slice(1) : prev;
      const newToastArray = [...updatedToasts, newToast];
      
      // DEBUG: Log the toast array update
      console.log('ToastContext: updating toasts array:', {
        previous: prev.length,
        updated: newToastArray.length,
        newToastId: newToast.id
      });
      
      return newToastArray;
    });

    // Set up auto-dismiss if not persistent
    if (!persistent && timeout > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, timeout);
    }

    return id;
  }, [defaultTimeout, maxToasts, generateId, dismissToast]);

  /**
   * Clear all toasts
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Convenience methods for different toast types
   */
  const showSuccess = useCallback((message, options = {}) => {
    return showToast(message, TOAST_TYPES.SUCCESS, options);
  }, [showToast]);

  const showError = useCallback((message, options = {}) => {
    // DEBUG: Log toast creation
    console.log('ToastContext: showError called with:', {
      message,
      options,
      type: TOAST_TYPES.ERROR
    });

    return showToast(message, TOAST_TYPES.ERROR, {
      ...options,
      timeout: options.timeout || 8000 // Errors stay longer by default
    });
  }, [showToast]);

  const showWarning = useCallback((message, options = {}) => {
    return showToast(message, TOAST_TYPES.WARNING, options);
  }, [showToast]);

  const showInfo = useCallback((message, options = {}) => {
    return showToast(message, TOAST_TYPES.INFO, options);
  }, [showToast]);

  const contextValue = {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  defaultTimeout: PropTypes.number,
  maxToasts: PropTypes.number
};

/**
 * Toast Container component
 * Renders all active toasts with accessibility features
 */
const ToastContainer = () => {
  const { toasts, dismissToast } = useToast();

  // DEBUG: Log toast container renders
  console.log('ToastContainer render:', {
    toastsCount: toasts.length,
    toasts: toasts.map(t => ({ id: t.id, type: t.type, message: t.message }))
  });

  return (
    <>
      {/* ARIA live region for screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {toasts.map(toast => (
          <div key={`announce-${toast.id}`}>
            {toast.type === TOAST_TYPES.ERROR ? 'Error: ' : ''}
            {toast.type === TOAST_TYPES.WARNING ? 'Warning: ' : ''}
            {toast.type === TOAST_TYPES.SUCCESS ? 'Success: ' : ''}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Visual toast container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

/**
 * Individual Toast component
 * @param {Object} props - Component props
 * @param {Object} props.toast - Toast data
 * @param {Function} props.onDismiss - Dismiss callback
 */
const Toast = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animate in toast
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Wait for exit animation before actually removing
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const getToastIcon = (type) => {
    switch (type) {
      case TOAST_TYPES.SUCCESS:
        return '✅';
      case TOAST_TYPES.ERROR:
        return '❌';
      case TOAST_TYPES.WARNING:
        return '⚠️';
      case TOAST_TYPES.INFO:
      default:
        return 'ℹ️';
    }
  };

  const getToastStyles = (type) => {
    const baseStyles = {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      color: 'var(--color-text-primary)'
    };

    switch (type) {
      case TOAST_TYPES.SUCCESS:
        return {
          ...baseStyles,
          borderColor: 'var(--color-success)',
          background: 'var(--color-button-success)'
        };
      case TOAST_TYPES.ERROR:
        return {
          ...baseStyles,
          borderColor: 'var(--color-error)',
          background: 'var(--color-button-danger)'
        };
      case TOAST_TYPES.WARNING:
        return {
          ...baseStyles,
          borderColor: 'var(--color-warning)',
          background: 'var(--color-button-warning)'
        };
      case TOAST_TYPES.INFO:
      default:
        return {
          ...baseStyles,
          borderColor: 'var(--color-info)',
          background: 'var(--color-button-secondary)'
        };
    }
  };

  return (
    <div
      className={`toast toast-${toast.type} ${isVisible ? 'toast-visible' : 'toast-hidden'}`}
      style={getToastStyles(toast.type)}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-content">
        <div className="toast-icon">
          {getToastIcon(toast.type)}
        </div>
        <div className="toast-message">
          {toast.message}
        </div>
        {!toast.persistent && (
          <button
            className="toast-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(Object.values(TOAST_TYPES)).isRequired,
    timestamp: PropTypes.number.isRequired,
    timeout: PropTypes.number.isRequired,
    persistent: PropTypes.bool
  }).isRequired,
  onDismiss: PropTypes.func.isRequired
};