// ui/src/pages/MediaSearch.jsx
// Media search page using consistent plugin architecture

import React, { useCallback } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';

export default function MediaSearch() {
    const toast = useToast();

    const handleError = useCallback(
        error => {
            console.error('Media search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    return (
        <MediaSearchComponent
            onError={handleError}
            // Plugin system handles modal creation automatically via modalComponent config
            // Plugin system handles refresh controls via showRefreshControls config
            // Note: No onResultClick provided - SearchCore will use modalComponent from plugin config
        />
    );
}
