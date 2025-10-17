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

// Get toast styling utilities based on type
function getToastStyles(type) {
    const baseStyles = 'border-l-4';

    switch (type) {
        case 'success':
            return `${baseStyles} bg-success border-l-success text-white`;
        case 'error':
            return `${baseStyles} bg-error border-l-error text-white`;
        case 'warning':
            return `${baseStyles} bg-warning border-l-warning text-white`;
        case 'info':
            return `${baseStyles} bg-info border-l-info text-white`;
        default:
            return `${baseStyles} bg-info border-l-info text-white`;
    }
}

// Simple toast component that just shows the message
function Toast({ id, message, type, onClose }) {
    const [visible, setVisible] = useState(false);

    // Check for reduced motion preference
    const prefersReducedMotion = React.useMemo(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

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
            className={`p-3 pl-4 pr-4 rounded-md text-base font-medium cursor-pointer relative overflow-hidden pointer-events-auto md:min-w-0 min-w-auto transition-all ${getToastStyles(type)} ${visible ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleClick}
            role="alert"
            aria-live="assertive"
        >
            {message}
            <div
                className={`absolute bottom-0 left-0 h-1 bg-white opacity-50 ${prefersReducedMotion ? '' : 'transition-all'} ${visible ? 'w-full' : 'w-0'}`}
                style={{
                    transitionDuration: prefersReducedMotion ? '0ms' : visible ? '3000ms' : '0ms',
                    width: prefersReducedMotion && visible ? '100%' : undefined,
                }}
            />
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
            <div className="fixed bottom-4 right-4 md:max-w-sm max-w-none flex flex-col gap-2 z-toast pointer-events-none">
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} onClose={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
