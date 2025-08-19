// ui/src/pages/GdriveSearch.jsx
// GDrive search page using consistent plugin architecture

import React, { useCallback } from 'react';
import { GdriveSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';

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
        <GdriveSearchComponent
            onError={handleError}
            // Plugin system handles modal creation automatically via modalComponent config
            // Note: No onResultClick provided - SearchCore will use modalComponent from plugin config
        />
    );
}
