// ui/src/components/search/plugins/AssetsPlugin.js
// Assets search plugin with isolated business logic

import React from 'react';
import { PluginBuilder } from './PluginSchema';
import { assetsSearchAdapter } from '../adapters/AssetsSearchAdapter';
import ModalFactory from '../../modals/ModalFactory';
import { fetchPosterPreviewUrl } from '../../../utils/api';

/**
 * Create poster modal schema for assets
 */
function createAssetsPosterModal({ obj, onClose, onDeleted }) {
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

    // Create schema for ModalFactory
    const schema = [
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
            schema={schema}
            entry={{ ...obj, poster: url }}
            title={displayTitle + (displayYear ? ` (${displayYear})` : '')}
            footerButtons={[]}
            modalClass="modal-content-fit"
            onClose={onClose}
        />
    );
}

/**
 * Assets Search Plugin
 * Business logic is completely isolated - UI components are shared
 */
export const assetsPluginConfig = new PluginBuilder('assets-search', 'Assets Search')
    .setMetadata('1.0.0', 'Search and browse poster assets in the local assets directory')
    .setAdapter(assetsSearchAdapter)
    .addSource('assets', 'Assets', 'mi:folder', 'Search Assets')
    .addFilter(
        'assetTypeFilter',
        'dropdown',
        'Filter by type of asset in Assets tab',
        [
            { value: 'all', label: 'All' },
            { value: 'collections', label: 'Collections' },
            { value: 'movies', label: 'Movies' },
            { value: 'shows', label: 'Shows' },
        ],
        'mi:filter_list'
    )
    .setUI({
        placeholder: 'Search posters in Assets Directory...',
        defaultView: 'grid',
        defaultSort: 'alpha',
        defaultSource: 'assets',
        renderer: 'poster',
        enableHoverPreview: true,
        modalComponent: createAssetsPosterModal,
        sortOptions: [
            { value: 'alpha', label: 'A-Z' },
            { value: 'alpha-desc', label: 'Z-A' },
            { value: 'date', label: 'Date Added' },
        ],
    })
    .setEventHandlers({
        onDataLoaded: (_, data) => {
            console.log('Assets data loaded:', data ? Object.keys(data) : 'null');
        },
        onError: (_, error) => {
            console.warn('Assets plugin error:', error.message);
        },
    })
    .addHooks({
        onInit: () => {
            console.log('Assets Search Plugin initialized');
        },
        onDestroy: () => {
            console.log('Assets Search Plugin destroyed');
        },
    })
    .build();

// Register the plugin automatically
import pluginRegistry from './PluginRegistry';

if (!pluginRegistry.getPlugin('assets-search')) {
    pluginRegistry.registerPlugin(assetsPluginConfig);
}

export default assetsPluginConfig;
