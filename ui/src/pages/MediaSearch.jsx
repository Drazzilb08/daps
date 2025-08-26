// ui/src/pages/MediaSearch.jsx
// Media search page using consistent plugin architecture

import React, { useCallback, useState, useEffect } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';

/**
 * Media Search Control Schema
 * Defines the control configuration specific to the media search page
 */
const MEDIA_SEARCH_SCHEMA = {
    route: '/media/search',
    controls: [
        {
            key: 'source',
            type: 'selector',
            icon: 'mi:apps',
            label: 'MOD',
            fullLabel: 'Modules',
            tooltip: 'Select Module',
            popoverTitle: 'Select Module',
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
        {
            key: 'refresh',
            type: 'custom',
            icon: 'mi:refresh',
            label: 'REFRESH',
            tooltip: 'Refresh database',
            popoverTitle: 'Refresh Database',
            hidden: false,
            customComponent: 'refresh-popover',
        },
    ],
};

export default function MediaSearch() {
    const toast = useToast();
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

    // Track mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track mobile search active state
    useEffect(() => {
        const checkMobileSearchState = () => {
            setIsMobileSearchActive(document.body.classList.contains('mobile-search-active'));
        };

        // Initial check
        checkMobileSearchState();

        // Set up mutation observer to watch for class changes on body
        const observer = new MutationObserver(checkMobileSearchState);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const handleError = useCallback(
        error => {
            console.error('Media search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    // Calculate whether to hide the main search interface (but always render SearchCore for coordination)
    const hideMainSearchInterface = isMobile && isMobileSearchActive;

    return (
        <div className="search-page-layout">
            <div className="search-content-column">
                <MediaSearchComponent
                    onError={handleError}
                    hideMainSearchInterface={hideMainSearchInterface}
                />
            </div>
        </div>
    );
}

// Export the schema for external use (e.g., SearchInterface component)
export { MEDIA_SEARCH_SCHEMA };
