// ui/src/pages/AssetsSearch.jsx
// Assets search page using the new SearchEngine system

import React, { useCallback, useState } from 'react';
import { AssetsSearchEngine } from '../components/search/SearchEngineFactory';
import { useToast } from '../components/providers/ToastProvider';
import ModalFactory from '../components/modals/ModalFactory';

export default function AssetsSearch() {
    const toast = useToast();
    const [selectedItem, setSelectedItem] = useState(null);

    const handleResultClick = useCallback(result => {
        setSelectedItem(result);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedItem(null);
    }, []);

    const handleResultDelete = useCallback(() => {
        toast('Asset updated in database', 'success');
        setSelectedItem(null); // Close modal after delete
    }, [toast]);

    const handleError = useCallback(
        error => {
            console.error('Assets search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    // Create modal for selected item (asset)
    const createAssetModal = obj => {
        // For assets, use the imageUrl that comes from the search results
        const posterUrl = obj.imageUrl || obj.previewUrl || '';

        const schema = [
            {
                key: 'poster',
                label: '',
                type: 'poster',
                value: posterUrl,
                caption: obj.file || obj.title || '',
                previewUrl: posterUrl,
                ...obj,
                onDeleted: handleResultDelete,
            },
        ];

        const displayTitle = obj.title || obj.file || 'Unknown Asset';

        return (
            <ModalFactory
                schema={schema}
                entry={{ ...obj, poster: posterUrl }}
                title={displayTitle}
                footerButtons={[]}
                modalClass="modal-content-fit"
                onClose={handleModalClose}
            />
        );
    };

    return (
        <>
            <AssetsSearchEngine
                onResultClick={handleResultClick}
                onResultDelete={handleResultDelete}
                onError={handleError}
            />
            {selectedItem && createAssetModal(selectedItem)}
        </>
    );
}
