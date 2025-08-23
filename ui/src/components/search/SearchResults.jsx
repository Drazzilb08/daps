// ui/src/components/search/SearchResults.jsx
// Simple search results that uses GridView/ListView directly

import React from 'react';
import GridView from './views/GridView';
import ListView from './views/ListView';

// Helper functions that will be moved to the views eventually
const getImageUrl = result => {
    const posterData = result.original || result;
    if (result.imageUrl) return result.imageUrl;
    if (posterData.location && posterData.file) {
        return `/api/poster/preview?location=${encodeURIComponent(posterData.location)}&file=${encodeURIComponent(posterData.relativeFile || posterData.file)}&thumb=1`;
    }
    return '';
};

const getDisplayTitle = result => {
    const posterData = result.original || result;
    const title = result.title || posterData.title || posterData.file || 'Untitled';
    const year = result.year || posterData.year;
    const type = result.type || posterData.type || posterData.asset_type;

    if (year && (type === 'movie' || type === 'show' || type === 'collection')) {
        return `${title} (${year})`;
    }
    return title;
};

const renderMetadata = result => {
    // MediaSearch-style instance indicators
    if (result.instanceCount > 1) {
        return <div className="multiple-instances-indicator">{result.instanceCount}</div>;
    }
    return null;
};

export default function SearchResults({
    error,
    results = [],
    searchTerm,
    currentView = 'grid',
    ...viewProps
}) {
    // ===== ERROR STATE =====
    if (error) {
        return (
            <div className="search-error-container" role="alert" aria-live="assertive">
                <div className="search-error-icon" aria-hidden="true">
                    ⚠️
                </div>
                <div className="search-error-content">
                    <div className="search-error-title">Search Error</div>
                    <div className="search-error-message">{error}</div>
                </div>
            </div>
        );
    }

    // ===== EMPTY STATE =====
    if (!results.length) {
        if (!searchTerm || !searchTerm.trim()) {
            return (
                <div className="search-empty-container" role="status" aria-live="polite">
                    <div className="search-empty-icon" aria-hidden="true">
                        🔍
                    </div>
                    <div className="search-empty-content">
                        <div className="search-empty-title">Ready to Search</div>
                        <div className="search-empty-message">
                            Type a search term and press <kbd>Enter</kbd> or click{' '}
                            <strong>Search</strong>.
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="search-empty-container" role="status" aria-live="polite">
                <div className="search-empty-icon" aria-hidden="true">
                    📭
                </div>
                <div className="search-empty-content">
                    <div className="search-empty-title">No Results Found</div>
                    <div className="search-empty-message">
                        No results found for &ldquo;<strong>{searchTerm}</strong>&rdquo;. Try
                        adjusting your search terms or filters.
                    </div>
                    <div className="search-empty-refresh-notice">
                        <strong>Missing content?</strong> If you expect to see this item but
                        it&apos;s not appearing, try <strong>refreshing your database</strong> using
                        the refresh button above.
                    </div>
                </div>
            </div>
        );
    }

    // ===== RENDER RESULTS =====
    const commonProps = {
        results,
        searchTerm,
        getImageUrl,
        getDisplayTitle,
        renderMetadata,
        ...viewProps,
    };

    if (currentView === 'list') {
        return <ListView {...commonProps} />;
    }

    return <GridView {...commonProps} />;
}
