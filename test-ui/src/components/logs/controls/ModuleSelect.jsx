import { useLogControls } from '../context/LogControlsContext';
import { humanize } from '../../../utils/tools';

/**
 * ModuleSelect - Module selection dropdown
 *
 * Renders dropdown of available log modules with humanized names.
 * Consumes LogControlsContext for state and actions.
 *
 * @returns {JSX.Element}
 */
export const ModuleSelect = () => {
    const { modules, onModuleChange } = useLogControls();

    return (
        <select
            className="px-3 py-2 rounded-md border border-divider bg-input text-primary min-h-11"
            onChange={e => onModuleChange(e.target.value)}
            aria-label="Select module"
        >
            <option value="">Select Module</option>
            {modules.map(module => (
                <option key={module} value={module}>
                    {humanize(module)}
                </option>
            ))}
        </select>
    );
};
