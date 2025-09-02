import React from 'react';
import { getIcon, humanize } from '../../utils/tools';
import TooltipFactory from '../Tooltip';
import PopoverFactory from '../PopoverFactory';

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
                <div
                    className="refresh-popover-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <div className="popover__title">Refresh Database</div>
                    <div
                        className="overall-select-buttons"
                        style={{ display: 'flex', gap: 'var(--space-2)' }}
                    >
                        <button
                            type="button"
                            className="select-icon-btn"
                            onClick={onSelectAllOverall}
                            title="Select all instances and libraries"
                        >
                            {getIcon('mi:select_all')}
                        </button>
                        <button
                            type="button"
                            className="select-icon-btn"
                            onClick={onDeselectAllOverall}
                            title="Deselect everything"
                        >
                            {getIcon('mi:clear')}
                        </button>
                    </div>
                </div>
                <div className="refresh-popover-content">
                    {/* Radarr Instances Section */}
                    {availableInstances.radarrInstances.length > 0 ? (
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
                                    Radarr Instances
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
                                        onClick={onSelectAllRadarr}
                                        title="Select all Radarr instances"
                                    >
                                        {getIcon('mi:check_box')}
                                    </button>
                                    <button
                                        type="button"
                                        className="select-icon-btn"
                                        onClick={onDeselectAllRadarr}
                                        title="Deselect all Radarr instances"
                                    >
                                        {getIcon('mi:check_box_outline_blank')}
                                    </button>
                                </div>
                            </div>
                            {availableInstances.radarrInstances.map(instance => (
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
                                        id={`header-radarr-${instance}`}
                                        checked={selectedRefreshOptions.arrInstances.includes(
                                            instance
                                        )}
                                        onChange={() => {}}
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <label
                                        htmlFor={`header-radarr-${instance}`}
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
                    ) : (
                        <div className="refresh-section" style={{ marginBottom: 'var(--space-4)' }}>
                            <h5
                                style={{
                                    margin: '0 0 var(--space-2) 0',
                                    fontSize: 'var(--font-size-2)',
                                    fontWeight: 'var(--font-weight-semibold)',
                                }}
                            >
                                Radarr Instances
                            </h5>
                            <div
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-size-1)',
                                    fontStyle: 'italic',
                                }}
                            >
                                No Radarr instances configured
                            </div>
                        </div>
                    )}

                    {/* Sonarr Instances Section */}
                    {availableInstances.sonarrInstances.length > 0 ? (
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
                                    Sonarr Instances
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
                                        onClick={onSelectAllSonarr}
                                        title="Select all Sonarr instances"
                                    >
                                        {getIcon('mi:check_box')}
                                    </button>
                                    <button
                                        type="button"
                                        className="select-icon-btn"
                                        onClick={onDeselectAllSonarr}
                                        title="Deselect all Sonarr instances"
                                    >
                                        {getIcon('mi:check_box_outline_blank')}
                                    </button>
                                </div>
                            </div>
                            {availableInstances.sonarrInstances.map(instance => (
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
                                        id={`header-sonarr-${instance}`}
                                        checked={selectedRefreshOptions.arrInstances.includes(
                                            instance
                                        )}
                                        onChange={() => {}}
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <label
                                        htmlFor={`header-sonarr-${instance}`}
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
                    ) : (
                        <div className="refresh-section" style={{ marginBottom: 'var(--space-4)' }}>
                            <h5
                                style={{
                                    margin: '0 0 var(--space-2) 0',
                                    fontSize: 'var(--font-size-2)',
                                    fontWeight: 'var(--font-weight-semibold)',
                                }}
                            >
                                Sonarr Instances
                            </h5>
                            <div
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-size-1)',
                                    fontStyle: 'italic',
                                }}
                            >
                                No Sonarr instances configured
                            </div>
                        </div>
                    )}

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
                <div className="popover__divider" style={{ margin: 'var(--space-4) 0' }}></div>
                <div
                    className="refresh-popover-actions"
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-3)',
                    }}
                >
                    <button type="button" className="btn btn-secondary" onClick={popover.close}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onRefreshExecute}
                        disabled={false}
                    >
                        Refresh Selected
                    </button>
                </div>
            </PopoverFactory>
        </div>
    );
}

export default RefreshControls;
