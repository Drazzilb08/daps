import React, { useState, useCallback } from 'react';
import GridView from './views/GridView';
import ListView from './views/ListView';
import Tooltip from '../Tooltip';

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
 * Renders metadata indicators for search results with proper tooltip
 * @param {Object} result - Search result object
 * @param {string} position - Position type ('overlay', 'inline') for styling
 * @param {Object} tooltipState - Tooltip state management
 * @returns {JSX.Element|null} Metadata component or null
 */
const renderMetadata = (result, position = 'overlay', tooltipState = {}) => {
    if (result.instanceCount > 1) {
        const className =
            position === 'overlay' ? 'media-card__instance-badge' : 'instance-indicator--inline';

        const tooltipText = `Available in ${result.instanceCount} instances${
            result.instances ? `: ${result.instances.join(', ')}` : ''
        }`;

        const badgeId = `instance-badge-${result.id || result.title?.replace(/\s+/g, '-') || 'unknown'}`;

        return (
            <>
                <div
                    id={badgeId}
                    className={className}
                    onMouseEnter={e => tooltipState.showTooltip?.(e.currentTarget, tooltipText)}
                    onMouseLeave={() => tooltipState.hideTooltip?.()}
                    aria-label={tooltipText}
                >
                    {result.instanceCount}
                </div>
            </>
        );
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
    // Tooltip state management
    const [tooltipState, setTooltipState] = useState({
        show: false,
        anchor: null,
        text: '',
    });

    const showTooltip = useCallback((anchor, text) => {
        setTooltipState({
            show: true,
            anchor,
            text,
        });
    }, []);

    const hideTooltip = useCallback(() => {
        setTooltipState({
            show: false,
            anchor: null,
            text: '',
        });
    }, []);
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
        renderMetadata: (result, position = 'overlay') =>
            renderMetadata(result, currentView, position, { showTooltip, hideTooltip }),
        ...viewProps,
    };

    return (
        <>
            {currentView === 'list' ? <ListView {...commonProps} /> : <GridView {...commonProps} />}

            <Tooltip
                anchor={tooltipState.anchor}
                text={tooltipState.text}
                show={tooltipState.show}
                position="top"
            />
        </>
    );
}
