import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Context for generic toolbar registration
 * Allows any page to register toolbar content to be rendered at the top of the content area
 */
const ToolbarContext = createContext(undefined);

/**
 * ToolbarProvider - Manages generic toolbar registration for all pages
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const ToolbarProvider = ({ children }) => {
    const [toolbarState, setToolbarState] = useState({
        hasToolbar: false,
        content: null,
    });

    /**
     * Register toolbar content to be displayed
     * @param {React.ReactNode} content - ToolBar component or any React content
     */
    const registerToolbar = useCallback(content => {
        setToolbarState({
            hasToolbar: true,
            content,
        });
    }, []);

    /**
     * Clear toolbar content (call on page unmount)
     */
    const clearToolbar = useCallback(() => {
        setToolbarState({
            hasToolbar: false,
            content: null,
        });
    }, []);

    const contextValue = {
        hasToolbar: toolbarState.hasToolbar,
        content: toolbarState.content,
        registerToolbar,
        clearToolbar,
    };

    return <ToolbarContext.Provider value={contextValue}>{children}</ToolbarContext.Provider>;
};

ToolbarProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

/**
 * Hook to access toolbar context
 * @returns {Object} Toolbar context value with registration methods
 * @throws {Error} If used outside ToolbarProvider
 */
export const useToolbar = () => {
    const context = useContext(ToolbarContext);
    if (context === undefined) {
        throw new Error('useToolbar must be used within a ToolbarProvider');
    }
    return context;
};
