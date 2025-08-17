// ui/src/components/search/index.js
// Main exports for the search system

// Core components
export { default as SearchCore } from './core/SearchCore';
export { default as SearchControls } from './SearchControls';
export { default as ModularSearchResults } from './ModularSearchResults';
export { default as HoverPreview } from './HoverPreview';

// Plugin system exports
export {
    searchPluginRegistry,
    AssetsSearchComponent,
    GdriveSearchComponent,
    createSearchComponent,
    SimpleSearchPlugin,
} from './plugins';

// Legacy adapters (still usable with SearchCore)
export { assetsSearchAdapter } from './adapters/AssetsSearchAdapter';
export { gdriveSearchAdapter } from './adapters/GdriveSearchAdapter';

// Default export is the plugin registry
export { default } from './plugins';
