// ui/src/components/search/plugins/PluginRegistry.js
// Registry for plugins with isolated business logic

import { PluginValidator } from './PluginSchema';

/**
 * Plugin Registry - Advanced plugin management system
 *
 * Provides a robust architecture for isolating business logic while sharing UI components.
 * Each plugin maintains its own state, error handling, and lifecycle management while
 * leveraging common UI elements through configuration.
 *
 * Architecture principles:
 * - Business logic isolation: Each plugin has independent adapters and state
 * - Shared UI components: Common SearchResults, SearchControls, etc.
 * - Error boundaries: Plugin failures don't crash the entire system
 * - State management: Per-plugin state with controlled access
 * - Lifecycle hooks: Plugin initialization, mounting, and cleanup
 *
 * Plugin lifecycle:
 * 1. Registration: Plugin config validation and instance creation
 * 2. Initialization: onInit hook execution
 * 3. Mounting: onMount hook when plugin becomes active
 * 4. Operation: Event handlers and adapter method execution
 * 5. Unmounting: onUnmount hook when plugin deactivates
 * 6. Destruction: onDestroy hook and cleanup
 *
 * @example
 * // Register a new plugin
 * const mediaPlugin = pluginRegistry.registerPlugin({
 *   id: 'media-search',
 *   name: 'Media Search',
 *   adapter: mediaSearchAdapter,
 *   uiConfig: {
 *     sources: [{ key: 'all', label: 'All Media', icon: 'movie' }],
 *     placeholder: 'Search movies and shows...'
 *   }
 * });
 *
 * @example
 * // Access plugin for search operations
 * const plugin = pluginRegistry.getPlugin('media-search');
 * const results = await plugin.adapter.loadInitialData();
 */
class PluginRegistry {
    constructor() {
        this.plugins = new Map(); // Plugin storage with ID-based indexing
        this.initialized = false; // Registry initialization state
    }

    /**
     * Register a plugin with comprehensive validation and initialization
     *
     * Performs complete plugin lifecycle management including validation,
     * isolation setup, registration, and initialization hook execution.
     *
     * Registration process:
     * 1. Validate plugin configuration against schema
     * 2. Create isolated plugin instance with error boundaries
     * 3. Store plugin in registry with unique ID
     * 4. Execute initialization hooks
     * 5. Return plugin instance for immediate use
     *
     * @param {Object} config - Complete plugin configuration
     * @param {string} config.id - Unique plugin identifier
     * @param {string} config.name - Human-readable plugin name
     * @param {Object} config.adapter - Business logic adapter with required methods
     * @param {Object} config.uiConfig - UI behavior configuration
     * @param {Object} [config.eventHandlers] - Plugin-specific event handlers
     * @param {Object} [config.hooks] - Lifecycle hooks (onInit, onMount, etc.)
     * @returns {Object} Registered plugin instance with isolation and state management
     * @throws {Error} If plugin configuration is invalid or ID conflicts exist
     *
     * @example
     * // Register media search plugin with full configuration
     * const mediaPlugin = pluginRegistry.registerPlugin({
     *   id: 'media-search',
     *   name: 'Media Search',
     *   adapter: {
     *     loadInitialData: async () => { return []; },
     *     search: (data, term) => { return []; },
     *     formatResult: (item) => { return item; }
     *   },
     *   uiConfig: {
     *     sources: [{ key: 'all', label: 'All Media' }],
     *     placeholder: 'Search movies and shows...'
     *   },
     *   hooks: {
     *     onInit: (plugin) => console.log('Media plugin initialized')
     *   }
     * });
     */
    registerPlugin(config) {
        // Step 1: Comprehensive validation of plugin configuration
        PluginValidator.validate(config);

        // Step 2: Check for ID conflicts before creating plugin instance
        if (this.plugins.has(config.id)) {
            throw new Error(`Plugin ID '${config.id}' already registered`);
        }

        // Step 3: Create isolated plugin instance with error boundaries
        const plugin = this.createPlugin(config);

        // Step 4: Register plugin in the global registry
        this.plugins.set(config.id, plugin);

        // Step 5: Execute initialization hook for plugin setup
        this.executeHook(plugin, 'onInit');

        console.log(`✅ Plugin '${config.id}' registered successfully`);
        return plugin;
    }

