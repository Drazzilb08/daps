// ui/src/components/search/views/GridView.jsx
// Clean, modern grid view for media browsing experience

import React, { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * MediaCard - Individual media item card component
 * Displays poster, title, year, and metadata in a clean layout
 */
const MediaCard = memo(
    ({
        result,
        onResultClick,
        getImageUrl,
        getDisplayTitle,
        setupHoverPreview,
        renderMetadata,
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
                className={`media-card ${isFocused ? 'media-card--focused' : ''}`}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${displayTitle}`}
                {...hoverProps}
            >
                <div className="media-card__poster">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={`${displayTitle} poster`}
                            className="media-card__poster-image"
                            loading="lazy"
                        />
                    ) : (
                        <div className="media-card__poster-placeholder">
                            <span className="media-card__poster-icon">
                                {result.type === 'movie'
                                    ? '<�'
                                    : result.type === 'show'
                                      ? '=�'
                                      : '<�'}
                            </span>
                        </div>
                    )}

                    {/* Instance count indicator for multiple instances */}
                    {result.instanceCount > 1 && (
                        <div
                            className="media-card__instance-badge"
                            title={`Available in ${result.instanceCount} instances: ${result.instances?.join(', ')}`}
                        >
                            {result.instanceCount}
                        </div>
                    )}
                </div>

                <div className="media-card__content">
                    <h3 className="media-card__title" title={displayTitle}>
                        {displayTitle}
                    </h3>
                    {subtitle && <p className="media-card__subtitle">{subtitle}</p>}
                </div>

                {/* Render any additional metadata from the renderer */}
                {renderMetadata && renderMetadata(result)}
            </div>
        );
    }
);

MediaCard.displayName = 'MediaCard';

/**
 * GridView - Clean, responsive grid layout for media browsing
 * Features:
 * - Responsive grid that adapts to screen size
 * - Virtualization for performance with large datasets
 * - Clean media card design focusing on poster and title
 * - Keyboard navigation support
 * - Hover preview integration
 */
export default function GridView({
    results = [],
    // searchTerm, // Unused for now
    onResultClick,
    getDisplayTitle,
    getImageUrl,
    setupHoverPreview,
    renderMetadata,
    hoverPreviewImgRef,
    enableHoverPreview,
    focusedResultIndex = -1,
    resultsContainerRef,
    enableVirtualization = true,
    virtualizationThreshold = 100,
    // ...props // Unused for now
}) {
    // State for responsive grid columns
    const [gridColumns, setGridColumns] = useState(() => {
        if (typeof window === 'undefined') return 6; // SSR fallback

        const width = window.innerWidth;
        if (width >= 1400) return 8; // XL screens
        if (width >= 1200) return 7; // Large screens
        if (width >= 1024) return 6; // Desktop
        if (width >= 768) return 4; // Tablet
        if (width >= 600) return 3; // Small tablet
        return 2; // Mobile
    });

    // Update grid columns on window resize with debouncing
    useEffect(() => {
        let timeoutId;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const width = window.innerWidth;
                let newColumns;
                if (width >= 1400) newColumns = 8;
                else if (width >= 1200) newColumns = 7;
                else if (width >= 1024) newColumns = 6;
                else if (width >= 768) newColumns = 4;
                else if (width >= 600) newColumns = 3;
                else newColumns = 2;

                setGridColumns(newColumns);
            }, 150); // Debounce resize events
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Group results into rows for virtualization
    const gridRows = useMemo(() => {
        const rows = [];
        for (let i = 0; i < results.length; i += gridColumns) {
            rows.push(results.slice(i, i + gridColumns));
        }
        return rows;
    }, [results, gridColumns]);

    const cardHeight = 280; // Approximate height of a media card
    const gap = 16;
    const rowHeight = cardHeight + gap;

    // Decide whether to use virtualization
    const shouldVirtualize = enableVirtualization && results.length > virtualizationThreshold;

    // Virtualization setup
    const virtualizer = useVirtualizer({
        count: shouldVirtualize ? gridRows.length : 0,
        getScrollElement: () => resultsContainerRef?.current || null,
        estimateSize: () => rowHeight,
        overscan: 3, // Render 3 extra rows above/below viewport for smooth scrolling
    });

    if (!shouldVirtualize) {
        // Non-virtualized fallback for smaller datasets
        return (
            <div
                className="grid-view"
                ref={resultsContainerRef}
                style={{
                    '--grid-columns': gridColumns,
                    '--card-width': '180px',
                    '--gap': `${gap}px`,
                }}
            >
                <div className="grid-view__container">
                    {results.map((result, index) => (
                        <MediaCard
                            key={result.id || index}
                            result={result}
                            onResultClick={onResultClick}
                            getImageUrl={getImageUrl}
                            getDisplayTitle={getDisplayTitle}
                            setupHoverPreview={setupHoverPreview}
                            renderMetadata={renderMetadata}
                            hoverPreviewImgRef={hoverPreviewImgRef}
                            enableHoverPreview={enableHoverPreview}
                            isFocused={index === focusedResultIndex}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Virtualized version for large datasets
    return (
        <div
            className="grid-view grid-view--virtualized"
            ref={resultsContainerRef}
            style={{
                '--grid-columns': gridColumns,
                '--card-width': '180px',
                '--gap': `${gap}px`,
                height: '100%', // Use full height of parent container
                minHeight: '400px', // Minimum height for proper virtualization
                overflow: 'auto',
            }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map(virtualRow => {
                    const row = gridRows[virtualRow.index];
                    if (!row) return null;

                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div className="grid-view__container">
                                {row.map((result, colIndex) => {
                                    const globalIndex = virtualRow.index * gridColumns + colIndex;
                                    return (
                                        <MediaCard
                                            key={result.id || globalIndex}
                                            result={result}
                                            onResultClick={onResultClick}
                                            getImageUrl={getImageUrl}
                                            getDisplayTitle={getDisplayTitle}
                                            setupHoverPreview={setupHoverPreview}
                                            renderMetadata={renderMetadata}
                                            hoverPreviewImgRef={hoverPreviewImgRef}
                                            enableHoverPreview={enableHoverPreview}
                                            isFocused={globalIndex === focusedResultIndex}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
