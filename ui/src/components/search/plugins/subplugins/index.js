// ui/src/components/search/plugins/subplugins/index.js
// Central registry and exports for MediaSearch sub-plugins

import subPluginRegistry from './SubPluginRegistry';
import { labelarrSubPlugin } from './LabelarrSubPlugin';

// Register all sub-plugins
subPluginRegistry.register(labelarrSubPlugin);

// Set default sub-plugin
subPluginRegistry.setDefaultPlugin('labelarr');

console.log('✅ MediaSearch sub-plugins registered:', subPluginRegistry.getStats());

// Export the registry and sub-plugins
export { default as subPluginRegistry } from './SubPluginRegistry';
export { labelarrSubPlugin } from './LabelarrSubPlugin';

// Export default as registry
export default subPluginRegistry;
