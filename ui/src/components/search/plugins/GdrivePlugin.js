// ui/src/components/search/plugins/GdrivePlugin.js
// GDrive search plugin with isolated business logic

import { PluginBuilder } from './PluginSchema';
import { gdriveSearchAdapter } from '../adapters/GdriveSearchAdapter';

/**
 * Enhanced GDrive adapter with plugin-specific logic
 */
const enhancedGdriveAdapter = {
    ...gdriveSearchAdapter,
    
    _lastLoadedData: null,
    
    async loadInitialData(currentSource) {
        const data = await gdriveSearchAdapter.loadInitialData(currentSource);
        this._lastLoadedData = data;
        return data;
    },
    
    search(data, searchTerm, filters, currentSource) {
        let results = gdriveSearchAdapter.search(data, searchTerm, filters, currentSource);
        results = gdriveSearchAdapter.filter(results, filters, currentSource);
        return results;
    },
    
    sort(results, sortOption, currentSource) {
        const priorityOrder = this._lastLoadedData?.priorityOrder || {};
        return gdriveSearchAdapter.sort(results, sortOption, currentSource, priorityOrder);
    }
};

/**
 * GDrive Search Plugin
 * Business logic is completely isolated - UI components are shared
 */
export const gdrivePluginConfig = new PluginBuilder('gdrive-search', 'GDrive Search')
    .setMetadata('1.0.0', 'Search and browse posters from Google Drive and custom sources')
    .setAdapter(enhancedGdriveAdapter)
    .addSource('gdrive', 'GDrive', 'mi:cloud', 'Search posters in Google Drive sources (from GDrive Sync settings)')
    .addSource('custom', 'Custom', 'mi:folder_special', 'Search posters in user-defined folders from Poster Renamerr settings')
    .setUI({
        placeholder: 'Search posters in GDrive/Custom sources...',
        defaultView: 'grid',
        defaultSort: 'priority-asc',
        defaultSource: 'gdrive',
        renderer: 'poster',
        groupBy: 'location',
        enableHoverPreview: true,
        enableVirtualization: true,
        virtualizationThreshold: 150,
        sortOptions: [
            { value: 'priority-asc', label: 'Priority ↑' },
            { value: 'priority-desc', label: 'Priority ↓' },
            { value: 'alpha', label: 'A-Z' },
            { value: 'alpha-desc', label: 'Z-A' },
            { value: 'date', label: 'Date Added' },
        ]
    })
    .setDynamicConfig({
        // Dynamic filters based on loaded data
        dynamicFilters: (data, plugin) => {
            if (data && data.gdriveOwners && data.gdriveOwners.length > 0) {
                // Store available owners in plugin state
                plugin.setState('availableOwners', data.gdriveOwners);
                
                return [{
                    key: 'selectedGDriveOwner',
                    type: 'dropdown',
                    label: 'Filter by GDrive owner',
                    icon: 'mi:person',
                    options: [
                        { value: '', label: 'All Owners' },
                        ...data.gdriveOwners.map(owner => ({
                            value: owner,
                            label: owner,
                        })),
                    ],
                }];
            }
            return [];
        }
    })
    .setEventHandlers({
        onDataLoaded: (_, data) => {
            console.log('GDrive data loaded:', data ? Object.keys(data) : 'null');
        },
        onError: (_, error) => {
            console.warn('GDrive plugin error:', error.message);
        }
    })
    .addHooks({
        onInit: () => {
            console.log('GDrive Search Plugin initialized');
        },
        onDestroy: () => {
            console.log('GDrive Search Plugin destroyed');
        }
    })
    .build();

// Register the plugin automatically
import pluginRegistry from './PluginRegistry';

if (!pluginRegistry.getPlugin('gdrive-search')) {
    pluginRegistry.registerPlugin(gdrivePluginConfig);
}

export default gdrivePluginConfig;