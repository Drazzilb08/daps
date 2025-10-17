import { LogControlsProvider } from '../context/LogControlsContext';
import { CollapseButton } from './CollapseButton';
import { ModuleSelect } from './ModuleSelect';
import { LogFileSelect } from './LogFileSelect';
import { SearchInput } from './SearchInput';
import { ActionButtons } from './ActionButtons';
import { useLogControls } from '../context/LogControlsContext';

/**
 * LogControlsContent - Internal component that renders control UI
 *
 * Consumes LogControlsContext to access collapse state.
 * Conditionally renders controls based on collapse state at ≤1024px.
 *
 * @param {Object} props
 * @param {string} props.logText - Current log text (for upload)
 * @returns {JSX.Element}
 */
const LogControlsContent = ({ logText }) => {
    const { isCollapsed } = useLogControls();

    return (
        <div className="flex flex-col gap-3 p-3 rounded-md border border-divider bg-surface-alt">
            {/* Collapse button - visible only on mobile (≤1024px) */}
            <div className="max-lg:block hidden">
                <CollapseButton />
            </div>

            {/* Controls - hidden when collapsed on mobile */}
            <div
                id="log-controls-content"
                className={`flex flex-wrap items-center gap-2 ${isCollapsed ? 'max-lg:hidden' : ''}`}
            >
                <ModuleSelect />
                <LogFileSelect />
                <SearchInput />
                <ActionButtons logText={logText} />
            </div>
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
