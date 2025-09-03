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
 * Uses CSS custom properties for styling without DOM manipulation
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function UIStateProvider({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

    // Apply CSS custom properties and data attributes to root element for styling
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--sidebar-open', isSidebarOpen ? '1' : '0');
        root.setAttribute('data-sidebar-open', isSidebarOpen ? 'true' : 'false');
    }, [isSidebarOpen]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--mobile-search-active', isMobileSearchActive ? '1' : '0');
        root.setAttribute('data-mobile-search-active', isMobileSearchActive ? 'true' : 'false');
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
