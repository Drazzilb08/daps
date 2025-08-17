import { useCallback, useState, useEffect } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import ModalFactory from '../components/modals/ModalFactory';
import { refreshMediaDatabase, syncTagsToMedia, fetchConfig } from '../utils/api';
import { useToast } from '../components/providers/ToastProvider';
import '../css/pages/media-search.css';

/**
 * Create schema for tag management modal
 */
function createTagManagementSchema(mediaItem, rootConfig = {}) {
    const schema = [];

    // Parse ARR tags and Plex labels with normalization
    const arrTags = (() => {
        const firstInstance = mediaItem.allInstanceData?.[0];
        if (!firstInstance?.tags) return [];

        let tags = [];
        if (Array.isArray(firstInstance.tags)) {
            tags = firstInstance.tags;
        } else {
            try {
                tags = JSON.parse(firstInstance.tags);
            } catch {
                return [];
            }
        }

        // Normalize to lowercase for ARR compatibility
        return tags.map(tag => tag.toLowerCase());
    })();

    const plexLabels = (() => {
        let labels = [];

        if (mediaItem.plexLabels && Array.isArray(mediaItem.plexLabels)) {
            labels = mediaItem.plexLabels;
        } else if (typeof mediaItem.plexLabels === 'string') {
            try {
                labels = JSON.parse(mediaItem.plexLabels);
            } catch {
                labels = [];
            }
        } else {
            const plexData = mediaItem.plexData;
            if (plexData?.labels) {
                if (Array.isArray(plexData.labels)) {
                    labels = plexData.labels;
                } else {
                    try {
                        labels = JSON.parse(plexData.labels);
                    } catch {
                        labels = [];
                    }
                }
            }
        }

        // Normalize to lowercase for comparison
        return labels.map(label => label.toLowerCase());
    })();

    // Calculate synced tags (exist in both ARR and Plex)
    const syncedTags = arrTags.filter(tag => plexLabels.includes(tag));
    // Calculate unsynced ARR tags (only in ARR, not in Plex)
    const unsyncedArrTags = arrTags.filter(tag => !plexLabels.includes(tag));
    // Calculate Plex-only labels (only in Plex, not in ARR)
    const plexOnlyLabels = plexLabels.filter(label => !arrTags.includes(label));

    console.log('Labelarr Tag Analysis:', {
        arrTags,
        plexLabels,
        syncedTags,
        unsyncedArrTags,
        plexOnlyLabels,
    });

    // ARR Instance Selection - only show if multiple ARR instances
    const arrInstances = (mediaItem.instances || []).filter(
        instance =>
            instance.toLowerCase().includes('radarr') || instance.toLowerCase().includes('sonarr')
    );

    if (arrInstances.length > 1) {
        schema.push({
            key: 'selected_arr_instance',
            label: 'ARR Instance',
            type: 'dropdown',
            value: arrInstances[0],
            options: arrInstances.map(instance => ({ value: instance, label: instance })),
            description: 'Select which ARR instance to manage tags for',
        });
    }

    // Media Display
    schema.push({
        key: 'media_display',
        label: '',
        type: 'media_display',
        value: {
            title: mediaItem.title,
            year: mediaItem.year,
            type: mediaItem.asset_type?.charAt(0).toUpperCase() + mediaItem.asset_type?.slice(1),
            posterUrl: mediaItem.posterUrl || mediaItem.imageUrl,
            folder: mediaItem.folder,
            instances: arrInstances,
            status: 'Downloaded',
            ...(mediaItem.plexData
                ? {
                      plex_library: mediaItem.plexData.library_name,
                  }
                : {}),
        },
        description: 'Media information and file details',
    });

    // Current Tags Display
    schema.push({
        key: 'current_tags',
        label: 'Current Tags',
        type: 'tag_display',
        value: arrTags,
        emptyText: 'No tags currently assigned',
        description: 'Tags currently assigned in the ARR instance',
    });

    // Manage Tags Interface (for tags that are synced between both ARR and Plex)
    schema.push({
        key: 'manage_tags',
        label: 'Manage Tags',
        type: 'tag_select',
        defaultValue: syncedTags,
        allowAdd: true,
        allowRemove: true,
        placeholder: 'Add or remove synced tags...',
        description: 'Manage tags that are synced between ARR and Plex. Adding tags here will add to both systems, removing will remove from both.',
    });

    // Plex Instance Selection - only show if multiple plex instances configured
    const plexInstances = Object.keys(rootConfig?.instances?.plex || {});

    if (plexInstances.length > 1) {
        schema.push({
            key: 'plex_instance',
            label: 'Plex Instance',
            type: 'instance_dropdown',
            from: ['plex'],
            description: 'Select which Plex instance to sync tags to',
            value: plexInstances[0],
        });
    } else {
        // Hidden field for single or no Plex instance
        schema.push({
            key: 'plex_instance',
            type: 'hidden',
            value: plexInstances[0] || 'plex_1',
        });
    }

    // Plex Labels (Read-only)
    schema.push({
        key: 'plex_labels',
        label: 'Plex Labels',
        type: 'tag_display',
        value: plexLabels,
        emptyText: 'No Plex labels found',
        description: 'Current Plex labels (read-only until media linking is implemented)',
    });

    return schema;
}

