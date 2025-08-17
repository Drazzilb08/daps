// ui/src/pages/GdriveSearch.jsx
// GDrive search page using the new SearchEngine system

import React, { useCallback, useState } from 'react';
import { GdriveSearchEngine } from '../components/search/SearchEngineFactory';
import { useToast } from '../components/providers/ToastProvider';
import ModalFactory from '../components/modals/ModalFactory';
import { fetchPosterPreviewUrl } from '../utils/api';

export default function GdriveSearch() {
    const toast = useToast();
    const [selectedItem, setSelectedItem] = useState(null);

    const handleResultClick = useCallback(result => {
        setSelectedItem(result);
    }, []);

    const handleModalClose = useCallback(() => {
        setSelectedItem(null);
    }, []);

    const handleResultDelete = useCallback(() => {
        toast('Poster updated in database', 'success');
        setSelectedItem(null); // Close modal after delete
    }, [toast]);

    const handleError = useCallback(
        error => {
            console.error('GDrive search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    // Create modal for selected item
    const createPosterModal = obj => {
        const url = fetchPosterPreviewUrl(obj.location, obj.relativeFile || obj.file);

        // Parse display title and year from filename
        let displayTitle = obj.file || 'Unknown';
        let displayYear = '';

        if (obj.file) {
            let fileName = obj.file.replace(/^.*[\\\\]/, '').replace(/^.*\//, '');
            fileName = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
            let cleanTitle = fileName.replace(/\{(tmdb|tvdb|imdb-tt)[^}]+\}/gi, '').trim();
            cleanTitle = cleanTitle.replace(/-+\s*Season.*$/i, '').trim();
            const titleMatch = cleanTitle.match(/^(.*?)(?:\s*\((\d{4})\))?$/);
            displayTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : cleanTitle;
            displayYear = titleMatch && titleMatch[2] ? titleMatch[2] : '';
        }

        const schema = [
            {
                key: 'poster',
                label: '',
                type: 'poster',
                value: url,
                caption: obj.file || '',
                previewUrl: url,
                ...obj,
                id: undefined, // Remove ID for GdriveSearch - it's just a file path, not useful
                onDeleted: handleResultDelete,
            },
        ];

        return (
            <ModalFactory
                schema={schema}
                entry={{ ...obj, poster: url }}
                title={displayTitle + (displayYear ? ` (${displayYear})` : '')}
                footerButtons={[]}
                modalClass="modal-content-fit"
                onClose={handleModalClose}
            />
        );
    };

    return (
        <>
            <GdriveSearchEngine
                onResultClick={handleResultClick}
                onResultDelete={handleResultDelete}
                onError={handleError}
            />
            {selectedItem && createPosterModal(selectedItem)}
        </>
    );
}
