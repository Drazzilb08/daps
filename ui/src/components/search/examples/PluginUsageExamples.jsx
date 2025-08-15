// ui/src/components/search/examples/PluginUsageExamples.jsx
// Examples demonstrating plugin isolation and usage

import React from 'react';
import {
    AssetsSearchComponent,
    GdriveSearchComponent,
    SearchCore,
    searchPluginRegistry,
} from '../plugins';
import { assetsSearchAdapter } from '../adapters/AssetsSearchAdapter';

/**
 * Example 1: Using pre-configured plugin components
 */
export function Example1_PluginComponents() {
    return (
        <div>
            <h2>Assets Search (Plugin)</h2>
            <AssetsSearchComponent
                onResultClick={result => console.log('Assets result clicked:', result)}
            />

            <h2>GDrive Search (Plugin)</h2>
            <GdriveSearchComponent
                onResultClick={result => console.log('GDrive result clicked:', result)}
            />
        </div>
    );
}

/**
 * Example 2: Using SearchCore directly (no plugin system)
 */
export function Example2_DirectCore() {
    return (
        <div>
            <h2>Direct SearchCore Usage</h2>
            <SearchCore
                searchAdapter={assetsSearchAdapter}
                sources={[{ key: 'assets', label: 'Assets', icon: 'mi:folder' }]}
                filters={[
                    {
                        key: 'assetTypeFilter',
                        type: 'dropdown',
                        label: 'Filter by asset type',
                        options: [
                            { value: 'all', label: 'All' },
                            { value: 'movies', label: 'Movies' },
                            { value: 'shows', label: 'Shows' },
                        ],
                    },
                ]}
                sortOptions={[
                    { value: 'alpha', label: 'A-Z' },
                    { value: 'alpha-desc', label: 'Z-A' },
                ]}
                placeholder="Search assets directly..."
                renderer="poster"
                onResultClick={result => console.log('Direct core result:', result)}
            />
        </div>
    );
}

/**
 * Example 3: Custom plugin registration
 */
export function Example3_CustomPlugin() {
    React.useEffect(() => {
        // Register a custom plugin
        if (!searchPluginRegistry.hasPlugin('custom-test')) {
            searchPluginRegistry.registerPlugin({
                id: 'custom-test',
                name: 'Custom Test Plugin',
                version: '1.0.0',
                description: 'A test plugin for demonstration',

                adapter: {
                    async loadInitialData() {
                        return {
                            testData: ['item1', 'item2', 'item3'],
                        };
                    },

                    search(data, searchTerm) {
                        if (!searchTerm) return [];
                        return data.testData.filter(item =>
                            item.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    },

                    formatResult(item) {
                        return {
                            id: item,
                            title: item,
                            subtitle: 'Test item',
                            imageUrl: '',
                            metadata: { type: 'test' },
                        };
                    },
                },

                sources: [{ key: 'test', label: 'Test Source', icon: 'mi:science' }],

                filters: [],

                sortOptions: [{ value: 'alpha', label: 'A-Z' }],

                ui: {
                    placeholder: 'Search test items...',
                    defaultView: 'list',
                    defaultSort: 'alpha',
                    renderer: 'simple',
                    enableHoverPreview: false,
                },

                hooks: {
                    onInit: () => console.log('Custom plugin initialized'),
                    onDataLoaded: data => console.log('Custom plugin data loaded:', data),
                },
            });
        }
    }, []);

    return (
        <div>
            <h2>Custom Plugin Example</h2>
            <p>Check console for plugin lifecycle logs</p>
        </div>
    );
}

/**
 * Example 4: Plugin isolation demonstration
 */
export function Example4_PluginIsolation() {
    const [pluginList, setPluginList] = React.useState([]);

    React.useEffect(() => {
        const plugins = searchPluginRegistry.listPlugins();
        setPluginList(plugins);
    }, []);

    const handlePluginError = pluginId => {
        // Simulate an error in one plugin
        const plugin = searchPluginRegistry.getPlugin(pluginId);
        if (plugin) {
            plugin.logError(new Error('Simulated error for testing'));
            console.log(`${pluginId} errors:`, plugin.getErrors());
        }
    };

    return (
        <div>
            <h2>Plugin Isolation Test</h2>
            <p>Registered Plugins:</p>
            <ul>
                {pluginList.map(plugin => (
                    <li key={plugin.id}>
                        <strong>{plugin.name}</strong> (v{plugin.version})
                        <br />
                        Sources: {plugin.sources.join(', ')}
                        <br />
                        <button
                            onClick={() => handlePluginError(plugin.id)}
                            style={{ fontSize: '12px', padding: '2px 8px' }}
                        >
                            Simulate Error
                        </button>
                    </li>
                ))}
            </ul>

            <p>
                Each plugin is completely isolated. Errors in one plugin won&apos;t affect others.
                Click &ldquo;Simulate Error&rdquo; to test error boundaries.
            </p>
        </div>
    );
}

/**
 * Main examples component
 */
export default function PluginUsageExamples() {
    const [activeExample, setActiveExample] = React.useState('plugins');

    const examples = {
        plugins: { component: Example1_PluginComponents, title: 'Plugin Components' },
        direct: { component: Example2_DirectCore, title: 'Direct Core Usage' },
        custom: { component: Example3_CustomPlugin, title: 'Custom Plugin' },
        isolation: { component: Example4_PluginIsolation, title: 'Plugin Isolation' },
    };

    const ActiveComponent = examples[activeExample].component;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Search Plugin System Examples</h1>

            <nav style={{ marginBottom: '20px' }}>
                {Object.entries(examples).map(([key, { title }]) => (
                    <button
                        key={key}
                        onClick={() => setActiveExample(key)}
                        style={{
                            marginRight: '10px',
                            padding: '8px 16px',
                            backgroundColor: activeExample === key ? '#007acc' : '#f0f0f0',
                            color: activeExample === key ? 'white' : 'black',
                            border: '1px solid #ccc',
                            cursor: 'pointer',
                        }}
                    >
                        {title}
                    </button>
                ))}
            </nav>

            <ActiveComponent />
        </div>
    );
}
