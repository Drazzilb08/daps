import React from 'react';
import { getIcon, humanize } from '../../utils/tools';
import TooltipFactory from '../Tooltip';
import PopoverFactory from '../PopoverFactory';
import PopoverHeader from '../popover/PopoverHeader';
import PopoverActions from '../popover/PopoverActions';

/**
 * RefreshControls - Complex database refresh control with instance/library selection
 * Handles refresh button with popover containing checkboxes for instances and libraries
 *
 * @param {Object} popover - Popover control object from usePopover hook
 * @param {boolean} isRefreshing - Whether refresh operation is currently running
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {Object} selectedRefreshOptions - Currently selected refresh options
 * @param {Object} availableInstances - Available Radarr/Sonarr instances
 * @param {Array} availableLibraries - Available Plex libraries
 * @param {boolean} loadingLibraries - Whether libraries are currently being loaded
 * @param {Function} onLoadLibraries - Callback to load Plex libraries
 * @param {Function} onRefreshOptionToggle - Callback to toggle refresh option selection
 * @param {Function} onSelectAllRadarr - Callback to select all Radarr instances
 * @param {Function} onDeselectAllRadarr - Callback to deselect all Radarr instances
 * @param {Function} onSelectAllSonarr - Callback to select all Sonarr instances
 * @param {Function} onDeselectAllSonarr - Callback to deselect all Sonarr instances
 * @param {Function} onSelectAllLibraries - Callback to select all Plex libraries
 * @param {Function} onDeselectAllLibraries - Callback to deselect all Plex libraries
 * @param {Function} onSelectAllOverall - Callback to select all instances and libraries
 * @param {Function} onDeselectAllOverall - Callback to deselect everything
 * @param {Function} onRefreshExecute - Callback to execute the refresh operation
 * @returns {JSX.Element} Refresh control with popover
 */
