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
        <div className="media-search-page">
            <MediaSearchComponent className="media-search-content" onError={handleError} />
        </div>
    );
}
