import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function useToast() {
    const toasts = useContext(ToastContext);
    if (!toasts) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return toasts;
}

// Export toast types for backward compatibility
export const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

// Simple toast component that just shows the message
function Toast({ id, message, type, onClose }) {
    const [visible, setVisible] = useState(false);

    React.useEffect(() => {
        // Show animation
        const showTimer = setTimeout(() => setVisible(true), 10);

        // Auto-hide after timeout
        const timeout = type === 'error' ? 5000 : 3000;
        const hideTimer = setTimeout(() => setVisible(false), timeout);

        // Remove from DOM after animation
        const removeTimer = setTimeout(() => onClose(id), timeout + 500);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
            clearTimeout(removeTimer);
        };
    }, [id, type, onClose]);

    const handleClick = () => {
        setVisible(false);
        setTimeout(() => onClose(id), 300);
    };

    return (
        <div
            className={`toast p-3 pl-4 pr-4 rounded-md text-base font-medium cursor-pointer relative overflow-hidden ${type} ${visible ? 'show' : ''}`}
            onClick={handleClick}
            role="alert"
            aria-live="assertive"
        >
            {message}
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback(id => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const toastMethods = React.useMemo(
        () => ({
            success: message => showToast(message, 'success'),
            error: message => showToast(message, 'error'),
            info: message => showToast(message, 'info'),
            warning: message => showToast(message, 'warning'),
            showToast,
        }),
        [showToast]
    );

    return (
        <ToastContext.Provider value={toastMethods}>
            {children}
            <div className="toast-container fixed bottom-4 right-4 flex flex-col gap-2">
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} onClose={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
