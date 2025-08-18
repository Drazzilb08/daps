import { useCallback, useState, useEffect, useRef } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import ModalFactory from '../components/modals/ModalFactory';
import { refreshMediaDatabase, fetchConfig, fetchJobDetail } from '../utils/api';
import { useToast } from '../components/providers/ToastProvider';
import { subPluginRegistry } from '../components/search/plugins/subplugins';
import '../css/pages/media-search.css';

/**
 * Create modal schema using sub-plugin system
 */
function createMediaManagementSchema(mediaItem, rootConfig = {}) {
    // Determine the best sub-plugin for this media item
    const subPlugin = subPluginRegistry.findBestPlugin(mediaItem);
    
    if (!subPlugin) {
        console.warn('No sub-plugin found for media item:', mediaItem);
        return [];
    }

    console.log(`Using sub-plugin: ${subPlugin.name} (${subPlugin.id}) for ${mediaItem.title}`);
    
    // Delegate schema creation to the sub-plugin
    return subPlugin.createModalSchema(mediaItem, rootConfig);
}

export default function MediaSearch() {
    const toast = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedMediaItem, setSelectedMediaItem] = useState(null);
    const [rootConfig, setRootConfig] = useState({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Job tracking for refresh polling
    const refreshJobPoller = useRef(null);

    // Load root configuration on component mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await fetchConfig();
                setRootConfig(config);
            } catch (error) {
                console.error('MediaSearch: Failed to load configuration:', error);
                setRootConfig({}); // Fallback to empty config
            }
        };
        loadConfig();
    }, []);

    // Cleanup job poller on unmount
    useEffect(() => {
        return () => {
            if (refreshJobPoller.current) {
                clearInterval(refreshJobPoller.current);
            }
        };
    }, []);

    // Start polling job progress
    const startRefreshJobPolling = useCallback((jobId) => {
        console.log(`Starting polling for refresh job ${jobId}`);
        
        // Clear existing poller
        if (refreshJobPoller.current) {
            clearInterval(refreshJobPoller.current);
        }
        
        refreshJobPoller.current = setInterval(async () => {
            try {
                const response = await fetchJobDetail(jobId);
                console.log(`Refresh job ${jobId} status:`, response);
                
                // Handle the response structure - fetchJobDetail returns the job object directly
                const job = response.job || response;
                
                // Map database status values to our UI states
                const dbStatus = job.status;
                let isFinished = false;
                
                if (dbStatus === 'success') {
                    isFinished = true;
                    // Job completed successfully
                    toast('Database refresh completed! Search results have been updated.', 'success');
                    
                    // Force refresh of search data
                    setRefreshTrigger(prev => prev + 1);
                } else if (dbStatus === 'error') {
                    isFinished = true;
                    // Job failed
                    toast(`Database refresh failed: ${job.error || 'Unknown error'}`, 'error');
                }
                
                // Stop polling and reset state if finished
                if (isFinished) {
                    console.log(`Refresh job ${jobId} finished with status: ${dbStatus}`);
                    clearInterval(refreshJobPoller.current);
                    refreshJobPoller.current = null;
                    setIsRefreshing(false);
                }
            } catch (e) {
                console.error(`Error polling refresh job ${jobId}:`, e);
                toast(`Error checking refresh status: ${e.message}`, 'error');
                
                // Stop polling on error
                clearInterval(refreshJobPoller.current);
                refreshJobPoller.current = null;
                setIsRefreshing(false);
            }
        }, 2000); // Poll every 2 seconds
    }, [toast]);

    const handleRefresh = useCallback(
        async refreshOptions => {
            setIsRefreshing(true);
            
            try {
                console.log('MediaSearch: Starting cache refresh...', refreshOptions);
                const result = await refreshMediaDatabase({
                    arr_instances: refreshOptions?.arrInstances || [],
                    plex_instances: refreshOptions?.plexInstances || [],
                    libraries: refreshOptions?.libraries || [],
                    update_mappings: true,
                });
                console.log('MediaSearch: Refresh result:', result);
                
                if (result.job_id) {
                    // Start polling the job - no immediate toast, wait for completion
                    startRefreshJobPolling(result.job_id);
                } else {
                    // No job ID returned, treat as immediate completion
                    toast('Cache refresh completed successfully', 'success');
                    setRefreshTrigger(prev => prev + 1);
                    setIsRefreshing(false);
                }
            } catch (error) {
                console.error('MediaSearch: Refresh error:', error);
                toast('Failed to start refresh', 'error');
                setIsRefreshing(false);
            }
        },
        [toast, startRefreshJobPolling]
    );

    const handleResultClick = useCallback(mediaItem => {
        setSelectedMediaItem(mediaItem);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedMediaItem(null);
    }, []);

    // Get sub-plugin for current media item
    const getSubPluginForItem = useCallback((mediaItem) => {
        return subPluginRegistry.findBestPlugin(mediaItem);
    }, []);

    return (
        <div className="media-search-page">
            <MediaSearchComponent
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                showRefreshControls={true}
                showAdvancedSearchHelp={true}
                onResultClick={handleResultClick}
                refreshTrigger={refreshTrigger}
            />

            {selectedMediaItem && (() => {
                const subPlugin = getSubPluginForItem(selectedMediaItem);
                
                if (!subPlugin) {
                    return (
                        <div className="modal-error">
                            No management plugin available for this media item.
                        </div>
                    );
                }

                return (
                    <ModalFactory
                        schema={createMediaManagementSchema(selectedMediaItem, rootConfig)}
                        entry={selectedMediaItem}
                        title={`${subPlugin.name} - ${selectedMediaItem.title} (${selectedMediaItem.year})`}
                        modalClass={`modal-content ${subPlugin.id}-management-modal`}
                        rootConfig={rootConfig}
                        layout={subPlugin.getModalLayout()}
                        footerButtons={subPlugin.getModalButtons()}
                        onClose={handleModalClose}
                        onButtonClick={subPlugin.getButtonHandlers(selectedMediaItem, toast)}
                    />
                );
            })()}
        </div>
    );
}
