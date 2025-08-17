// ui/src/components/search/plugins/subplugins/LabelarrSubPlugin.js
// Labelarr sub-plugin for media tag management

import { syncTagsToMedia, fetchMediaCache, fetchPlexMediaCache } from '../../../../utils/api';

/**
 * Labelarr Sub-Plugin
 * Handles ARR/Plex tag management within the media search system
 */
export class LabelarrSubPlugin {
    constructor(config = {}) {
        this.id = 'labelarr';
        this.name = 'Tag Management';
        this.description = 'Manage tags between ARR instances and Plex';
        this.version = '1.0.0';
        this.config = config;
    }

    /**
     * Check if this sub-plugin can handle the given media item
     */
    canHandle(mediaItem) {
        // Labelarr can handle any media item that has ARR instances
        const hasArrInstances = mediaItem.instances && 
            mediaItem.instances.some(instance => 
                instance.toLowerCase().includes('radarr') || 
                instance.toLowerCase().includes('sonarr')
            );
        
        return hasArrInstances;
    }

    /**
     * Get the modal type for this sub-plugin
     */
    getModalType() {
        return 'media-management';
    }

    /**
     * Create the modal schema for tag management
     */
    createModalSchema(mediaItem) {
        const schema = [];

        // Parse ARR tags and Plex labels with normalization
        const arrTags = this._parseArrTags(mediaItem);
        const plexLabels = this._parsePlexLabels(mediaItem);

        // Calculate tag states
        const syncedTags = arrTags.filter(tag => plexLabels.includes(tag));
        const unsyncedArrTags = arrTags.filter(tag => !plexLabels.includes(tag));
        const plexOnlyLabels = plexLabels.filter(label => !arrTags.includes(label));

        console.log('Labelarr Tag Analysis:', {
            arrTags,
            plexLabels,
            syncedTags,
            unsyncedArrTags,
            plexOnlyLabels,
        });

        // ARR Instance Selection - only show if multiple ARR instances
        const arrInstances = this._getArrInstances(mediaItem);
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

    /**
     * Get modal layout configuration
     */
    getModalLayout() {
        return {
            type: 'two-column',
            leftColumn: ['media_display'],
            rightColumn: [
                'selected_arr_instance',
                'current_tags',
                'manage_tags',
                'plex_labels',
            ],
        };
    }

    /**
     * Get modal footer buttons
     */
    getModalButtons() {
        return [
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
        ];
    }

    /**
     * Handle modal button clicks
     */
    getButtonHandlers(mediaItem, toast) {
        return {
            'cancel-btn': ({ closeModal }) => {
                closeModal();
            },
            'sync-btn': ({ formData, closeModal }) => {
                this.handleTagSync(formData, mediaItem, closeModal, toast);
            },
        };
    }

    /**
     * Handle tag synchronization
     */
    async handleTagSync(formData, mediaItem, closeModal, toast) {
        try {
            // Get current ARR tags and form tags to calculate actions
            const currentArrTags = this._parseArrTags(mediaItem);
            const newSelectedTags = formData.manage_tags || [];

            // Calculate explicit actions
            const tagsToAdd = newSelectedTags.filter(tag => !currentArrTags.includes(tag));
            const tagsToRemove = currentArrTags.filter(tag => !newSelectedTags.includes(tag));

            // Create explicit action mapping
            const tagActions = {};
            if (tagsToAdd.length > 0) {
                tagActions.add = tagsToAdd;
            }
            if (tagsToRemove.length > 0) {
                tagActions.remove = tagsToRemove;
            }

            // Send minimal data - let backend handle all connection logic
            const payload = {
                source_instance:
                    formData.selected_arr_instance ||
                    (mediaItem.instances && mediaItem.instances[0]),
                media_cache_id: mediaItem.id,
                plex_mapping_id: mediaItem.plex_mapping_id,
                tag_actions: tagActions,
                dry_run: false,
            };

            console.log('Syncing tags with explicit actions:', payload);

            const result = await syncTagsToMedia(payload);

            if (result.success) {
                toast('Tags synced successfully', 'success');
                
                // Trigger data refresh for display - fetch fresh data for next modal open
                try {
                    await Promise.all([
                        fetchMediaCache(),
                        fetchPlexMediaCache()
                    ]);
                    console.log('Display data refreshed after tag sync');
                } catch (refreshError) {
                    console.warn('Failed to refresh display data:', refreshError);
                    // Non-blocking - sync still succeeded
                }
                
                closeModal();
            } else {
                toast('Tag sync failed', 'error');
            }
        } catch (error) {
            console.error('Error syncing tags:', error);
            toast('Error syncing tags', 'error');
        }
    }

    /**
     * Parse ARR tags from media item
     */
    _parseArrTags(mediaItem) {
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
    }

    /**
     * Parse Plex labels from media item
     */
    _parsePlexLabels(mediaItem) {
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
    }

    /**
     * Get ARR instances from media item
     */
    _getArrInstances(mediaItem) {
        return (mediaItem.instances || []).filter(
            instance =>
                instance.toLowerCase().includes('radarr') || 
                instance.toLowerCase().includes('sonarr')
        );
    }

}

// Export singleton instance
export const labelarrSubPlugin = new LabelarrSubPlugin();

// Export default
export default LabelarrSubPlugin;