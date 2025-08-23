// ui/src/components/search/views/ListView.jsx
// Clean, simple list view for media browsing

import React, { memo, useCallback } from 'react';

/**
 * ListItem - Individual media item in list format
 * Compact display with poster thumbnail, title, and metadata
 */
const ListItem = memo(
    ({
        result,
        onResultClick,
        getImageUrl,
        getDisplayTitle,
        setupHoverPreview,
        hoverPreviewImgRef,
        enableHoverPreview,
        isFocused,
    }) => {
        const handleClick = useCallback(() => {
            onResultClick(result);
        }, [result, onResultClick]);

        const handleKeyDown = useCallback(
            e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onResultClick(result);
                }
            },
            [result, onResultClick]
        );

        // Get hover preview props if enabled
        const hoverProps = setupHoverPreview
            ? setupHoverPreview(result, hoverPreviewImgRef, enableHoverPreview)
            : {};

        const imageUrl = getImageUrl(result);
        const displayTitle = getDisplayTitle(result);
        const subtitle =
            result.type === 'show' && result.seasonCount > 0
                ? result.seasonCount === 1
                    ? '1 Season'
                    : `${result.seasonCount} Seasons`
                : '';

        return (
            <div
                className={`list-item ${isFocused ? 'list-item--focused' : ''}`}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${displayTitle}`}
                {...hoverProps}
            >
                <div className="list-item__poster">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={`${displayTitle} poster`}
                            className="list-item__poster-image"
                            loading="lazy"
                        />
                    ) : (
                        <div className="list-item__poster-placeholder">
                            <span className="list-item__poster-icon">
                                {result.type === 'movie'
                                    ? '<�'
                                    : result.type === 'show'
                                      ? '=�'
                                      : '<�'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="list-item__content">
                    <div className="list-item__main">
                        <h3 className="list-item__title">{displayTitle}</h3>
                        {subtitle && <p className="list-item__subtitle">{subtitle}</p>}
                    </div>

                    <div className="list-item__meta">
                        <span className="list-item__type">
                            {result.type === 'movie'
                                ? 'Movie'
                                : result.type === 'show'
                                  ? 'TV Show'
                                  : result.type || 'Media'}
                        </span>

                        {result.instanceCount > 1 && (
                            <span
                                className="list-item__instances"
                                title={`Available in ${result.instanceCount} instances: ${result.instances?.join(', ')}`}
                            >
                                {result.instanceCount} instances
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

ListItem.displayName = 'ListItem';

/**
 * ListView - Simple, scannable list layout for media browsing
 * Features:
 * - Compact list items with thumbnail and metadata
 * - Keyboard navigation support
 * - Hover preview integration
 * - Clean, accessible design
 */
export default function ListView({
    results = [],
    // searchTerm, // Unused for now
    onResultClick,
    getDisplayTitle,
    getImageUrl,
    setupHoverPreview,
    hoverPreviewImgRef,
    enableHoverPreview,
    focusedResultIndex = -1,
    resultsContainerRef,
    // ...props // Unused for now
}) {
    return (
        <div className="list-view" ref={resultsContainerRef}>
            <div className="list-view__container">
                {results.map((result, index) => (
                    <ListItem
                        key={result.id || index}
                        result={result}
                        onResultClick={onResultClick}
                        getImageUrl={getImageUrl}
                        getDisplayTitle={getDisplayTitle}
                        setupHoverPreview={setupHoverPreview}
                        hoverPreviewImgRef={hoverPreviewImgRef}
                        enableHoverPreview={enableHoverPreview}
                        isFocused={index === focusedResultIndex}
                    />
                ))}
            </div>
        </div>
    );
}
