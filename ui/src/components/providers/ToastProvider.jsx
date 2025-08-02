// src/components/providers/ToastProvider.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

// Context for toasts
const ToastContext = createContext();
let toastBridge = null;

// Hook for using the toast function in your components
export function useToast() {
    return useContext(ToastContext);
}

// ToastMessage component for animation (fade in/out with .show class)
function ToastMessage({ id, message, type, timeout, onRemove }) {
    const [show, setShow] = useState(false);

    React.useEffect(() => {
        // Fade in
        const fadeIn = setTimeout(() => setShow(true), 100);
        // Fade out
        const fadeOut = setTimeout(() => setShow(false), timeout);
        // Remove after fade out
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
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, timeout }]);
    }, []);

    toastBridge = showToast;

    // Remove a toast by ID
    const removeToast = useCallback(id => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div id="toast-container" className="toast-container">
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
