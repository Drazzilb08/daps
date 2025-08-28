import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();
let toastBridge = null;

/**
 * Helper function to add a new toast to the queue
 * @param {Function} setToasts - State setter for toasts array
 * @param {string} message - Toast message
 * @param {string} [type='info'] - Toast type (info, success, error)
 * @param {number} [timeout=3000] - Auto-dismiss timeout in milliseconds
 */
function showToastHelper(setToasts, message, type = 'info', timeout = 3000) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, timeout }]);
}

/**
 * Hook to access toast functionality in components
 * @returns {Function & Object} Toast function with error, success, info methods
 */
export function useToast() {
    const showToast = useContext(ToastContext);
    const error = useCallback((msg, timeout) => showToast(msg, 'error', timeout), [showToast]);
    const success = useCallback((msg, timeout) => showToast(msg, 'success', timeout), [showToast]);
    const info = useCallback((msg, timeout) => showToast(msg, 'info', timeout), [showToast]);

    // Memoize the toast object to prevent new object creation on every render
    return React.useMemo(() => {
        return Object.assign(showToast, { error, success, info });
    }, [showToast, error, success, info]);
}

/**
 * Individual toast message component with animation and auto-dismiss
 * @param {Object} props - Component props
 * @param {string} props.id - Unique toast identifier
 * @param {string} props.message - Toast message text
 * @param {string} props.type - Toast type for styling
 * @param {number} props.timeout - Auto-dismiss timeout
 * @param {Function} props.onRemove - Remove handler
 * @returns {JSX.Element} Animated toast message
 */
function ToastMessage({ id, message, type, timeout, onRemove }) {
    const [show, setShow] = useState(false);

    React.useEffect(() => {
        const fadeIn = setTimeout(() => setShow(true), 100);
        const fadeOut = setTimeout(() => setShow(false), timeout);
        const remove = setTimeout(() => onRemove(id), timeout + 500);

        return () => {
            clearTimeout(fadeIn);
            clearTimeout(fadeOut);
            clearTimeout(remove);
        };
    }, [timeout, onRemove, id]);

    return (
        <div
            className={`toast ${type}${show ? ' show' : ''}`}
            onClick={() => onRemove(id)}
            role="alert"
            aria-live="assertive"
        >
            {message}
        </div>
    );
}

/**
 * Toast provider that manages toast notifications system-wide
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Toast provider with notification container
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = 'info', timeout = 3000) => {
        showToastHelper(setToasts, message, type, timeout);
    }, []);

    toastBridge = showToast;

    const removeToast = useCallback(id => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <ToastMessage key={toast.id} {...toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
/**
 * Global toast function that can be used outside of React components
 * @param {...any} args - Arguments to pass to toast bridge
 */
export function toast(...args) {
    if (typeof toastBridge === 'function') toastBridge(...args);
}
toast.error = (msg, timeout = 3000) => toast(msg, 'error', timeout);
toast.success = (msg, timeout = 3000) => toast(msg, 'success', timeout);
toast.info = (msg, timeout = 3000) => toast(msg, 'info', timeout);
