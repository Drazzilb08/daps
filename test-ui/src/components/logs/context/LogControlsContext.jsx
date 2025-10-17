import { createContext, useContext, useState } from 'react';

/**
 * LogControlsContext - Provides shared state for all control components
 *
 * Manages control state including module selection, log file selection,
 * search term, and collapse state for mobile responsiveness.
 */
const LogControlsContext = createContext(null);

/**
 * LogControlsProvider - Provides control state to subcomponents
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Array} props.modules - Available modules
 * @param {Array} props.logFiles - Available log files
 * @param {Function} props.onModuleChange - Module selection handler
 * @param {Function} props.onLogFileChange - Log file selection handler
 * @param {Function} props.onSearchChange - Search term change handler
 * @param {Function} props.onDownload - Download button handler
 * @param {Function} props.onUpload - Upload button handler
 * @returns {JSX.Element}
 */
export function LogControlsProvider({
    children,
    modules,
    logFiles,
    onModuleChange,
    onLogFileChange,
    onSearchChange,
    onDownload,
    onUpload,
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const value = {
        // State
        modules,
        logFiles,
        isCollapsed,
        // Actions
        onModuleChange,
        onLogFileChange,
        onSearchChange,
        onDownload,
        onUpload,
        setIsCollapsed,
    };

    return <LogControlsContext.Provider value={value}>{children}</LogControlsContext.Provider>;
}

/**
 * useLogControls - Access control state from context
 *
 * @returns {Object} Control state and actions
 * @throws {Error} If used outside LogControlsProvider
 */
export function useLogControls() {
    const context = useContext(LogControlsContext);

    if (!context) {
        throw new Error('useLogControls must be used within LogControlsProvider');
    }

    return context;
}
