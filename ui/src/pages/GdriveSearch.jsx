// ui/src/pages/GdriveSearch.jsx
// GDrive search page using the new SearchEngine system

import React, { useCallback } from 'react';
import { GdriveSearchEngine } from '../components/search/SearchEngineFactory';
import { useToast } from '../components/providers/ToastProvider';

export default function GdriveSearch() {
    const toast = useToast();

    const handleResultDelete = useCallback(() => {
        toast('Poster updated in database', 'success');
    }, [toast]);

    const handleError = useCallback(
        error => {
            console.error('GDrive search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    return <GdriveSearchEngine onResultDelete={handleResultDelete} onError={handleError} />;
}