    /**
     * Get plugin
     */
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }

    /**
     * Get all plugins
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * List plugin info for debugging
     */
    listPlugins() {
        return Array.from(this.plugins.keys()).map(id => {
            const plugin = this.plugins.get(id);
            return {
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                sources: plugin.uiConfig.sources.map(s => s.key),
            };
        });
    }

    /**
     * Unregister plugin
     */
    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);

        if (plugin) {
            this.executeHook(plugin, 'onDestroy');
            this.plugins.delete(pluginId);
            console.log(`🗑️ Plugin '${pluginId}' unregistered`);
            return true;
        }

        return false;
    }

    /**
     * Create plugin instance with business logic isolation
     */
    createPlugin(config) {
        const plugin = {
            // Plugin metadata
            id: config.id,
            name: config.name,
            version: config.version,
            description: config.description,

            // UI configuration (controls shared components)
            uiConfig: Object.freeze({ ...config.uiConfig }),

            // Event handlers (plugin-specific business logic)
            eventHandlers: Object.freeze({ ...config.eventHandlers }),

            // Dynamic configuration
            dynamicConfig: Object.freeze({ ...config.dynamicConfig }),

            // Isolated adapter with error boundaries
            adapter: this.createIsolatedAdapter(config.id, config.adapter),

            // Plugin state (completely isolated per plugin)
            _state: {},
            _errors: [],
            _mounted: false,

            // Keep reference to original config for hooks
            _originalConfig: config,

            // Plugin state management
            setState: (key, value) => {
                plugin._state[key] = value;
            },

            getState: key => {
                return key ? plugin._state[key] : { ...plugin._state };
            },

            clearState: () => {
                plugin._state = {};
            },

            // Plugin error management
            logError: error => {
                const errorEntry = {
                    timestamp: new Date(),
                    pluginId: config.id,
                    error: error.message || error,
                    stack: error.stack,
                };

                plugin._errors.push(errorEntry);
                console.error(`[Plugin ${config.id}]:`, error);

                // Execute plugin error handler
                this.executeEventHandler(plugin, 'onError', error);
            },

            getErrors: () => [...plugin._errors],
            clearErrors: () => {
                plugin._errors = [];
            },

            // Plugin lifecycle
            mount: () => {
                if (!plugin._mounted) {
                    plugin._mounted = true;
                    this.executeHook(plugin, 'onMount');
                }
            },

            unmount: () => {
                if (plugin._mounted) {
                    plugin._mounted = false;
                    this.executeHook(plugin, 'onUnmount');
                }
            },
        };

        return plugin;
    }

    /**
     * Create isolated adapter with error boundaries
     */
    createIsolatedAdapter(pluginId, adapter) {
        const isolatedAdapter = {};

        // Methods that should remain synchronous
        const syncMethods = [
            'search',
            'filter',
            'sort',
            'formatResult',
            'getAutocompleteSuggestions',
        ];

        // Wrap each adapter method with error boundaries
        for (const [methodName, method] of Object.entries(adapter)) {
            if (typeof method === 'function') {
                const isSync = syncMethods.includes(methodName);

                if (isSync) {
                    // Keep synchronous methods synchronous
                    isolatedAdapter[methodName] = (...args) => {
                        try {
                            const result = method.apply(adapter, args);
                            return result;
                        } catch (error) {
                            console.error(
                                `[Plugin ${pluginId}] Adapter method ${methodName} failed:`,
                                error
                            );

                            // Log to plugin
                            const plugin = this.plugins.get(pluginId);
                            if (plugin) {
                                plugin.logError(error);
                            }

                            // Return safe fallback
                            return this.getAdapterFallback(methodName, args, error);
                        }
                    };
                } else {
                    // Keep async methods async
                    isolatedAdapter[methodName] = async (...args) => {
                        try {
                            const result = await method.apply(adapter, args);
                            return result;
                        } catch (error) {
                            console.error(
                                `[Plugin ${pluginId}] Adapter method ${methodName} failed:`,
                                error
                            );

                            // Log to plugin
                            const plugin = this.plugins.get(pluginId);
                            if (plugin) {
                                plugin.logError(error);
                            }

                            // Return safe fallback
                            return this.getAdapterFallback(methodName, args, error);
                        }
                    };
                }
            } else {
                isolatedAdapter[methodName] = method;
            }
        }

        return isolatedAdapter;
    }

    /**
     * Execute plugin hook safely
     */
    executeHook(plugin, hookName, ...args) {
        const hook = plugin._originalConfig?.hooks?.[hookName];

        if (hook && typeof hook === 'function') {
            try {
                hook(plugin, ...args);
            } catch (error) {
                console.error(`[Plugin ${plugin.id}] Hook ${hookName} failed:`, error);
                plugin.logError(error);
            }
        }
    }

    /**
     * Execute plugin event handler safely
     */
    executeEventHandler(plugin, eventName, ...args) {
        const handler = plugin.eventHandlers[eventName];

        if (handler && typeof handler === 'function') {
            try {
                return handler(plugin, ...args);
            } catch (error) {
                console.error(`[Plugin ${plugin.id}] Event handler ${eventName} failed:`, error);
                plugin.logError(error);
                return null;
            }
        }
    }

    /**
     * Get adapter fallback values
     */
    getAdapterFallback(methodName, args, error) {
        switch (methodName) {
            case 'loadInitialData':
                return {
                    error: error.message || 'Failed to load data',
                    data: null,
                };
            case 'search':
                return [];
            case 'filter':
                return args[0] || [];
            case 'sort':
                return args[0] || [];
            case 'formatResult': {
                const item = args[0] || {};
                return {
                    id: item.id || item.file || item.name || 'unknown',
                    title: item.title || item.file || item.name || 'Unknown',
                    subtitle: '',
                    imageUrl: '',
                    metadata: {},
                    ...item,
                };
            }
            default:
                return null;
        }
    }
}

// Create and export global registry
const pluginRegistry = new PluginRegistry();

export default pluginRegistry;
export { PluginRegistry };
