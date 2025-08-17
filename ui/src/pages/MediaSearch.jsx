import { useCallback, useState, useEffect } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import ModalFactory from '../components/modals/ModalFactory';
import { refreshMediaDatabase, fetchConfig } from '../utils/api';
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
                toast('Cache refresh completed successfully', 'success');
                
                // Force refresh of search data by adding a refresh trigger to the component
                // This will cause the MediaSearchComponent to reload its data
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                console.error('MediaSearch: Refresh error:', error);
                toast('Failed to refresh Database', 'error');
            } finally {
                setIsRefreshing(false);
            }
        },
        [toast]
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
