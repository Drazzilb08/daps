import React, { useCallback, useState } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import { refreshMediaDatabase } from '../utils/api';
import { useToast } from '../components/providers/ToastProvider';
import '../css/pages/media-search.css';

export default function MediaSearch() {
    const toast = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    return (
        <div className="media-search-page">
            <MediaSearchComponent
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                showRefreshControls={true}
            />
        </div>
    );
}
