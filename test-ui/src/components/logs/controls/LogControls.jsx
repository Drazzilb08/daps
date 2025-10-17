import React from 'react';
import { LogControlsProvider } from '../context/LogControlsContext';
import { CollapseButton } from './CollapseButton';
import { ModuleSelect } from './ModuleSelect';
import { LogFileSelect } from './LogFileSelect';
import { SearchInput } from './SearchInput';
import { ActionButtons } from './ActionButtons';
import { useLogControls } from '../context/LogControlsContext';
import { useUIState } from '../../../contexts/UIStateContext';

/**
 * LogControlsContent - Internal component that renders control UI
 *
 * Consumes LogControlsContext to access collapse state.
 * Consumes UIStateContext to detect sidebar state.
 * Adapts layout based on sidebar state and viewport size.
 *
 * Layout modes:
 * - Desktop with sidebar COLLAPSED (narrow): Full-width stacked rows with show/hide toggle
 * - Desktop with sidebar OPEN (wide): Single-row horizontal layout
 * - Mobile: Collapsible with toggle button
 *
 * @param {Object} props
 * @param {string} props.logText - Current log text (for upload)
 * @returns {JSX.Element}
 */
const LogControlsContent = ({ logText }) => {
    const { isCollapsed } = useLogControls();
    const { viewport } = useUIState();

    // Use stacked layout for narrower viewports (< 1200px)
    // This gives more vertical space when horizontal space is limited
    const useStackedLayout = viewport.width < 1200;

    return (
        <div className="flex flex-col gap-3 p-3 rounded-md border border-divider bg-surface-alt">
            {/* Show/Hide toggle - always visible in stacked layout */}
            {useStackedLayout && <CollapseButton />}

            {/* Controls - hidden when collapsed */}
            {!isCollapsed && (
                <div
                    id="log-controls-content"
                    className={
                        useStackedLayout ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2'
                    }
                >
                {useStackedLayout ? (
                    <>
                        {/* Stacked layout: Full-width rows */}
                        <ModuleSelect />
                        <LogFileSelect />
                        <SearchInput />
                        <div className="flex justify-center">
                            <ActionButtons logText={logText} />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Horizontal layout: Flexible single row with wrapping */}
                        <div className="flex-shrink-0 min-w-48">
                            <ModuleSelect />
                        </div>
                        <div className="flex-shrink-0 min-w-48">
                            <LogFileSelect />
                        </div>
                        <div className="flex-1 min-w-64">
                            <SearchInput />
                        </div>
                        <div className="flex-shrink-0">
                            <ActionButtons logText={logText} />
                        </div>
                    </>
                )}
                </div>
            )}
        </div>
    );
};

/**
 * LogControls - Root control toolbar compound
 *
 * Provides control state via LogControlsProvider and composes all
 * control subcomponents. Implements mobile-responsive collapse pattern.
 *
 * Layout:
 * - Desktop (>1024px): Horizontal flexbox with wrapping
 * - Mobile (≤1024px): Collapsible vertical stack with toggle button
 *
 * @param {Object} props
 * @param {Array} props.modules - Available modules
 * @param {Array} props.logFiles - Available log files
 * @param {string} props.logText - Current log text (for upload)
 * @param {Function} props.onModuleChange - Module selection handler
 * @param {Function} props.onLogFileChange - Log file selection handler
 * @param {Function} props.onSearchChange - Search term change handler
 * @param {Function} props.onDownload - Download button handler
 * @param {Function} props.onUpload - Upload button handler
 * @returns {JSX.Element}
 */
export const LogControls = ({
    modules,
    logFiles,
    logText,
    onModuleChange,
    onLogFileChange,
    onSearchChange,
    onDownload,
    onUpload,
}) => {
    return (
        <LogControlsProvider
            modules={modules}
            logFiles={logFiles}
            onModuleChange={onModuleChange}
            onLogFileChange={onLogFileChange}
            onSearchChange={onSearchChange}
            onDownload={onDownload}
            onUpload={onUpload}
        >
            <LogControlsContent logText={logText} />
        </LogControlsProvider>
    );
};
