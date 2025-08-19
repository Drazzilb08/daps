// ui/src/pages/AssetsSearch.jsx
// Assets search page using consistent plugin architecture

import React, { useCallback } from 'react';
import { AssetsSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';

export default function AssetsSearch() {
    const toast = useToast();

    const handleError = useCallback(
        error => {
            console.error('Assets search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    return (
        <AssetsSearchComponent
            onError={handleError}
            // Plugin system handles modal creation automatically via modalComponent config
            // Note: No onResultClick provided - SearchCore will use modalComponent from plugin config
        />
    );
}
