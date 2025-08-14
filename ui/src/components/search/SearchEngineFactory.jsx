// ui/src/components/search/SearchEngineFactory.jsx
// Pre-configured SearchEngine variants that replicate EXACT original functionality and UI

import React, { useMemo } from 'react';
import SearchCore from './core/SearchCore';
import { assetsSearchAdapter } from './adapters/AssetsSearchAdapter';
import { gdriveSearchAdapter } from './adapters/GdriveSearchAdapter';

// ===== ASSETS SEARCH ENGINE =====
export function AssetsSearchEngine({
    onResultDelete,
    onError,
    enableVirtualization = true,
    virtualizationThreshold = 100,
    ...props
}) {
    // Enhanced adapter that applies filters in the search step - memoized to prevent infinite loops
    const enhancedAssetsAdapter = useMemo(() => ({
        ...assetsSearchAdapter,

        // Override search to apply filters properly
        search(data, searchTerm, filters) {
            return assetsSearchAdapter.search(data, searchTerm, filters);
        },

        // Override sort to handle the priority properly
        sort(results, sortOption) {
            return assetsSearchAdapter.sort(results, sortOption);
        },
    }), []);

    return (
        <SearchCore
            searchAdapter={enhancedAssetsAdapter}
            // Sources - only Assets for this variant
            sources={[
                {
                    key: 'assets',
                    label: 'Assets',
                    icon: 'mi:folder',
                    tooltip: 'Search Assets',
                },
            ]}
            // Filters - replicate exact AssetSearchControls filters
            filters={[
                {
                    key: 'assetTypeFilter',
                    type: 'dropdown',
                    label: 'Filter by type of asset in Assets tab',
                    icon: 'mi:filter_list',
                    options: [
                        { value: 'all', label: 'All' },
                        { value: 'collections', label: 'Collections' },
                        { value: 'movies', label: 'Movies' },
                        { value: 'shows', label: 'Shows' },
                    ],
                },
            ]}
            // Sort options - replicate exact options from AssetsSearchControls
            sortOptions={[
                { value: 'alpha', label: 'A-Z' },
                { value: 'alpha-desc', label: 'Z-A' },
                { value: 'date', label: 'Date Added' },
            ]}
            // UI Configuration - EXACT same as original
            placeholder="Search posters in Assets Directory..."
            defaultView="grid"
            defaultSort="alpha"
            defaultSource="assets"
            enableHoverPreview={true}
            renderer="poster"
            // Event handlers
            onError={onError}
            onResultDelete={onResultDelete}
            // Virtualization configuration
            enableVirtualization={enableVirtualization}
            virtualizationThreshold={virtualizationThreshold}
            // Pass through any additional props
            {...props}
        />
    );
}

// ===== GDRIVE SEARCH ENGINE =====
export function GdriveSearchEngine({
    customLocations = [],
    onDataLoaded,
    onSourceChange,
    onError,
    enableVirtualization = true,
    virtualizationThreshold = 150,
    ...props
}) {
    // State for dynamic owner filtering - EXACT same as original
    const [availableOwners, setAvailableOwners] = React.useState([]);

    // Handle data loaded to extract available owners - EXACT same as original
    const handleDataLoaded = data => {
        // Use gdriveOwners from adapter data (already extracted and sorted)
        if (data && data.gdriveOwners) {
            setAvailableOwners(data.gdriveOwners);
        } else {
            setAvailableOwners([]);
        }

        if (onDataLoaded) onDataLoaded(data);
    };

    // Enhanced adapter that handles GDrive-specific filtering and sorting - EXACT same as original
    const enhancedGdriveAdapter = useMemo(() => ({
        ...gdriveSearchAdapter,

        // Override search to handle the more complex GDrive filtering
        search(data, searchTerm, filters, currentSource) {
            // First do the basic search
            let results = gdriveSearchAdapter.search(data, searchTerm, filters, currentSource);

            // Then apply additional filters (including owner filtering)
            results = gdriveSearchAdapter.filter(results, filters, currentSource);

            return results;
        },

        // Override sort to pass through priority order
        sort(results, sortOption, currentSource) {
            const data = this._lastLoadedData;
            const priorityOrder = data?.priorityOrder || {};
            return gdriveSearchAdapter.sort(results, sortOption, currentSource, priorityOrder);
        },

        // Store data for sort function access
        async loadInitialData(currentSource) {
            const data = await gdriveSearchAdapter.loadInitialData(currentSource);
            this._lastLoadedData = data;
            return data;
        },
    }), []);

    // Dynamic tooltip for custom source based on availability - EXACT same as original
    const customTooltip =
        customLocations && customLocations.length > 0
            ? 'Search posters in user-defined folders from Poster Renamerr settings.'
            : 'No custom sources defined in Poster Renamerr settings.';

    return (
        <SearchCore
            searchAdapter={enhancedGdriveAdapter}
            // Sources - GDrive and Custom - EXACT same as original
            sources={[
                {
                    key: 'gdrive',
                    label: 'GDrive',
                    icon: 'mi:cloud',
                    tooltip: 'Search posters in Google Drive sources (from GDrive Sync settings).',
                },
                {
                    key: 'custom',
                    label: 'Custom',
                    icon: 'mi:folder_special',
                    tooltip: customTooltip,
                },
            ]}
            // Filters - GDrive owner filter (conditionally shown) - EXACT same as original
            filters={
                availableOwners.length > 0
                    ? [
                          {
                              key: 'selectedGDriveOwner',
                              type: 'dropdown',
                              label: 'Filter by GDrive owner',
                              icon: 'mi:person',
                              options: [
                                  { value: '', label: 'All Owners' },
                                  ...availableOwners.map(owner => ({
                                      value: owner,
                                      label: owner,
                                  })),
                              ],
                          },
                      ]
                    : []
            }
            // Sort options - EXACT same as original
            sortOptions={[
                { value: 'priority-asc', label: 'Priority ↑' },
                { value: 'priority-desc', label: 'Priority ↓' },
                { value: 'alpha', label: 'A-Z' },
                { value: 'alpha-desc', label: 'Z-A' },
                { value: 'date', label: 'Date Added' },
            ]}
            // UI Configuration - EXACT same as original
            placeholder="Search posters in GDrive/Custom sources..."
            defaultView="grid"
            defaultSort="priority-asc"
            defaultSource="gdrive"
            enableHoverPreview={true}
            renderer="poster"
            groupBy="location" // Enable location-based grouping for GDrive
            // Event handlers
            onError={onError}
            onDataLoaded={handleDataLoaded}
            onSourceChange={onSourceChange}
            // Virtualization configuration
            enableVirtualization={enableVirtualization}
            virtualizationThreshold={virtualizationThreshold}
            // Pass through any additional props
            {...props}
        />
    );
}

// ===== INDEX EXPORTS =====
// Main exports for easy importing - EXACT same as original
export { default as SearchCore } from './core/SearchCore';
export { assetsSearchAdapter } from './adapters/AssetsSearchAdapter';
export { gdriveSearchAdapter } from './adapters/GdriveSearchAdapter';

// Default export object for convenience - EXACT same as original
export default {
    SearchCore,
    AssetsSearchEngine,
    GdriveSearchEngine,
    assetsSearchAdapter,
    gdriveSearchAdapter,
};