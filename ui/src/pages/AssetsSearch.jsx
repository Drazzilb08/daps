// ui/src/pages/AssetsSearch.jsx
// Assets search page using the new SearchEngine system

import { useCallback } from 'react';
import { AssetsSearchEngine } from '../components/search/SearchEngineFactory';
import { useToast } from '../components/providers/ToastProvider';

export default function AssetsSearch() {
    const toast = useToast();

    const handleResultDelete = useCallback(() => {
        toast('Asset updated in database', 'success');
    }, [toast]);

    const handleError = useCallback(error => {
        console.error('Assets search error:', error);
        toast('Search error occurred', 'error');
    }, [toast]);

    return <AssetsSearchEngine onResultDelete={handleResultDelete} onError={handleError} />;
}
