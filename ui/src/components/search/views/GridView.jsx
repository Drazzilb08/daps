// ui/src/components/search/views/GridView.jsx
// Clean, modern grid view for media browsing experience

import React, { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
// Simple grouping functions (moved from deleted helpers)
const groupByOwner = files => {
    const groups = {};
    files.forEach(fileObj => {
        const fileData = fileObj.original || fileObj;
        const owner = fileData.name || 'Unknown';
        if (!groups[owner]) groups[owner] = [];
        groups[owner].push(fileObj);
    });
    return groups;
};

const groupByLocation = files => {
    const groups = {};
    files.forEach(fileObj => {
        const fileData = fileObj.original || fileObj;
        const location = fileData.location || 'Unknown';
        if (!groups[location]) groups[location] = [];
        groups[location].push(fileObj);
    });
    return groups;
};
import { SearchSorter } from '../sorting';

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
                    {renderMetadata && renderMetadata(result, 'overlay')}
                </div>

                <div className="media-card__content">
                    <h3 className="media-card__title" title={displayTitle}>
                        {displayTitle}
                    </h3>
                    {subtitle && <p className="media-card__subtitle">{subtitle}</p>}
                </div>
            </div>
        );
    }
);

MediaCard.displayName = 'MediaCard';

/**
 * GroupHeader - Header component for grouped sections
 * Displays the group name with consistent styling
 */
const GroupHeader = memo(({ groupKey, groupBy }) => {
    const getGroupLabel = () => {
        if (groupBy === 'owner') {
            return `Owner: ${groupKey}`;
        }
        if (groupBy === 'location') {
            return `Location: ${groupKey}`;
        }
        return groupKey;
    };

    return (
        <div className="group-header">
            <h2 className="group-header__title">{getGroupLabel()}</h2>
        </div>
    );
});

GroupHeader.displayName = 'GroupHeader';

/**
 * GridView - Clean, responsive grid layout for media browsing
 * Features:
 * - Responsive grid that adapts to screen size
 * - Always virtualized for consistent performance
 * - Clean media card design focusing on poster and title
 * - Keyboard navigation support
 * - Hover preview integration
 */
