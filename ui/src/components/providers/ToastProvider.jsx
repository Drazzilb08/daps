import React, { createContext, useContext, useState, useCallback } from 'react';

// Context for toasts
const ToastContext = createContext();
let toastBridge = null;

function showToastHelper(setToasts, message, type = 'info', timeout = 3000) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, timeout }]);
}

// Hook for using the toast function in your components
export function useToast() {
    const showToast = useContext(ToastContext);
    const error = useCallback((msg, timeout) => showToast(msg, 'error', timeout), [showToast]);
    const success = useCallback((msg, timeout) => showToast(msg, 'success', timeout), [showToast]);
    const info = useCallback((msg, timeout) => showToast(msg, 'info', timeout), [showToast]);
    return Object.assign(showToast, { error, success, info });
}

// ToastMessage component for animation
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

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    // Show a new toast
    const showToast = useCallback((message, type = 'info', timeout = 3000) => {
        showToastHelper(setToasts, message, type, timeout);
    }, []);

    toastBridge = showToast;

    // Remove a toast by ID
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
export function toast(...args) {
    if (typeof toastBridge === 'function') toastBridge(...args);
}
toast.error = (msg, timeout = 3000) => toast(msg, 'error', timeout);
toast.success = (msg, timeout = 3000) => toast(msg, 'success', timeout);
toast.info = (msg, timeout = 3000) => toast(msg, 'info', timeout);
