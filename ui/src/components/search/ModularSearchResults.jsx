// ui/src/components/search/ModularSearchResults.jsx
// Modular search results component that dispatches to pluggable renderers

import React from 'react';
import SimpleListRenderer from './renderers/SimpleListRenderer';
import PosterRenderer from './renderers/PosterRenderer';

// Registry of available renderers
const RENDERERS = {
    'simple': new SimpleListRenderer(),
    'poster': new PosterRenderer(), // Generic poster renderer for both assets and grouped displays
};

export default function ModularSearchResults({
    error,
    results = [],
    searchTerm,
    renderer = 'simple', // Which renderer to use
    ...renderProps
}) {
    const searchRenderer = RENDERERS[renderer];
    
    if (!searchRenderer) {
        console.error(`Unknown renderer: ${renderer}. Available renderers:`, Object.keys(RENDERERS));
        return <div className="poster-search-error">Invalid renderer configuration</div>;
    }

    // ===== ERROR STATE =====
    if (error) {
        return searchRenderer.renderError(error);
    }
    
    // ===== EMPTY STATE =====
    if (!results.length) {
        return searchRenderer.renderEmptyState(searchTerm);
    }
    
    // ===== RENDER RESULTS =====
    return searchRenderer.render({
        results,
        searchTerm,
        ...renderProps
    });
}

// Export renderer registry for extensibility
export { RENDERERS };

// Function to register new renderers
export function registerRenderer(name, rendererInstance) {
    if (!rendererInstance.render) {
        throw new Error('Renderer must implement render() method');
    }
    RENDERERS[name] = rendererInstance;
    console.log(`SearchRenderer '${name}' registered successfully`);
}

// Function to get available renderer names
export function getAvailableRenderers() {
    return Object.keys(RENDERERS);
}