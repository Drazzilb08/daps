// ui/src/pages/MediaSearch.jsx
// Media search page using consistent plugin architecture

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';
import { useSearchCoordinator } from '../contexts/SearchCoordinatorProvider';
import { useUIState } from '../contexts/UIStateContext';
import { refreshMediaDatabase, fetchJobDetail } from '../utils/api';

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
    const coordinator = useSearchCoordinator();
    const { isMobileSearchActive } = useUIState();
    const [isMobile, setIsMobile] = useState(false);

    // Use coordinator's refresh state instead of local state
    const isRefreshing = coordinator?.isRefreshing || false;
    const setIsRefreshing = coordinator?.setIsRefreshing || (() => {});

    // Initialize coordinator state from localStorage on mount - run only once
    useEffect(() => {
        if (!coordinator?.setIsRefreshing) return;

        try {
            const saved = localStorage.getItem('daps_media_refresh_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.isRefreshing) {
                    coordinator.setIsRefreshing(true);
                }
            }
        } catch (error) {
            console.warn('Failed to restore refresh state:', error);
        }
    }, []); // Remove coordinator dependency to prevent infinite loop
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const refreshJobPoller = useRef(null);

    // Start polling job progress - use useRef to store function to avoid dependency issues
    const startRefreshJobPolling = useCallback(
        jobId => {
            console.log(`Starting polling for refresh job ${jobId}`);

            // Save state immediately
            try {
                const state = { isRefreshing: true, jobId, timestamp: Date.now() };
                localStorage.setItem('daps_media_refresh_state', JSON.stringify(state));
            } catch (error) {
                console.warn('Failed to save refresh state:', error);
            }

            // Clear existing poller
            if (refreshJobPoller.current) {
                clearInterval(refreshJobPoller.current);
            }

            refreshJobPoller.current = setInterval(async () => {
                try {
                    const response = await fetchJobDetail(jobId);
                    const job = response.job || response;
                    const dbStatus = job.status;

                    if (dbStatus === 'success') {
                        // Job completed successfully
                        clearInterval(refreshJobPoller.current);
                        refreshJobPoller.current = null;
                        console.log('MediaSearch: Setting isRefreshing to false (success)');
                        setIsRefreshing(false);

                        // Clear state
                        try {
                            localStorage.removeItem('daps_media_refresh_state');
                        } catch (error) {
                            console.warn('Failed to clear refresh state:', error);
                        }

                        toast(
                            'Database refresh completed! Search results have been updated.',
                            'success'
                        );
                        setRefreshTrigger(prev => prev + 1);
                    } else if (dbStatus === 'error') {
                        // Job failed
                        clearInterval(refreshJobPoller.current);
                        refreshJobPoller.current = null;
                        console.log(
                            'MediaSearch: Setting isRefreshing to false (error in polling)'
                        );
                        setIsRefreshing(false);

                        // Clear state
                        try {
                            localStorage.removeItem('daps_media_refresh_state');
                        } catch (error) {
                            console.warn('Failed to clear refresh state:', error);
                        }

                        toast(`Database refresh failed: ${job.error || 'Unknown error'}`, 'error');
                    }
                } catch (e) {
                    console.error(`Error polling refresh job ${jobId}:`, e);
                    clearInterval(refreshJobPoller.current);
                    refreshJobPoller.current = null;
                    console.log('MediaSearch: Setting isRefreshing to false (polling exception)');
                    setIsRefreshing(false);

                    // Clear state
                    try {
                        localStorage.removeItem('daps_media_refresh_state');
                    } catch (error) {
                        console.warn('Failed to clear refresh state:', error);
                    }

                    toast(`Error checking refresh status: ${e.message}`, 'error');
                }
            }, 2000); // Poll every 2 seconds
        },
        [toast, setIsRefreshing, setRefreshTrigger]
    ); // Simplified dependencies

    // Handle refresh
    const handleRefresh = useCallback(
        async refreshOptions => {
            console.log('MediaSearch: Setting isRefreshing to true');
            setIsRefreshing(true);

            // Save state immediately
            try {
                const state = { isRefreshing: true, jobId: null, timestamp: Date.now() };
                localStorage.setItem('daps_media_refresh_state', JSON.stringify(state));
            } catch (error) {
                console.warn('Failed to save refresh state:', error);
            }

            try {
                console.log('MediaSearch: Starting cache refresh...', refreshOptions);
                const result = await refreshMediaDatabase({
                    arr_instances: refreshOptions?.arrInstances || [],
                    plex_instances: refreshOptions?.plexInstances || [],
                    libraries: refreshOptions?.libraries || [],
                    update_mappings: true,
                });
                console.log('MediaSearch: Refresh result:', result);
                console.log('MediaSearch: isRefreshing set to:', true);

                if (result.job_id) {
                    // Start polling the job
                    startRefreshJobPolling(result.job_id);
                } else {
                    // No job ID returned, treat as immediate completion
                    console.log('MediaSearch: Setting isRefreshing to false (no job ID)');
                    setIsRefreshing(false);

                    // Clear state
                    try {
                        localStorage.removeItem('daps_media_refresh_state');
                    } catch (error) {
                        console.warn('Failed to clear refresh state:', error);
                    }

                    toast('Cache refresh completed successfully', 'success');
                    setRefreshTrigger(prev => prev + 1);
                }
            } catch (error) {
                console.error('MediaSearch: Refresh error:', error);
                console.log('MediaSearch: Setting isRefreshing to false (error)');
                setIsRefreshing(false);

                // Clear state
                try {
                    localStorage.removeItem('daps_media_refresh_state');
                } catch (error) {
                    console.warn('Failed to clear refresh state:', error);
                }

                toast('Failed to start refresh', 'error');
            }
        },
        [toast, startRefreshJobPolling, setIsRefreshing, setRefreshTrigger]
    );

    // Resume polling on page load if there's an active refresh - run only once on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('daps_media_refresh_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.isRefreshing && parsed.jobId) {
                    console.log('MediaSearch: Resuming polling for active refresh:', parsed.jobId);
                    setIsRefreshing(true);
                    startRefreshJobPolling(parsed.jobId);
                }
            }
        } catch (error) {
            console.warn('Failed to restore refresh polling:', error);
            // Clear state on error
            try {
                localStorage.removeItem('daps_media_refresh_state');
            } catch (clearError) {
                console.warn('Failed to clear refresh state:', clearError);
            }
        }
    }, []); // Empty dependency array - run only on mount

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (refreshJobPoller.current) {
                clearInterval(refreshJobPoller.current);
            }
        };
    }, []);

    // Track mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Mobile search active state is now managed by UIStateContext

    const handleError = useCallback(
        error => {
            console.error('Media search error:', error);
            toast.error('Search error occurred');
        },
        [toast]
    );

    // Memoize props to prevent cascading re-renders
    const mediaSearchProps = useMemo(
        () => ({
            onError: handleError,
            onRefresh: handleRefresh,
            isRefreshing,
            refreshTrigger,
        }),
        [handleError, handleRefresh, isRefreshing, refreshTrigger]
    );

    return (
        <div className="search-page-layout">
            <div className="search-content-column">
                <MediaSearchComponent {...mediaSearchProps} />
            </div>
        </div>
    );
}

// Export the schema for external use (e.g., SearchInterface component)
export { MEDIA_SEARCH_SCHEMA };
