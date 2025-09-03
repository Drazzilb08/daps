import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Context for managing global UI state that traditionally required body class manipulation
 * Replaces direct DOM manipulation with React state management
 */
const UIStateContext = createContext();

/**
 * Custom hook to access UI state context
 * @returns {Object} UI state and actions
 */
export function useUIState() {
    const context = useContext(UIStateContext);
    if (!context) {
        throw new Error('useUIState must be used within a UIStateProvider');
    }
    return context;
}

/**
 * Provider component for global UI state management
 * Manages sidebar open/close state and mobile search active state
 * Applies corresponding CSS classes to document.body for styling compatibility
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function UIStateProvider({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

    // Apply/remove CSS classes to body based on state
    // This maintains compatibility with existing CSS that depends on body classes
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.classList.add('sidebar-open');
        } else {
            document.body.classList.remove('sidebar-open');
        }

        return () => {
            // Cleanup on unmount
            document.body.classList.remove('sidebar-open');
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        if (isMobileSearchActive) {
            document.body.classList.add('mobile-search-active');
        } else {
            document.body.classList.remove('mobile-search-active');
        }

        return () => {
            // Cleanup on unmount
            document.body.classList.remove('mobile-search-active');
        };
    }, [isMobileSearchActive]);

    // Actions for updating state
    const actions = {
        openSidebar: () => setIsSidebarOpen(true),
        closeSidebar: () => setIsSidebarOpen(false),
        toggleSidebar: () => setIsSidebarOpen(prev => !prev),
        activateMobileSearch: () => setIsMobileSearchActive(true),
        deactivateMobileSearch: () => setIsMobileSearchActive(false),
    };

    const value = {
        // State
        isSidebarOpen,
        isMobileSearchActive,
        // Actions
        ...actions,
    };

    return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}
