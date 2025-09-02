// ui/src/pages/GdriveSearch.jsx
// GDrive search page using consistent plugin architecture

import React, { useCallback } from 'react';
import { GdriveSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';

/**
 * GDrive Search Control Schema
 * Defines the control configuration specific to the GDrive search page
 */
const GDRIVE_SEARCH_SCHEMA = {
    route: '/poster/search/gdrive',
    controls: [
        {
            key: 'source',
            type: 'selector',
            icon: 'mi:apps',
            label: 'SRC',
            fullLabel: 'Source',
            tooltip: 'Select Source',
            popoverTitle: 'Select Source',
            hidden: false,
            getOptions: searchConfig => searchConfig?.sources || [],
        },
        {
            key: 'view',
            type: 'toggle',
            getIcon: currentView => (currentView === 'grid' ? 'mi:grid_view' : 'mi:list'),
            getLabel: currentView => (currentView === 'grid' ? 'GRID' : 'LIST'),
            tooltip: 'Select view mode',
            popoverTitle: 'View Mode',
            options: [
                { value: 'grid', label: 'Grid View', icon: 'mi:grid_view' },
                { value: 'list', label: 'List View', icon: 'mi:list' },
            ],
        },
        {
            key: 'sort',
            type: 'selector',
            icon: 'mi:sort',
            label: 'SORT',
            tooltip: 'Sort options',
            popoverTitle: 'Sort By',
            hidden: false,
            getOptions: searchConfig => searchConfig?.sortOptions || [],
        },
        {
            key: 'filter',
            type: 'filter',
            icon: 'mi:tune',
            label: 'FILTER',
            tooltip: 'Filter options',
            popoverTitle: 'Filters',
            hidden: false,
            getOptions: searchConfig => searchConfig?.filters || [],
        },
    ],
};

export default function GdriveSearch() {
    const toast = useToast();

    const handleError = useCallback(
        error => {
            console.error('GDrive search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    return (
        <div className="search-page-layout">
            <div className="search-content-column">
                <GdriveSearchComponent
                    onError={handleError}
                    // Plugin system handles modal creation automatically via modalComponent config
                    // Note: No onResultClick provided - SearchCore will use modalComponent from plugin config
                />
            </div>
        </div>
    );
}

// Export the schema for external use (e.g., SearchInterface component)
export { GDRIVE_SEARCH_SCHEMA };
