import React from 'react';
import { useLogControls } from '../context/LogControlsContext';
import { SelectBase } from '../../fields/primitives';

/**
 * LogFileSelect - Log file selection dropdown
 *
 * Renders dropdown of available log files for selected module.
 * Disabled when no log files available.
 * Consumes LogControlsContext for state and actions.
 * Uses SelectBase primitive for consistent styling and behavior.
 *
 * @returns {JSX.Element}
 */
export const LogFileSelect = () => {
    const { logFiles, onLogFileChange } = useLogControls();

    return (
        <SelectBase
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
        </SelectBase>
    );
};
