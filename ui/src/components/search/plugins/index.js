// ui/src/components/search/plugins/index.js
// Central export point for all search plugins

import React from 'react';

// Import all plugins to automatically register them
import './AssetsPlugin.jsx';
import './GdrivePlugin.jsx';
import './MediaSearchPlugin';

// Export plugin system
export { default as pluginRegistry } from './PluginRegistry';
export { PluginBuilder, PluginValidator } from './PluginSchema';

// Export plugin configs for direct access if needed
export { assetsPluginConfig } from './AssetsPlugin.jsx';
export { gdrivePluginConfig } from './GdrivePlugin.jsx';
export { mediaSearchPluginConfig } from './MediaSearchPlugin';

// Import SimpleSearchPlugin for createSearchComponent
import SimpleSearchPlugin from './SimpleSearchPlugin.jsx';

// Export core search components
export { default as SearchCore } from '../core/SearchCore';
export { SimpleSearchPlugin };

// Utility function to create a search component for a specific plugin
export const createSearchComponent = (pluginId, overrideConfig = {}) => {
    const PluginComponent = props =>
        React.createElement(SimpleSearchPlugin, {
            pluginId,
            overrideConfig,
            ...props,
        });

    PluginComponent.displayName = `SearchPlugin(${pluginId})`;
    return PluginComponent;
};

// Pre-configured components for common use cases
export const AssetsSearchComponent = createSearchComponent('assets-search');
export const GdriveSearchComponent = createSearchComponent('gdrive-search');
export const MediaSearchComponent = createSearchComponent('media-search');

// Default export is the plugin registry
export { default } from './PluginRegistry';
