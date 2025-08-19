// ui/src/components/search/plugins/MediaSearchPlugin.js
// Media search plugin with sub-plugin architecture for media management operations

import { PluginBuilder } from './PluginSchema';
import { mediaSearchAdapter } from '../adapters/MediaSearchAdapter';
import pluginRegistry from './PluginRegistry';
import subPluginRegistry from './subplugins';
import { refreshMediaDatabase, fetchJobDetail } from '../../../utils/api';
import MediaModalComponent from './MediaModalComponent';

/**
 * Enhanced Media adapter with sub-plugin system
 */
const enhancedMediaAdapter = {
    // Unique identifier to verify correct adapter is being used
    _adapterType: 'enhanced-media-adapter',

    // Sub-plugin registry for internal plugin system
    _subPluginRegistry: null,
    _activeSubPlugin: null,

    /**
     * Initialize sub-plugin registry
     */
    initializeSubPlugins() {
        // Use the imported sub-plugin registry
        this._subPluginRegistry = subPluginRegistry;
        this._activeSubPlugin = subPluginRegistry.getDefaultPlugin();

        console.log(
            'MediaSearchAdapter: Sub-plugin registry initialized with plugins:',
            subPluginRegistry.getStats()
        );
    },

    /**
     * Get active sub-plugin
     */
    getActiveSubPlugin() {
        return this._activeSubPlugin;
    },

    /**
     * Set active sub-plugin
     */
    setActiveSubPlugin(subPluginId) {
        if (this._subPluginRegistry && this._subPluginRegistry.has(subPluginId)) {
            this._activeSubPlugin = subPluginId;
            return true;
        }
        return false;
    },

    /**
     * Get sub-plugin for media item
     */
    getSubPluginForItem(mediaItem) {
        if (!this._subPluginRegistry) {
            return null;
        }
        return this._subPluginRegistry.findBestPlugin(mediaItem);
    },

    /**
     * Enhanced loadInitialData with sub-plugin initialization
     */
    async loadInitialData(currentSource) {
        console.log('Enhanced adapter loadInitialData called with source:', currentSource);
        const data = await mediaSearchAdapter.loadInitialData(currentSource);
        console.log('Enhanced adapter loadInitialData result:', data ? Object.keys(data) : null);

        // Initialize sub-plugin system
        this.initializeSubPlugins();

        const result = {
            ...data,
            activeSubPlugin: this._activeSubPlugin,
            availableSubPlugins: this._subPluginRegistry.getPluginIds(),
        };

        console.log(
            'Enhanced adapter loadInitialData final result:',
            result ? Object.keys(result) : null
        );
        return result;
    },

    /**
     * Enhanced formatResult with sub-plugin awareness
     */
    formatResult(item) {
        const baseResult = mediaSearchAdapter.formatResult(item);

        return {
            ...baseResult,
            // Add sub-plugin information for modal routing
            activeSubPlugin: this._activeSubPlugin,
            modalType: 'media-management',
        };
    },

    // Delegate core methods directly to mediaSearchAdapter to preserve context
    search(data, searchTerm) {
        console.log('Enhanced adapter search called:', {
            adapterType: this._adapterType,
            data: data ? Object.keys(data) : null,
            searchTerm,
            hasData: !!data,
        });
        const result = mediaSearchAdapter.search(data, searchTerm);
        console.log(
            'Enhanced adapter search result:',
            Array.isArray(result) ? `Array(${result.length})` : typeof result
        );
        return result;
    },

    filter(results, filters) {
        console.log('Enhanced adapter filter called:', {
            results: Array.isArray(results) ? `Array(${results.length})` : typeof results,
            filters,
        });
        const result = mediaSearchAdapter.filter(results, filters);
        console.log(
            'Enhanced adapter filter result:',
            Array.isArray(result) ? `Array(${result.length})` : typeof result
        );
        return result;
    },

    sort(results, sortOption) {
        console.log('Enhanced adapter sort called:', {
            results: Array.isArray(results) ? `Array(${results.length})` : typeof results,
            sortOption,
        });
        const result = mediaSearchAdapter.sort(results, sortOption);
        console.log(
            'Enhanced adapter sort result:',
            Array.isArray(result) ? `Array(${result.length})` : typeof result
        );
        return result;
    },

    getAutocompleteSuggestions(searchTerm) {
        return mediaSearchAdapter.getAutocompleteSuggestions(searchTerm);
    },
};

/**
 * Media Search Plugin
 * Single SearchEngine plugin with internal sub-plugin architecture
 */
