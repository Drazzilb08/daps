import React from 'react';
import ModalFactory from '../modals/ModalFactory';
import { fetchPosterPreviewUrl } from '../../utils/api';

export default function ModalTrigger({ obj, onClose, onDeleted }) {
    // DB asset record
    const isAsset = !!obj.asset_type;

    // Image URL
    let url = '';
    if (obj.location && obj.file) {
        url = fetchPosterPreviewUrl(obj.location, obj.file);
    }

    // For gdrive/custom, parse as before
    let displayTitle = obj.title || obj.file;
    let displayYear = obj.year;

    // For legacy/gdrive/custom, parse from file string
    if (!isAsset) {
        let fileName = obj.file || '';
        fileName = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
        let cleanTitle = fileName.replace(/\{(tmdb|tvdb|imdb-tt)[^}]+\}/gi, '').trim();
        cleanTitle = cleanTitle.replace(/-+\s*Season.*$/i, '').trim();
        const titleMatch = cleanTitle.match(/^(.*?)(?:\s*\((\d{4})\))?$/);
        displayTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : cleanTitle;
        displayYear = titleMatch && titleMatch[2] ? titleMatch[2] : '';
    }

    // Compose ModalFactory schema - poster only, no DB fields
    const fields = [
        {
            key: 'poster',
            label: '',
            type: 'poster',
            value: url,
            caption: obj.file || '',
            previewUrl: url,
            ...obj,
            onDeleted,
        },
    ];

    return (
        <ModalFactory
            schema={fields}
            entry={{ ...obj, poster: url }}
            title={displayTitle + (displayYear ? ` (${displayYear})` : '')}
            footerButtons={[]}
            modalClass="modal-content-fit"
            onClose={onClose}
        />
    );
}
