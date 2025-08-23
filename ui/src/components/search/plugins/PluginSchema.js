// ui/src/components/search/plugins/PluginSchema.js
// Plugin schema for plugins with isolated business logic but shared UI

/**
 * Plugin Schema
 * Plugins control behavior through configuration - UI components remain shared
 */
export const PLUGIN_SCHEMA = {
    // Plugin metadata
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    version: { type: 'string', default: '1.0.0' },
    description: { type: 'string', default: '' },

    // Business Logic Adapter (completely isolated per plugin)
    adapter: {
        type: 'object',
        required: true,
        description: 'Plugin-specific business logic - completely isolated',
        properties: {
            loadInitialData: { type: 'function', required: true },
            search: { type: 'function', required: true },
            filter: { type: 'function', required: false },
            sort: { type: 'function', required: false },
            formatResult: { type: 'function', required: false },
        },
    },

    // UI Behavior Configuration (controls shared components)
    uiConfig: {
        type: 'object',
        required: true,
        description: 'Configuration that controls how shared UI components behave',
        properties: {
            // Search sources (plugin-specific)
            sources: {
                type: 'array',
                required: true,
                description: 'Search sources this plugin provides',
            },

            // Filter definitions (plugin-specific)
            filters: {
                type: 'array',
                default: [],
                description: 'Filter configurations for SearchControls',
            },

            // Sort options (plugin-specific)
            sortOptions: {
                type: 'array',
                default: [],
                description: 'Sort options for SearchControls',
            },

            // UI behavior settings
            placeholder: { type: 'string', required: true },
            defaultView: { type: 'string', default: 'grid' },
            defaultSort: { type: 'string', required: true },
            defaultSource: { type: 'string', required: false },

            // Results rendering settings
            renderer: { type: 'string', default: 'simple' },
            groupBy: { type: 'string', required: false },
            enableHoverPreview: { type: 'boolean', default: true },
        },
    },

    // Plugin-specific event handlers (business logic)
    eventHandlers: {
        type: 'object',
        default: {},
        description: 'Plugin-specific event handlers for business logic',
        properties: {
            onDataLoaded: { type: 'function', required: false },
            onSearchComplete: { type: 'function', required: false },
            onResultClick: { type: 'function', required: false },
            onResultDelete: { type: 'function', required: false },
            onError: { type: 'function', required: false },
            onSourceChange: { type: 'function', required: false },
        },
    },

    // Dynamic behavior (for complex plugins like GDrive)
    dynamicConfig: {
        type: 'object',
        default: {},
        description: 'Configuration that can change based on loaded data',
        properties: {
            dynamicFilters: { type: 'function', required: false },
            dynamicSources: { type: 'function', required: false },
        },
    },

    // Plugin lifecycle hooks (business logic only)
    hooks: {
        type: 'object',
        default: {},
        properties: {
            onInit: { type: 'function', required: false },
            onDestroy: { type: 'function', required: false },
            onMount: { type: 'function', required: false },
            onUnmount: { type: 'function', required: false },
        },
    },
};

/**
 * Plugin Builder
 */
export class PluginBuilder {
    constructor(id, name) {
        this.config = {
            id,
            name,
            version: '1.0.0',
            description: '',
            uiConfig: {
                sources: [],
                filters: [],
                sortOptions: [],
                placeholder: 'Search...',
                defaultView: 'grid',
                defaultSort: 'alpha',
                renderer: 'simple',
                enableHoverPreview: true,
            },
            eventHandlers: {},
            dynamicConfig: {},
            hooks: {},
        };
    }

    setMetadata(version, description) {
        this.config.version = version;
        this.config.description = description;
        return this;
    }

    setAdapter(adapter) {
        this.config.adapter = adapter;
        return this;
    }

    addSource(key, label, icon, tooltip) {
        this.config.uiConfig.sources.push({ key, label, icon, tooltip });
        return this;
    }

    addFilter(key, type, label, options, icon) {
        this.config.uiConfig.filters.push({ key, type, label, options, icon });
        return this;
    }

    setSortOptions(sortOptions) {
        this.config.uiConfig.sortOptions = sortOptions;
        return this;
    }

    setUI(uiSettings) {
        this.config.uiConfig = { ...this.config.uiConfig, ...uiSettings };
        return this;
    }

    setEventHandlers(handlers) {
        this.config.eventHandlers = { ...this.config.eventHandlers, ...handlers };
        return this;
    }

    setDynamicConfig(dynamicConfig) {
        this.config.dynamicConfig = { ...this.config.dynamicConfig, ...dynamicConfig };
        return this;
    }

    addHooks(hooks) {
        this.config.hooks = { ...this.config.hooks, ...hooks };
        return this;
    }

    build() {
        this.validate();
        return Object.freeze({ ...this.config });
    }

    validate() {
        if (!this.config.adapter) {
            throw new Error(`Plugin ${this.config.id} must provide an adapter`);
        }

        if (!this.config.uiConfig.sources.length) {
            throw new Error(`Plugin ${this.config.id} must provide at least one source`);
        }

        if (!this.config.uiConfig.placeholder) {
            throw new Error(`Plugin ${this.config.id} must provide a placeholder`);
        }

        if (!this.config.uiConfig.defaultSort) {
            throw new Error(`Plugin ${this.config.id} must provide a defaultSort`);
        }
    }
}

/**
 * Plugin Validator
 */
export class PluginValidator {
    static validate(config) {
        const errors = [];

        // Check adapter
        if (!config.adapter) {
            errors.push('Plugin must provide an adapter');
        } else {
            const requiredMethods = ['loadInitialData', 'search'];
            for (const method of requiredMethods) {
                if (typeof config.adapter[method] !== 'function') {
                    errors.push(`Adapter must provide ${method} method`);
                }
            }
        }

        // Check UI config
        if (!config.uiConfig) {
            errors.push('Plugin must provide uiConfig');
        } else {
            const required = ['sources', 'placeholder', 'defaultSort'];
            for (const field of required) {
                if (!config.uiConfig[field]) {
                    errors.push(`uiConfig must provide ${field}`);
                }
            }

            if (!Array.isArray(config.uiConfig.sources) || config.uiConfig.sources.length === 0) {
                errors.push('uiConfig.sources must be a non-empty array');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Plugin validation failed:\n${errors.join('\n')}`);
        }

        return true;
    }
}

export default PluginBuilder;
