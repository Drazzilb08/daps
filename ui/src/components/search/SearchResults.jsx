import React from 'react';
import GridView from './views/GridView';
import ListView from './views/ListView';

/**
 * Extracts image URL from search result
 * @param {Object} result - Search result object
 * @returns {string} Image URL or empty string
 */
const getImageUrl = result => {
    const posterData = result.original || result;
    if (result.imageUrl) return result.imageUrl;
    if (posterData.location && posterData.file) {
        return `/api/poster/preview?location=${encodeURIComponent(posterData.location)}&file=${encodeURIComponent(posterData.relativeFile || posterData.file)}&thumb=1`;
    }
    return '';
};

/**
 * Generates display title from search result with year and type info
 * @param {Object} result - Search result object
 * @returns {string} Formatted display title
 */
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

/**
 * Renders metadata indicators for search results
 * @param {Object} result - Search result object
 * @returns {JSX.Element|null} Metadata component or null
 */
const renderMetadata = result => {
    if (result.instanceCount > 1) {
        return <div className="multiple-instances-indicator">{result.instanceCount}</div>;
    }
    return null;
};

/**
 * Search results component that renders results in grid or list view
 * @param {Object} props - Component props
 * @param {string|null} props.error - Error message to display
 * @param {Array} [props.results=[]] - Array of search results
 * @param {string} props.searchTerm - Current search term
 * @param {string} [props.currentView='grid'] - View mode (grid/list)
 * @param {Object} props.viewProps - Additional props for view components
 * @returns {JSX.Element} Rendered search results or empty/error state
 */
export default function SearchResults({
    error,
    results = [],
    searchTerm,
    currentView = 'grid',
    ...viewProps
}) {
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
