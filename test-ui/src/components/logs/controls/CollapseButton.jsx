import { useLogControls } from '../context/LogControlsContext';

/**
 * CollapseButton - Mobile collapse toggle button
 *
 * Toggles visibility of control toolbar on mobile devices.
 * Shows expand/collapse icon and text based on current state.
 * Only visible on mobile (≤1024px).
 *
 * @returns {JSX.Element}
 */
export const CollapseButton = () => {
    const { isCollapsed, setIsCollapsed } = useLogControls();

    return (
        <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-divider bg-input text-primary hover:bg-surface-alt transition-colors min-h-11 max-lg:block hidden"
            aria-expanded={!isCollapsed}
            aria-controls="log-controls-content"
        >
            <span className="material-symbols-outlined text-xl">
                {isCollapsed ? 'expand_more' : 'expand_less'}
            </span>
            <span className="text-sm">{isCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>
    );
};
