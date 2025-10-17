import React, { useCallback, useMemo } from 'react';
import usePopover from '../../hooks/usePopover';
import { ModuleControl, ViewControl, SortControl, FilterControl } from './SearchControls';
import RefreshControls from './RefreshControls';

/**
 * SearchToolbar - Toolbar containing all search controls
 * Manages popover state and renders schema-driven controls
 * Extracted from SearchInterface.jsx to improve maintainability and reduce complexity
 *
 * @param {Object} schemaControls - Schema-driven controls with updateControl method
 * @param {Object} searchConfig - Search configuration
 * @param {boolean} isRefreshing - Whether refresh operation is in progress
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {Object} selectedRefreshOptions - Selected refresh options state
 * @param {Array} availableInstances - Available instances for refresh
 * @param {Array} availableLibraries - Available libraries for refresh
 * @param {boolean} loadingLibraries - Whether libraries are loading
 * @param {Function} onLoadLibraries - Callback to load libraries
 * @param {Function} onRefreshOptionToggle - Callback to toggle refresh option
 * @param {Function} onSelectAllRadarr - Callback to select all Radarr instances
 * @param {Function} onDeselectAllRadarr - Callback to deselect all Radarr instances
 * @param {Function} onSelectAllSonarr - Callback to select all Sonarr instances
 * @param {Function} onDeselectAllSonarr - Callback to deselect all Sonarr instances
 * @param {Function} onSelectAllLibraries - Callback to select all libraries
 * @param {Function} onDeselectAllLibraries - Callback to deselect all libraries
 * @param {Function} onSelectAllOverall - Callback to select all overall
 * @param {Function} onDeselectAllOverall - Callback to deselect all overall
 * @param {Function} onRefreshExecute - Callback to execute refresh
 * @returns {JSX.Element} Container with all search controls
 */
const SearchToolbar = React.memo(
    ({
        schemaControls,
        searchConfig,
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
    }) => {
        // Control popovers using new simplified pattern
        const modulePopover = usePopover();
        const viewPopover = usePopover();
        const sortPopover = usePopover();
        const filterPopover = usePopover();
        const refreshPopover = usePopover();

        // Wrap handleRefreshExecute to close popover
        const handleRefreshExecuteWithPopover = useCallback(() => {
            onRefreshExecute();
            refreshPopover.close();
        }, [onRefreshExecute, refreshPopover]);

        // Memoized popover mapping for performance
        const getPopoverForControl = useMemo(
            () => ({
                view: viewPopover,
                sort: sortPopover,
                filter: filterPopover,
                source: modulePopover,
            }),
            [viewPopover, sortPopover, filterPopover, modulePopover]
        );

        // Helper function to render schema-driven controls
        const renderSchemaControl = useCallback(
            control => {
                const popover = getPopoverForControl[control.key] || modulePopover;

                switch (control.type) {
                    case 'toggle':
                        return (
                            <ViewControl
                                key={control.key}
                                popover={popover}
                                showTooltips={showTooltips}
                                onTooltipChange={onTooltipChange}
                                currentView={schemaControls.getCurrentValue('view')}
                                onChangeView={viewValue =>
                                    schemaControls.updateControl('view', viewValue)
                                }
                                tooltip={control.tooltip}
                                icon={control.icon}
                                label={control.label}
                            />
                        );

                    case 'selector':
                        if (control.key === 'sort') {
                            return (
                                <SortControl
                                    key={control.key}
                                    popover={popover}
                                    showTooltips={showTooltips}
                                    onTooltipChange={onTooltipChange}
                                    searchConfig={searchConfig}
                                    currentSort={schemaControls.getCurrentValue('sort')}
                                    onChangeSort={sortValue =>
                                        schemaControls.updateControl('sort', sortValue)
                                    }
                                    tooltip={control.tooltip}
                                />
                            );
                        } else if (control.key === 'source') {
                            return (
                                <ModuleControl
                                    key={control.key}
                                    popover={popover}
                                    showTooltips={showTooltips}
                                    onTooltipChange={onTooltipChange}
                                    searchConfig={searchConfig}
                                    currentSource={schemaControls.getCurrentValue('source')}
                                    onChangeSource={sourceValue =>
                                        schemaControls.updateControl('source', sourceValue)
                                    }
                                    icon={control.icon}
                                    label={control.label}
                                    tooltip={control.tooltip}
                                />
                            );
                        }
                        break;

                    case 'filter':
                        return (
                            <FilterControl
                                key={control.key}
                                popover={popover}
                                showTooltips={showTooltips}
                                onTooltipChange={onTooltipChange}
                                searchConfig={searchConfig}
                                onChangeFilter={(filterKey, value) =>
                                    schemaControls.updateControl('filter', { filterKey, value })
                                }
                                tooltip={control.tooltip}
                            />
                        );

                    case 'custom':
                        if (control.customComponent === 'refresh-popover') {
                            return (
                                <RefreshControls
                                    key={control.key}
                                    popover={refreshPopover}
                                    isRefreshing={isRefreshing}
                                    showTooltips={showTooltips}
                                    onTooltipChange={onTooltipChange}
                                    selectedRefreshOptions={selectedRefreshOptions}
                                    availableInstances={availableInstances}
                                    availableLibraries={availableLibraries}
                                    loadingLibraries={loadingLibraries}
                                    onLoadLibraries={onLoadLibraries}
                                    onRefreshOptionToggle={onRefreshOptionToggle}
                                    onSelectAllRadarr={onSelectAllRadarr}
                                    onDeselectAllRadarr={onDeselectAllRadarr}
                                    onSelectAllSonarr={onSelectAllSonarr}
                                    onDeselectAllSonarr={onDeselectAllSonarr}
                                    onSelectAllLibraries={onSelectAllLibraries}
                                    onDeselectAllLibraries={onDeselectAllLibraries}
                                    onSelectAllOverall={onSelectAllOverall}
                                    onDeselectAllOverall={onDeselectAllOverall}
                                    onRefreshExecute={handleRefreshExecuteWithPopover}
                                />
                            );
                        }
                        return null;

                    default:
                        return null;
                }
            },
            [
                getPopoverForControl,
                modulePopover,
                showTooltips,
                onTooltipChange,
                searchConfig,
                schemaControls,
                refreshPopover,
                isRefreshing,
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
                handleRefreshExecuteWithPopover,
            ]
        );

        // Early return if no controls available
        if (!schemaControls?.controls) {
            return null;
        }

        return (
            <div className="search-layout__right">
                {/* Header Controls Section - Now using schema-driven controls */}
                <div className="search-controls">
                    {schemaControls.controls.map(control => renderSchemaControl(control))}
                </div>
                {/* Right spacer for balanced centering */}
                <div className="search-layout__spacer"></div>
            </div>
        );
    }
);

SearchToolbar.displayName = 'SearchToolbar';

export default SearchToolbar;
