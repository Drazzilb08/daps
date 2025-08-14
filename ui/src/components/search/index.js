// ui/src/components/search/index.js
// Main exports for the SearchEngine system

// Core components
export { default as SearchEngine } from './SearchEngine';
export { default as SearchControls } from './SearchControls';

// Pre-configured variants (main exports)
export {
    AssetsSearchEngine,
    GdriveSearchEngine,
    assetsSearchAdapter,
    gdriveSearchAdapter,
} from './SearchEngineFactory.jsx';

// Factory as default export
export { default } from './SearchEngineFactory.jsx';
