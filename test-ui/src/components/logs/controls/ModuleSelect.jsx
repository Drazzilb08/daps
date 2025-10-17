import React from 'react';
import { useLogControls } from '../context/LogControlsContext';
import { humanize } from '../../../utils/tools';
import { SelectBase } from '../../fields/primitives';

/**
 * ModuleSelect - Module selection dropdown
 *
 * Renders dropdown of available log modules with humanized names.
 * Consumes LogControlsContext for state and actions.
 * Uses SelectBase primitive for consistent styling and behavior.
 *
 * @returns {JSX.Element}
 */
export const ModuleSelect = () => {
    const { modules, onModuleChange } = useLogControls();

    return (
        <SelectBase onChange={e => onModuleChange(e.target.value)} aria-label="Select module">
            <option value="">Select Module</option>
            {modules.map(module => (
                <option key={module} value={module}>
                    {humanize(module)}
                </option>
            ))}
        </SelectBase>
    );
};