export default function MediaSearch() {
    const toast = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedMediaItem, setSelectedMediaItem] = useState(null);
    const [rootConfig, setRootConfig] = useState({});

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
                toast('Cache refresh initiated successfully', 'success');
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

    const handleTagSync = useCallback(
        async (formData, mediaItem, closeModal) => {
            try {
                const payload = {
                    source_instance:
                        formData.selected_arr_instance ||
                        (mediaItem.instances && mediaItem.instances[0]),
                    media_cache_id: mediaItem.id,
                    plex_mapping_id: mediaItem.plex_mapping_id,
                    manage_tags: formData.manage_tags || [],
                    tags_to_remove: [], // Empty for now - Plex labels are read-only until linking is implemented
                    plex_instance: formData.plex_instance,
                    dry_run: false,
                };

                console.log('Syncing tags:', payload);

                const result = await syncTagsToMedia(payload);

                if (result.success) {
                    toast('Tags synced successfully', 'success');
                    closeModal();
                } else {
                    toast('Tag sync failed', 'error');
                }
            } catch (error) {
                console.error('Error syncing tags:', error);
                toast('Error syncing tags', 'error');
            }
        },
        [toast]
    );

    return (
        <div className="media-search-page">
            <MediaSearchComponent
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                showRefreshControls={true}
                onResultClick={handleResultClick}
            />

            {selectedMediaItem && (
                <ModalFactory
                    schema={createTagManagementSchema(selectedMediaItem, rootConfig)}
                    entry={selectedMediaItem}
                    title={`Tag Management - ${selectedMediaItem.title} (${selectedMediaItem.year})`}
                    modalClass="modal-content tag-management-modal"
                    rootConfig={rootConfig}
                    layout={{
                        type: 'two-column',
                        leftColumn: ['media_display'],
                        rightColumn: [
                            'selected_arr_instance',
                            'current_tags',
                            'manage_tags',
                            'plex_labels',
                        ],
                    }}
                    footerButtons={[
                        {
                            id: 'cancel-btn',
                            label: 'Cancel',
                            className: 'btn btn-secondary',
                        },
                        {
                            id: 'sync-btn',
                            label: 'Sync Tags',
                            className: 'btn btn-primary',
                        },
                    ]}
                    onClose={handleModalClose}
                    onButtonClick={{
                        'cancel-btn': ({ closeModal }) => {
                            closeModal();
                        },
                        'sync-btn': ({ formData, closeModal }) => {
                            handleTagSync(formData, selectedMediaItem, closeModal);
                        },
                    }}
                />
            )}
        </div>
    );
}
