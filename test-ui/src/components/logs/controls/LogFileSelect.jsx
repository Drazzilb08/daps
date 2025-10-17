import { useLogControls } from '../context/LogControlsContext';

/**
 * LogFileSelect - Log file selection dropdown
 *
 * Renders dropdown of available log files for selected module.
 * Disabled when no log files available.
 * Consumes LogControlsContext for state and actions.
 *
 * @returns {JSX.Element}
 */
export const LogFileSelect = () => {
    const { logFiles, onLogFileChange } = useLogControls();

    return (
        <select
            className="px-3 py-2 rounded-md border border-divider bg-input text-primary min-h-11 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!logFiles || logFiles.length === 0}
            onChange={e => onLogFileChange(e.target.value)}
            aria-label="Select log file"
        >
            <option value="">Select Log File</option>
            {logFiles &&
                logFiles.map(file => (
                    <option key={file} value={file}>
                        {file}
                    </option>
                ))}
        </select>
    );
};