export default function GridView({
    results = [],
    currentSort,
    priorityOrder = {},
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

    // Handle grouping logic internally - moved from PosterRenderer
    const { processedGroups, processedGroupOrder } = useMemo(() => {
        if (!groupBy || !results.length) {
            return { processedGroups: null, processedGroupOrder: [] };
        }

        let computedGroups;
        let computedGroupOrder;

        if (groupBy === 'location') {
            computedGroups = groupByLocation(results);
            computedGroupOrder = Object.keys(computedGroups);
        } else if (groupBy === 'owner') {
            computedGroups = groupByOwner(results);

            // Get the proper group order based on sorting and priority
            computedGroupOrder = SearchSorter.sortGroups(computedGroups, currentSort, {
                priorityOrder,
                ownerPriorityOrder: priorityOrder?.ownerPriorityOrder || {},
                groupBy: 'owner',
            });
        } else {
            // Unknown groupBy - disable grouping
            return { processedGroups: null, processedGroupOrder: [] };
        }

        return {
            processedGroups: computedGroups,
            processedGroupOrder: computedGroupOrder,
        };
    }, [results, groupBy, currentSort, priorityOrder]);

    // Flatten grouped data for virtualization or use results directly
    const flattenedItems = useMemo(() => {
        console.log('GridView flattening debug:', {
            hasGroupBy: !!groupBy,
            hasProcessedGroups: !!processedGroups,
            groupCount: processedGroups ? Object.keys(processedGroups).length : 0,
            hasProcessedGroupOrder: !!processedGroupOrder?.length,
            groupOrderLength: processedGroupOrder?.length || 0,
            resultsLength: results.length,
        });

        if (!groupBy || !processedGroups || !processedGroupOrder?.length) {
            console.log('GridView: Using NON-GROUPED path, rendering all items directly');
            // Non-grouped: convert results to flat array of items
            return results.map((result, index) => ({
                type: 'item',
                data: result,
                originalIndex: index,
            }));
        }

        // Grouped: flatten into alternating headers and items
        console.log('GridView: Using GROUPED path, flattening groups for virtualization');
        const flattened = [];
        processedGroupOrder.forEach(groupKey => {
            const groupItems = processedGroups[groupKey] || [];
            if (groupItems.length > 0) {
                // Add group header
                flattened.push({
                    type: 'header',
                    groupKey,
                    groupBy,
                });
                // Add group items
                groupItems.forEach(item => {
                    flattened.push({
                        type: 'item',
                        data: item,
                    });
                });
            }
        });
        return flattened;
    }, [results, groupBy, processedGroups, processedGroupOrder]);

    // Group flattened items into rows for grid display
    const gridRows = useMemo(() => {
        const rows = [];
        let currentRow = [];

        flattenedItems.forEach(item => {
            if (item.type === 'header') {
                // If we have items in current row, add it first
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                    currentRow = [];
                }
                // Add header as its own row
                rows.push([item]);
            } else {
                // Add item to current row
                currentRow.push(item);
                // If row is full, start a new one
                if (currentRow.length === gridColumns) {
                    rows.push(currentRow);
                    currentRow = [];
                }
            }
        });

        // Add any remaining items
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        return rows;
    }, [flattenedItems, gridColumns]);

    // Calculate responsive heights for different row types
    // Card heights based on MediaCard component structure:
    // - Poster: 180px width × 3/2 aspect ratio = 270px height
    // - Content area varies by grid columns (responsive breakpoints):
    //   - Mobile (2-3 cols): 50px min-height + 16px padding = 66px
    //   - Desktop (4+ cols): 60px min-height + 24px padding = 84px
    // - Gap varies: 12px on small screens, 16px on larger screens
    const isMobile = gridColumns <= 3; // Mobile breakpoints use 2-3 columns
    const contentHeight = isMobile ? 66 : 84;
    const cardHeight = 270 + contentHeight; // Poster + content area
    const gap = isMobile ? 12 : 16;
    const cardRowHeight = cardHeight + gap;

    // Group header height: title + padding
    const headerHeight = isMobile ? 60 : 80;

    // Dynamic row height calculation
    const getRowHeight = useCallback(
        rowIndex => {
            const row = gridRows[rowIndex];
            if (!row || row.length === 0) return cardRowHeight;

            // Check if this is a header row
            if (row[0]?.type === 'header') {
                return headerHeight;
            }

            return cardRowHeight;
        },
        [gridRows, cardRowHeight, headerHeight]
    );

    // Virtualization setup - always enabled for consistent performance
    const virtualizer = useVirtualizer({
        count: gridRows.length,
        getScrollElement: () => resultsContainerRef?.current || null,
        estimateSize: getRowHeight,
        overscan: 3, // Render 3 extra rows above/below viewport for smooth scrolling
    });

    // Always use virtualization for consistent performance
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

                    // Debug: Log virtualization behavior
                    if (virtualRow.index === 0) {
                        console.log('GridView Virtualizer Status:', {
                            totalRows: gridRows.length,
                            virtualItemsCount: virtualizer.getVirtualItems().length,
                            totalSize: virtualizer.getTotalSize(),
                            scrollElementHeight:
                                resultsContainerRef?.current?.clientHeight || 'unknown',
                        });
                    }

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
                            <div
                                className={`grid-view__container ${row[0]?.type === 'header' ? 'grid-view__container--header' : ''}`}
                            >
                                {row.map((item, colIndex) => {
                                    if (item.type === 'header') {
                                        return (
                                            <GroupHeader
                                                key={`header-${item.groupKey}`}
                                                groupKey={item.groupKey}
                                                groupBy={item.groupBy}
                                            />
                                        );
                                    }

                                    const globalIndex = virtualRow.index * gridColumns + colIndex;
                                    return (
                                        <MediaCard
                                            key={item.data.id || `item-${globalIndex}`}
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
