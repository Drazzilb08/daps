// ui/src/components/search/plugins/AssetsPlugin.js
// Assets search plugin with isolated business logic

import { PluginBuilder } from './PluginSchema';
import { assetsSearchAdapter } from '../adapters/AssetsSearchAdapter';

/**
 * Assets Search Plugin
 * Business logic is completely isolated - UI components are shared
 */
export const assetsPluginConfig = new PluginBuilder('assets-search', 'Assets Search')
    .setMetadata('1.0.0', 'Search and browse poster assets in the local assets directory')
    .setAdapter(assetsSearchAdapter)
    .addSource('assets', 'Assets', 'mi:folder', 'Search Assets')
    .addFilter(
        'assetTypeFilter',
        'dropdown',
        'Filter by type of asset in Assets tab',
        [
            { value: 'all', label: 'All' },
            { value: 'collections', label: 'Collections' },
            { value: 'movies', label: 'Movies' },
            { value: 'shows', label: 'Shows' },
        ],
        'mi:filter_list'
    )
    .setUI({
        placeholder: 'Search posters in Assets Directory...',
        defaultView: 'grid',
        defaultSort: 'alpha',
        defaultSource: 'assets',
        renderer: 'poster',
        enableHoverPreview: true,
        enableVirtualization: true,
        virtualizationThreshold: 100,
        sortOptions: [
            { value: 'alpha', label: 'A-Z' },
            { value: 'alpha-desc', label: 'Z-A' },
            { value: 'date', label: 'Date Added' },
        ],
    })
    .setEventHandlers({
        onDataLoaded: (_, data) => {
            console.log('Assets data loaded:', data ? Object.keys(data) : 'null');
        },
        onError: (_, error) => {
            console.warn('Assets plugin error:', error.message);
        },
    })
    .addHooks({
        onInit: () => {
            console.log('Assets Search Plugin initialized');
        },
        onDestroy: () => {
            console.log('Assets Search Plugin destroyed');
        },
    })
    .build();

// Register the plugin automatically
import pluginRegistry from './PluginRegistry';

if (!pluginRegistry.getPlugin('assets-search')) {
    pluginRegistry.registerPlugin(assetsPluginConfig);
}

export default assetsPluginConfig;
