// ui/src/components/search/plugins/PluginRegistry.js
// Registry for plugins with isolated business logic

import { PluginValidator } from './PluginSchema';

/**
 * Plugin Registry
 * Manages plugins with business logic isolation but shared UI components
 */
class PluginRegistry {
    constructor() {
        this.plugins = new Map();
        this.initialized = false;
    }

    /**
     * Register a smart plugin with isolated business logic
     */
    registerPlugin(config) {
        // Validate plugin
        PluginValidator.validate(config);
        
        // Create plugin instance with business logic isolation
        const plugin = this.createPlugin(config);
        
        // Register
        this.plugins.set(config.id, plugin);
        
        // Execute init hook
        this.executeHook(plugin, 'onInit');
        
        console.log(`✅ Plugin '${config.id}' registered`);
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
                sources: plugin.uiConfig.sources.map(s => s.key)
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
            
            getState: (key) => {
                return key ? plugin._state[key] : { ...plugin._state };
            },
            
            clearState: () => {
                plugin._state = {};
            },
            
            // Plugin error management
            logError: (error) => {
                const errorEntry = {
                    timestamp: new Date(),
                    pluginId: config.id,
                    error: error.message || error,
                    stack: error.stack
                };
                
                plugin._errors.push(errorEntry);
                console.error(`[Plugin ${config.id}]:`, error);
                
                // Execute plugin error handler
                this.executeEventHandler(plugin, 'onError', error);
            },
            
            getErrors: () => [...plugin._errors],
            clearErrors: () => { plugin._errors = []; },
            
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
            }
        };

        return plugin;
    }

    /**
     * Create isolated adapter with error boundaries
     */
    createIsolatedAdapter(pluginId, adapter) {
        const isolatedAdapter = {};
        
        // Wrap each adapter method with error boundaries
        for (const [methodName, method] of Object.entries(adapter)) {
            if (typeof method === 'function') {
                isolatedAdapter[methodName] = async (...args) => {
                    try {
                        const result = await method.apply(adapter, args);
                        return result;
                    } catch (error) {
                        console.error(`[Plugin ${pluginId}] Adapter method ${methodName} failed:`, error);
                        
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
                    data: null 
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
                    ...item
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