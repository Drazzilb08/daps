// ui/src/components/search/plugins/SimpleSearchPlugin.jsx
// Plugin wrapper that uses shared UI with isolated business logic

import React from 'react';
import SearchCore from '../core/SearchCore';
import pluginRegistry from './PluginRegistry';

/**
 * Plugin Search Component
 * Uses shared SearchCore UI with plugin-specific business logic
 */
export default function SimpleSearchPlugin({ pluginId, overrideConfig = {}, ...additionalProps }) {
    // Handle dynamic configuration (plugin-specific logic)
    const [dynamicFilters, setDynamicFilters] = React.useState([]);

    // Get plugin from registry
    const plugin = pluginRegistry.getPlugin(pluginId);

    // Plugin-specific data loaded handler
    const handleDataLoaded = React.useCallback(
        data => {
            // Handle dynamic filters using plugin's dynamic config
            if (plugin?.dynamicConfig?.dynamicFilters) {
                try {
                    const filters = plugin.dynamicConfig.dynamicFilters(data, plugin);
                    setDynamicFilters(filters || []);
                } catch (error) {
                    console.error(`Plugin ${pluginId} dynamic filters failed:`, error);
                    plugin.logError(error);
                    setDynamicFilters([]);
                }
            }

            // Execute plugin event handler
            if (plugin) {
                pluginRegistry.executeEventHandler(plugin, 'onDataLoaded', data);
            }

            // Call original handler if provided
            if (additionalProps.onDataLoaded) {
                additionalProps.onDataLoaded(data);
            }
        },
        [pluginId, plugin, additionalProps]
    );

    // Plugin-specific event handlers
    const handleError = React.useCallback(
        error => {
            if (plugin) {
                pluginRegistry.executeEventHandler(plugin, 'onError', error);
            }
            if (additionalProps.onError) {
                additionalProps.onError(error);
            }
        },
        [plugin, additionalProps]
    );

    const handleResultDelete = React.useCallback(() => {
        if (plugin) {
            pluginRegistry.executeEventHandler(plugin, 'onResultDelete');
        }
        if (additionalProps.onResultDelete) {
            additionalProps.onResultDelete();
        }
    }, [plugin, additionalProps]);

    const handleSourceChange = React.useCallback(
        newSource => {
            if (plugin) {
                pluginRegistry.executeEventHandler(plugin, 'onSourceChange', newSource);
            }
            if (additionalProps.onSourceChange) {
                additionalProps.onSourceChange(newSource);
            }
        },
        [plugin, additionalProps]
    );

    const handleRefresh = React.useCallback(
        refreshOptions => {
            if (plugin) {
                pluginRegistry.executeEventHandler(
                    plugin,
                    'onRefresh',
                    refreshOptions,
                    additionalProps
                );
            }
            if (additionalProps.onRefresh) {
                additionalProps.onRefresh(refreshOptions);
            }
        },
        [plugin, additionalProps]
    );

    // Dynamic sort options based on current source (for GDrive plugin)
    const [currentSourceForSort, setCurrentSourceForSort] = React.useState(
        plugin?.uiConfig?.defaultSource || overrideConfig.defaultSource || 'gdrive'
    );

    const config = plugin
        ? {
              ...plugin.uiConfig,
              ...overrideConfig,
          }
        : { sortOptions: [] };

    const dynamicSortOptions = React.useMemo(() => {
        // Only apply dynamic filtering for gdrive-search plugin
        if (pluginId === 'gdrive-search' && currentSourceForSort === 'custom') {
            // Filter out priority sorting options for custom sources
            return config.sortOptions.filter(option => !option.value.startsWith('priority-'));
        }
        return config.sortOptions;
    }, [config.sortOptions, currentSourceForSort, pluginId]);

    // Handle source changes to update sort options
    const handleSourceChangeWithSort = React.useCallback(
        newSource => {
            setCurrentSourceForSort(newSource);
            handleSourceChange(newSource);
        },
        [handleSourceChange]
    );

    // Mount/unmount plugin
    React.useEffect(() => {
        if (plugin) {
            plugin.mount();
            return () => plugin.unmount();
        }
    }, [plugin]);

    if (!plugin) {
        return (
            <div className="plugin-error">
                <h3>Plugin Error</h3>
                <p>Plugin &apos;{pluginId}&apos; not found in registry</p>
                <p>
                    Available plugins:{' '}
                    {pluginRegistry
                        .getAllPlugins()
                        .map(p => p.id)
                        .join(', ')}
                </p>
            </div>
        );
    }

    return (
        <SearchCore
            // Data adapter (isolated per plugin)
            searchAdapter={plugin.adapter}
            // UI configuration (controls shared components)
            sources={config.sources}
            filters={[...config.filters, ...dynamicFilters]}
            sortOptions={dynamicSortOptions}
            // UI behavior settings
            placeholder={config.placeholder}
            defaultView={config.defaultView}
            defaultSort={config.defaultSort}
            defaultSource={config.defaultSource || config.sources[0]?.key}
            renderer={config.renderer}
            groupBy={config.groupBy}
            enableHoverPreview={config.enableHoverPreview}
            enableAutocomplete={config.enableAutocomplete}
            autocompleteMinLength={config.autocompleteMinLength}
            // Refresh controls
            showRefreshControls={config.showRefreshControls}
            showAdvancedSearchHelp={config.showAdvancedSearchHelp}
            // UI Customization
            selectorLabel={config.selectorLabel}
            showJumpBar={config.showJumpBar}
            // Modal component (plugin-provided)
            modalComponent={config.modalComponent}
            // Event handlers (plugin-specific business logic)
            onDataLoaded={handleDataLoaded}
            onError={handleError}
            onResultDelete={handleResultDelete}
            onSourceChange={handleSourceChangeWithSort}
            onRefresh={handleRefresh}
            // Pass through additional props including refreshTrigger
            {...additionalProps}
        />
    );
}