export const mediaSearchPluginConfig = new PluginBuilder('media-search', 'Media Search')
    .setMetadata(
        '1.0.0',
        'Search media items for management operations with extensible sub-plugin system'
    )
    .setAdapter(enhancedMediaAdapter)
    .addSource(
        'labelarr',
        'Labelarr',
        'mi:label',
        'Search media items for tag/label management operations'
    )
    .addFilter(
        'assetTypeFilter',
        'dropdown',
        'Filter by media type',
        [
            { value: 'all', label: 'All Media' },
            { value: 'movie', label: 'Movies' },
            { value: 'show', label: 'Series' },
        ],
        'mi:filter_list'
    )
    .setUI({
        placeholder: 'Search media items...',
        defaultView: 'grid', // Grid view for consistent UI
        defaultSort: 'alpha',
        defaultSource: 'labelarr',
        renderer: 'media-search', // Use specialized renderer with instance indicators and enhanced empty states
        enableHoverPreview: true, // Enable hover previews for list view
        enableAutocomplete: true, // Enable autocomplete functionality
        autocompleteMinLength: 2, // Start autocomplete after 2 characters
        showRefreshControls: true, // Enable refresh controls for MediaSearch
        showAdvancedSearchHelp: true, // Enable advanced search help
        modalComponent: MediaModalComponent, // Plugin-provided modal component for media management
        selectorLabel: 'Module',
        sortOptions: [
            { value: 'alpha', label: 'A-Z' },
            { value: 'alpha-desc', label: 'Z-A' },
            { value: 'year_asc', label: 'Year (Oldest)' },
            { value: 'year_desc', label: 'Year (Newest)' },
            { value: 'recently_added', label: 'Recently Added' },
        ],
    })
    .setEventHandlers({
        onDataLoaded: (adapter, data) => {
            console.log('Media search data loaded:', data ? Object.keys(data) : 'null');

            // Update instance filter options based on loaded data
            if (data && data.aggregatedItems) {
                const instances = new Set();
                data.aggregatedItems.forEach(item => {
                    if (item.instances) {
                        item.instances.forEach(instance => instances.add(instance));
                    }
                });

                // TODO: Update filter options dynamically
                console.log('Available instances:', Array.from(instances));
            }
        },
        onSearchComplete: (adapter, results) => {
            console.log(`Media search complete: ${results.length} results`);
        },
        onError: (adapter, error) => {
            console.warn('Media search plugin error:', error.message);
        },
        onSubPluginChange: (adapter, newSubPlugin) => {
            console.log('Sub-plugin changed to:', newSubPlugin);
            adapter.setActiveSubPlugin(newSubPlugin);
        },
        onRefresh: async (adapter, refreshOptions, { toast, setRefreshTrigger }) => {
            console.log('MediaSearch: Starting cache refresh...', refreshOptions);

            try {
                const result = await refreshMediaDatabase({
                    arr_instances: refreshOptions?.arrInstances || [],
                    plex_instances: refreshOptions?.plexInstances || [],
                    libraries: refreshOptions?.libraries || [],
                    update_mappings: true,
                });

                console.log('MediaSearch: Refresh result:', result);

                if (result.job_id) {
                    // Start polling the job
                    const pollJobStatus = async jobId => {
                        const pollInterval = setInterval(async () => {
                            try {
                                const response = await fetchJobDetail(jobId);
                                const job = response.job || response;
                                const dbStatus = job.status;

                                if (dbStatus === 'success') {
                                    clearInterval(pollInterval);
                                    toast(
                                        'Database refresh completed! Search results have been updated.',
                                        'success'
                                    );
                                    if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
                                } else if (dbStatus === 'error') {
                                    clearInterval(pollInterval);
                                    toast(
                                        `Database refresh failed: ${job.error || 'Unknown error'}`,
                                        'error'
                                    );
                                }
                            } catch (e) {
                                clearInterval(pollInterval);
                                toast(`Error checking refresh status: ${e.message}`, 'error');
                            }
                        }, 2000);
                    };

                    pollJobStatus(result.job_id);
                } else {
                    toast('Cache refresh completed successfully', 'success');
                    if (setRefreshTrigger) setRefreshTrigger(prev => prev + 1);
                }
            } catch (error) {
                console.error('MediaSearch: Refresh error:', error);
                toast('Failed to start refresh', 'error');
            }
        },
    })
    .addHooks({
        beforeDataLoad: async () => {
            console.log('Media search: Preparing to load data...');
        },
        afterDataLoad: async () => {
            console.log('Media search: Data load complete, items available for sub-plugins');
        },
        beforeSearch: (adapter, searchTerm) => {
            console.log(`Media search: Searching for "${searchTerm}"`);
        },
    })
    // Remove dynamic filters since we now use static source filters
    .build();

// Register the plugin
pluginRegistry.registerPlugin(mediaSearchPluginConfig);

console.log('✅ MediaSearchPlugin registered with plugin registry');
