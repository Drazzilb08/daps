// ui/src/components/search/views/ListView.jsx
// Clean, simple list view for media browsing

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSearchView } from '../../../hooks/useSearchView';
import { SearchResultsGrouping, VirtualizedContainer } from '../components';

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

                        {renderMetadata && renderMetadata(result, 'inline')}
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
 * - Always virtualized for consistent performance with GridView
 * - Compact list items with thumbnail and metadata
 * - Responsive item sizing based on screen width
 * - Keyboard navigation support
 * - Hover preview integration
 * - Clean, accessible design
 */
export default function ListView({
    results = [],
    currentSort,
    priorityOrder = {},
    ownerPriorityOrder = {},
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
    // Grouping configuration
    groupBy = null,
    // ...props // Unused for now
}) {
    // State for responsive item height calculation
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false; // SSR fallback
        return window.innerWidth <= 768;
    });

    // Update mobile state on window resize with debouncing
    useEffect(() => {
        let timeoutId;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setIsMobile(window.innerWidth <= 768);
            }, 150); // Debounce resize events
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Use shared search view logic for grouping and flattening
    const { flattenedItems } = useSearchView({
        results,
        groupBy,
        currentSort,
        priorityOrder,
        ownerPriorityOrder,
    });

    // Calculate responsive item height based on ListItem component structure:
    // - Base min-height: 44px (control-min-height for accessibility)
    // - Padding: varies by screen size (12px default, 8px mobile)
    // - Content: poster height (90px default, 75px mobile) + internal gaps
    //
    // Calculation breakdown:
    // - Desktop: 90px poster + 24px padding (12px top/bottom) + 6px internal gaps = ~120px
    // - Mobile: 75px poster + 16px padding (8px top/bottom) + 4px internal gaps = ~95px
    const itemHeight = isMobile ? 95 : 120;

    // Group header height: title + padding
    const headerHeight = isMobile ? 50 : 60;

    // Dynamic item height calculation
    const getItemHeight = useCallback(
        itemIndex => {
            const item = flattenedItems[itemIndex];
            if (!item) return itemHeight;

            // Check if this is a header item
            if (item.type === 'header') {
                return headerHeight;
            }

            return itemHeight;
        },
        [flattenedItems, itemHeight, headerHeight]
    );

    // Render function for virtualized items
    const renderListItem = useCallback(
        (virtualItem, flattenedItems) => {
            const item = flattenedItems[virtualItem.index];
            if (!item) return null;

            return (
                <div className="list-view__container">
                    {item.type === 'header' ? (
                        <SearchResultsGrouping
                            key={`header-${item.groupKey}`}
                            groupKey={item.groupKey}
                            groupBy={item.groupBy}
                            variant="list"
                        />
                    ) : (
                        <ListItem
                            key={item.data.id || `item-${virtualItem.index}`}
                            result={item.data}
                            onResultClick={onResultClick}
                            getImageUrl={getImageUrl}
                            getDisplayTitle={getDisplayTitle}
                            setupHoverPreview={setupHoverPreview}
                            renderMetadata={renderMetadata}
                            hoverPreviewImgRef={hoverPreviewImgRef}
                            enableHoverPreview={enableHoverPreview}
                            isFocused={item.originalIndex === focusedResultIndex}
                        />
                    )}
                </div>
            );
        },
        [
            onResultClick,
            getImageUrl,
            getDisplayTitle,
            setupHoverPreview,
            renderMetadata,
            hoverPreviewImgRef,
            enableHoverPreview,
            focusedResultIndex,
        ]
    );

    // Always use virtualization for consistent performance with GridView
    return (
        <VirtualizedContainer
            items={flattenedItems}
            estimateSize={getItemHeight}
            containerRef={resultsContainerRef}
            renderItem={renderListItem}
            className="list-view list-view--virtualized"
            overscan={5}
        />
    );
}
