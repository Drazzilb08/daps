// ui/src/components/search/plugins/subplugins/SubPluginRegistry.js
// Registry for MediaSearch sub-plugins

/**
 * SubPlugin Registry
 * Manages registration and access to sub-plugins for MediaSearch
 */
class SubPluginRegistry {
    constructor() {
        this.plugins = new Map();
        this.defaultPlugin = null;
    }

    /**
     * Register a sub-plugin
     */
    register(plugin) {
        if (!plugin || !plugin.id) {
            throw new Error('Sub-plugin must have an id property');
        }

        this.plugins.set(plugin.id, plugin);

        // Set first registered plugin as default
        if (!this.defaultPlugin) {
            this.defaultPlugin = plugin.id;
        }

        console.log(`SubPlugin registered: ${plugin.id} (${plugin.name})`);
    }

    /**
     * Get a sub-plugin by ID
     */
    get(pluginId) {
        return this.plugins.get(pluginId);
    }

    /**
     * Check if a sub-plugin exists
     */
    has(pluginId) {
        return this.plugins.has(pluginId);
    }

    /**
     * Get all registered sub-plugin IDs
     */
    getPluginIds() {
        return Array.from(this.plugins.keys());
    }

    /**
     * Get all registered sub-plugins
     */
    getPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Get the default sub-plugin ID
     */
    getDefaultPlugin() {
        return this.defaultPlugin;
    }

    /**
     * Set the default sub-plugin
     */
    setDefaultPlugin(pluginId) {
        if (!this.has(pluginId)) {
            throw new Error(`Sub-plugin ${pluginId} is not registered`);
        }
        this.defaultPlugin = pluginId;
    }

    /**
     * Find the best sub-plugin for a media item
     */
    findBestPlugin(mediaItem) {
        // Check each plugin to see if it can handle the media item
        for (const plugin of this.plugins.values()) {
            if (plugin.canHandle && plugin.canHandle(mediaItem)) {
                return plugin;
            }
        }

        // Fall back to default plugin
        return this.get(this.defaultPlugin);
    }

    /**
     * Clear all registered sub-plugins
     */
    clear() {
        this.plugins.clear();
        this.defaultPlugin = null;
    }

    /**
     * Get registry statistics
     */
    getStats() {
        return {
            totalPlugins: this.plugins.size,
            defaultPlugin: this.defaultPlugin,
            registeredPlugins: this.getPluginIds(),
        };
    }
}

// Create singleton instance
const subPluginRegistry = new SubPluginRegistry();

export default subPluginRegistry;
