import React from 'react';
import ModalFactory from '../modals/ModalFactory';
import { fetchPosterPreviewUrl } from '../../utils/api';

export default function PosterSearchModalTrigger({ obj, onClose, onDeleted }) {
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

    // Compose ModalFactory schema
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

    // Add DB fields if asset
    if (isAsset) {
        if (obj.asset_type)
            fields.push({ key: 'asset_type', label: 'Type', value: obj.asset_type, type: 'text' });
        if (obj.title)
            fields.push({ key: 'title', label: 'Title', value: obj.title, type: 'text' });
        if (obj.year) fields.push({ key: 'year', label: 'Year', value: obj.year, type: 'text' });
        if (obj.season_number != null)
            fields.push({ key: 'season', label: 'Season', value: obj.season_number, type: 'text' });
        if (obj.id) fields.push({ key: 'id', label: 'ID', value: obj.id, type: 'text' });
        // add any other DB fields you want here, but always with a type
    }

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