function RefreshControls({
    popover,
    isRefreshing,
    showTooltips,
    onTooltipChange,
    selectedRefreshOptions,
    availableInstances,
    availableLibraries,
    loadingLibraries,
    onLoadLibraries,
    onRefreshOptionToggle,
    onSelectAllRadarr,
    onDeselectAllRadarr,
    onSelectAllSonarr,
    onDeselectAllSonarr,
    onSelectAllLibraries,
    onDeselectAllLibraries,
    onSelectAllOverall,
    onDeselectAllOverall,
    onRefreshExecute,
}) {
    /**
     * Render instance section (Radarr or Sonarr)
     * Helper function to reduce duplication between instance types
     * @param {string} type - Instance type ('radarr' or 'sonarr')
     * @param {Array} instances - Available instances for this type
     * @param {Function} onSelectAll - Select all callback for this type
     * @param {Function} onDeselectAll - Deselect all callback for this type
     * @returns {JSX.Element} Instance section component
     */
    function renderInstanceSection(type, instances, onSelectAll, onDeselectAll) {
        const sectionTitle = type === 'radarr' ? 'Radarr Instances' : 'Sonarr Instances';

        if (instances.length === 0) {
            return (
                <div className="refresh-section" style={{ marginBottom: 'var(--space-4)' }}>
                    <h5
                        style={{
                            margin: '0 0 var(--space-2) 0',
                            fontSize: 'var(--font-size-2)',
                            fontWeight: 'var(--font-weight-semibold)',
                        }}
                    >
                        {sectionTitle}
                    </h5>
                    <div
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: 'var(--font-size-1)',
                            fontStyle: 'italic',
                        }}
                    >
                        No {sectionTitle.toLowerCase()} configured
                    </div>
                </div>
            );
        }

        return (
            <div className="refresh-section" style={{ marginBottom: 'var(--space-4)' }}>
                <div
                    className="refresh-section-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-2)',
                    }}
                >
                    <h5
                        style={{
                            margin: 0,
                            fontSize: 'var(--font-size-2)',
                            fontWeight: 'var(--font-weight-semibold)',
                        }}
                    >
                        {sectionTitle}
                    </h5>
                    <div
                        className="select-all-buttons"
                        style={{
                            display: 'flex',
                            gap: 'var(--space-1)',
                        }}
                    >
                        <button
                            type="button"
                            className="select-icon-btn"
                            onClick={onSelectAll}
                            title={`Select all ${type} instances`}
                        >
                            {getIcon('mi:check_box')}
                        </button>
                        <button
                            type="button"
                            className="select-icon-btn"
                            onClick={onDeselectAll}
                            title={`Deselect all ${type} instances`}
                        >
                            {getIcon('mi:check_box_outline_blank')}
                        </button>
                    </div>
                </div>
                {instances.map(instance => (
                    <div
                        key={instance}
                        className="checkbox-row popover__list-item"
                        onClick={() => onRefreshOptionToggle('arrInstances', instance)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                        }}
                    >
                        <input
                            type="checkbox"
                            id={`header-${type}-${instance}`}
                            checked={selectedRefreshOptions.arrInstances.includes(instance)}
                            onChange={() => {}}
                            onClick={e => e.stopPropagation()}
                        />
                        <label
                            htmlFor={`header-${type}-${instance}`}
                            style={{
                                flex: 1,
                                cursor: 'pointer',
                            }}
                        >
                            {humanize(instance)}
                        </label>
                    </div>
                ))}
            </div>
        );
    }

    /**
     * Render Plex libraries section
     * Handles the complex libraries section with "Load Libraries" functionality
     * @returns {JSX.Element} Libraries section component
     */
    function renderLibrariesSection() {
        return (
            <div className="refresh-section" style={{ marginBottom: 'var(--space-4)' }}>
                <div
                    className="refresh-section-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-2)',
                    }}
                >
                    <h5
                        style={{
                            margin: 0,
                            fontSize: 'var(--font-size-2)',
                            fontWeight: 'var(--font-weight-semibold)',
                        }}
                    >
                        Plex Libraries
                    </h5>
                    <div
                        className="library-controls"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={onLoadLibraries}
                            disabled={loadingLibraries}
                            className="btn btn-secondary btn-sm"
                        >
                            {loadingLibraries ? 'Loading...' : 'Load Libraries'}
                        </button>
                        {availableLibraries.length > 0 && (
                            <div
                                className="select-all-buttons"
                                style={{
                                    display: 'flex',
                                    gap: 'var(--space-1)',
                                }}
                            >
                                <button
                                    type="button"
                                    className="select-icon-btn"
                                    onClick={onSelectAllLibraries}
                                    title="Select all libraries"
                                >
                                    {getIcon('mi:check_box')}
                                </button>
                                <button
                                    type="button"
                                    className="select-icon-btn"
                                    onClick={onDeselectAllLibraries}
                                    title="Deselect all libraries"
                                >
                                    {getIcon('mi:check_box_outline_blank')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {availableLibraries.length > 0 ? (
                    availableLibraries.map(library => (
                        <div
                            key={library.name || library}
                            className="checkbox-row popover__list-item"
                            onClick={() =>
                                onRefreshOptionToggle('libraries', library.name || library)
                            }
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <input
                                type="checkbox"
                                id={`header-lib-${library.name || library}`}
                                checked={selectedRefreshOptions.libraries.includes(
                                    library.name || library
                                )}
                                onChange={() => {}}
                                onClick={e => e.stopPropagation()}
                            />
                            <label
                                htmlFor={`header-lib-${library.name || library}`}
                                style={{ flex: 1, cursor: 'pointer' }}
                            >
                                {library.displayName || library}
                            </label>
                        </div>
                    ))
                ) : (
                    <div
                        style={{
                            color: 'var(--text-secondary)',
                            fontSize: 'var(--font-size-1)',
                            fontStyle: 'italic',
                        }}
                    >
                        Click &ldquo;Load Libraries&rdquo; to see available options
                    </div>
                )}
            </div>
        );
    }
    return (
        <div className="search-control">
            <button
                ref={popover.triggerRef}
                type="button"
                className={`search-control-button${popover.show ? ' active' : ''}`}
                onClick={popover.toggle}
                onMouseEnter={() => onTooltipChange('refresh', true)}
                onMouseLeave={() => onTooltipChange('refresh', false)}
                onFocus={() => onTooltipChange('refresh', true)}
                onBlur={() => onTooltipChange('refresh', false)}
                disabled={isRefreshing}
            >
                {getIcon('mi:refresh')}
                <span className="search-control-label">
                    {isRefreshing ? 'Refreshing...' : 'REFRESH'}
                </span>
            </button>
            <TooltipFactory
                anchor={popover.triggerRef.current}
                text={isRefreshing ? 'Refreshing...' : 'Refresh database'}
                show={showTooltips.refresh && !popover.show}
            />

            <PopoverFactory
                variant="default"
                show={popover.show}
                onClose={popover.close}
                triggerRef={popover.triggerRef}
                position="bottom"
                ariaLabel="Refresh database options"
                className="popover--wide"
            >
                <PopoverHeader
                    title="Refresh Database"
                    actions={[
                        {
                            key: 'selectAll',
                            icon: getIcon('mi:select_all'),
                            onClick: onSelectAllOverall,
                            title: 'Select all instances and libraries',
                        },
                        {
                            key: 'deselectAll',
                            icon: getIcon('mi:clear'),
                            onClick: onDeselectAllOverall,
                            title: 'Deselect everything',
                        },
                    ]}
                />
                <div className="refresh-popover-content">
                    {/* Radarr Instances Section */}
                    {renderInstanceSection(
                        'radarr',
                        availableInstances.radarrInstances,
                        onSelectAllRadarr,
                        onDeselectAllRadarr
                    )}

                    {/* Sonarr Instances Section */}
                    {renderInstanceSection(
                        'sonarr',
                        availableInstances.sonarrInstances,
                        onSelectAllSonarr,
                        onDeselectAllSonarr
                    )}

                    {/* Plex Libraries Section */}
                    {renderLibrariesSection()}

                    {selectedRefreshOptions.plexInstances.length > 0 && (
                        <div
                            style={{
                                padding: 'var(--space-3)',
                                backgroundColor: 'var(--surface-variant)',
                                border: `var(--border-width-1) solid var(--accent)`,
                                borderRadius: 'var(--radius-2)',
                                fontSize: 'var(--font-size-1)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <strong>Auto-selected Plex instances:</strong>{' '}
                            {selectedRefreshOptions.plexInstances.join(', ')}
                        </div>
                    )}
                </div>
                <PopoverActions
                    onCancel={popover.close}
                    onPrimary={onRefreshExecute}
                    primaryText="Refresh Selected"
                    primaryDisabled={false}
                />
            </PopoverFactory>
        </div>
    );
}

export default RefreshControls;
