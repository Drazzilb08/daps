// ui/src/components/search/SearchEngineFactory.js
// Pre-configured SearchEngine variants that replicate existing functionality

import React from 'react';
import SearchEngine from './SearchEngine';
import { assetsSearchAdapter } from './adapters/AssetsSearchAdapter';
import { gdriveSearchAdapter } from './adapters/GdriveSearchAdapter';

// ===== ASSETS SEARCH ENGINE =====
export function AssetsSearchEngine({ 
    onResultDelete, 
    onError, 
    enableVirtualization = true,
    virtualizationThreshold = 100, // Lower threshold for Assets since they often have many results
    ...props 
}) {
    // Enhanced adapter that applies filters in the search step
    const enhancedAssetsAdapter = {
        ...assetsSearchAdapter,
        
        // Override search to apply filters properly
        search(data, searchTerm, filters) {
            return assetsSearchAdapter.search(data, searchTerm, filters);
        },
        
        // Override sort to handle the priority properly
        sort(results, sortOption) {
            return assetsSearchAdapter.sort(results, sortOption);
        }
    };
    
    return (
        <SearchEngine
            searchAdapter={enhancedAssetsAdapter}
            
            // Sources - only Assets for this variant
            sources={[
                {
                    key: 'assets',
                    label: 'Assets',
                    icon: 'mi:folder',
                    tooltip: 'Search Assets'
                }
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
                    ]
                }
            ]}
            
            // Sort options - replicate exact options from AssetsSearchControls
            sortOptions={[
                { value: 'alpha', label: 'A-Z' },
                { value: 'alpha-desc', label: 'Z-A' },
                { value: 'date', label: 'Date Added' },
            ]}
            
            // UI Configuration
            placeholder="Search posters in Assets Directory..."
            defaultView="grid"
            defaultSort="alpha"
            defaultSource="assets"
            enableHoverPreview={true}
            renderer="poster" // Use poster renderer without grouping
            
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
    virtualizationThreshold = 150, // Higher threshold for GDrive since results are usually grouped
    ...props 
}) {
    // State for dynamic owner filtering
    const [availableOwners, setAvailableOwners] = React.useState([]);
    
    // Handle data loaded to extract available owners
    const handleDataLoaded = (data) => {
        // Use gdriveOwners from adapter data (already extracted and sorted)
        if (data && data.gdriveOwners) {
            setAvailableOwners(data.gdriveOwners);
        } else {
            setAvailableOwners([]);
        }
        
        if (onDataLoaded) onDataLoaded(data);
    };
    // Enhanced adapter that handles GDrive-specific filtering and sorting
    const enhancedGdriveAdapter = {
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
        }
    };
    
    // Dynamic tooltip for custom source based on availability
    const customTooltip = customLocations && customLocations.length > 0
        ? 'Search posters in user-defined folders from Poster Renamerr settings.'
        : 'No custom sources defined in Poster Renamerr settings.';
    
    return (
        <SearchEngine
            searchAdapter={enhancedGdriveAdapter}
            
            // Sources - GDrive and Custom
            sources={[
                {
                    key: 'gdrive',
                    label: 'GDrive',
                    icon: 'mi:cloud',
                    tooltip: 'Search posters in Google Drive sources (from GDrive Sync settings).'
                },
                {
                    key: 'custom',
                    label: 'Custom',
                    icon: 'mi:folder_special',
                    tooltip: customTooltip
                }
            ]}
            
            // Filters - GDrive owner filter (conditionally shown)
            filters={availableOwners.length > 0 ? [
                {
                    key: 'selectedGDriveOwner',
                    type: 'dropdown',
                    label: 'Filter by GDrive owner',
                    icon: 'mi:person',
                    options: [
                        { value: '', label: 'All Owners' },
                        ...availableOwners.map(owner => ({
                            value: owner,
                            label: owner
                        }))
                    ]
                }
            ] : []}
            
            // Sort options - replicate exact options from GdriveSearchControls
            sortOptions={[
                { value: 'priority-asc', label: 'Priority ↑' },
                { value: 'priority-desc', label: 'Priority ↓' },
                { value: 'alpha', label: 'A-Z' },
                { value: 'alpha-desc', label: 'Z-A' },
                { value: 'date', label: 'Date Added' },
            ]}
            
            // UI Configuration
            placeholder="Search posters in GDrive/Custom sources..."
            defaultView="grid"
            defaultSort="priority-asc"
            defaultSource="gdrive"
            enableHoverPreview={true}
            renderer="poster" // Use poster renderer with location grouping
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
// Main exports for easy importing
export { default as SearchEngine } from './SearchEngine';
export { assetsSearchAdapter } from './adapters/AssetsSearchAdapter';
export { gdriveSearchAdapter } from './adapters/GdriveSearchAdapter';

// Default export object for convenience
export default {
    SearchEngine,
    AssetsSearchEngine,
    GdriveSearchEngine,
    assetsSearchAdapter,
    gdriveSearchAdapter
};