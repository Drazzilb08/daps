// ui/src/components/search/views/GridView.jsx
// Grid View with hybrid virtualization - used by all search types

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import LazyImage from '../../common/LazyImage';

// CSS-First Configuration: All values read from CSS custom properties
// No hardcoded values - CSS is the single source of truth

export default function GridView({
    results = [],
    searchTerm = '',
    onResultClick,
    getResultKey,
    getDisplayTitle,
    getImageUrl,
    highlightSearchTerm,
    renderMetadata = () => null,
    className = 'search-results',
    focusedResultIndex = -1,
    resultsContainerRef,

    // Simplified configuration - always virtualized
    groupBy = null,
}) {
    // Always virtualized - single unified system
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [scrollTop, setScrollTop] = useState(0);

    // Performance: Use base values and calculate dynamic sizing for edge-to-edge layout
    const baseItemWidth = 160;
    const itemHeight = 320;
    const gap = 19.2; // 1.2em ≈ 19.2px

    // Calculate items per row and dynamic width for edge-to-edge layout with responsive behavior
    const { itemsPerRow, itemWidth, responsiveGap } = useMemo(() => {
        if (containerSize.width <= 0)
            return { itemsPerRow: 1, itemWidth: baseItemWidth, responsiveGap: gap };

        // Responsive gap and minimum width based on screen size
        const isMobile = containerSize.width <= 768;
        const currentGap = isMobile ? 12.8 : gap; // 0.8em vs 1.2em
        const minWidth = isMobile ? 100 : 140;

        // Calculate how many items fit with base width
        const baseItemsPerRow = Math.max(
            1,
            Math.floor(containerSize.width / (minWidth + currentGap))
        );

        // Calculate actual item width to fill container completely (edge-to-edge)
        const actualItemWidth =
            (containerSize.width - (baseItemsPerRow - 1) * currentGap) / baseItemsPerRow;

        return {
            itemsPerRow: baseItemsPerRow,
            itemWidth: Math.max(minWidth, actualItemWidth),
            responsiveGap: currentGap,
        };
    }, [containerSize.width, baseItemWidth, gap]);

    // Update container size on resize (always virtualized)
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({ width: rect.width, height: rect.height });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Handle scroll (always virtualized)
    const handleScroll = useCallback(e => {
        setScrollTop(e.target.scrollTop);
    }, []);

    // Group results for proper rendering
    const groupedData = useMemo(() => {
        if (!groupBy) return { isGrouped: false, groups: [], allItems: results };

        // Group results first
        const groups = {};
        results.forEach(item => {
            let groupKey;
            if (groupBy === 'owner') {
                groupKey = item.name || item.original?.name || 'Unknown';
            } else {
                groupKey = item[groupBy] || item.original?.[groupBy] || 'Unknown';
            }
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
        });

        // Convert to array of group objects
        const groupArray = Object.entries(groups).map(([groupKey, items]) => ({
            groupKey,
            items,
            itemCount: items.length,
        }));

        return { isGrouped: true, groups: groupArray, allItems: results };
    }, [results, groupBy]);

    // Calculate total height and visible content
    const layoutData = useMemo(() => {
        if (!groupedData.isGrouped) {
            // Non-grouped layout - standard grid
            const totalRows = Math.ceil(results.length / itemsPerRow);
            const totalHeight = totalRows * (itemHeight + responsiveGap) - responsiveGap;
            return { totalHeight, isGrouped: false, results };
        }

        // Grouped layout - calculate positions for groups and items
        let currentY = 0;
        const headerHeight = 50; // Height for group headers
        const groupGap = 20; // Gap between groups

        const layoutGroups = groupedData.groups.map(group => {
            const groupStartY = currentY;
            currentY += headerHeight; // Header height

            // Calculate grid for items in this group
            const groupRows = Math.ceil(group.items.length / itemsPerRow);
            const groupItemsHeight = groupRows * (itemHeight + responsiveGap) - responsiveGap;

            const groupData = {
                groupKey: group.groupKey,
                itemCount: group.itemCount,
                headerY: groupStartY,
                itemsStartY: currentY,
                items: group.items,
                height: headerHeight + groupItemsHeight,
            };

            currentY += groupItemsHeight + groupGap;
            return groupData;
        });

        return {
            totalHeight: currentY - groupGap,
            isGrouped: true,
            groups: layoutGroups,
        };
    }, [groupedData, itemsPerRow, itemHeight, responsiveGap, results]);

    // Calculate visible items based on scroll position
    const visibleData = useMemo(() => {
        if (!layoutData.isGrouped) {
            // Standard non-grouped virtualization
            const totalRows = Math.ceil(results.length / itemsPerRow);
            const rowHeight = itemHeight + responsiveGap;
            const visibleStartRow = Math.floor(scrollTop / rowHeight);
            const visibleEndRow = Math.min(
                totalRows,
                Math.ceil((scrollTop + containerSize.height) / rowHeight)
            );

            const startIndex = Math.max(0, (visibleStartRow - 3) * itemsPerRow);
            const endIndex = Math.min(results.length, (visibleEndRow + 3) * itemsPerRow);

            const visibleItems = [];
            for (let i = startIndex; i < endIndex; i++) {
                if (results[i]) {
                    visibleItems.push({
                        type: 'item',
                        index: i,
                        result: results[i],
                        y: Math.floor(i / itemsPerRow) * (itemHeight + responsiveGap),
                        x: (i % itemsPerRow) * (itemWidth + responsiveGap),
                    });
                }
            }
            return { visibleItems };
        }

        // Grouped virtualization
        const visibleContent = [];
        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + containerSize.height;

        layoutData.groups.forEach(group => {
            const groupBottom = group.headerY + group.height;

            // Check if group is in viewport
            if (groupBottom < viewportTop || group.headerY > viewportBottom) return;

            // Add group header if visible
            if (group.headerY >= viewportTop - 100 && group.headerY <= viewportBottom + 100) {
                visibleContent.push({
                    type: 'header',
                    groupKey: group.groupKey,
                    itemCount: group.itemCount,
                    y: group.headerY,
                });
            }

            // Add visible items from this group
            group.items.forEach((item, itemIndex) => {
                const itemY =
                    group.itemsStartY +
                    Math.floor(itemIndex / itemsPerRow) * (itemHeight + responsiveGap);
                const itemX = (itemIndex % itemsPerRow) * (itemWidth + responsiveGap);
                const itemBottom = itemY + itemHeight;

                if (itemBottom >= viewportTop - 100 && itemY <= viewportBottom + 100) {
                    visibleContent.push({
                        type: 'item',
                        result: item,
                        itemIndex,
                        y: itemY,
                        x: itemX,
                    });
                }
            });
        });

        return { visibleItems: visibleContent };
    }, [
        layoutData,
        scrollTop,
        containerSize.height,
        itemsPerRow,
        itemHeight,
        responsiveGap,
        itemWidth,
        results,
    ]);

    // Render content based on type
    const renderContent = (item, index) => {
        if (item.type === 'header') {
            return (
                <div
                    key={`group-header-${item.groupKey}`}
                    className="owner-label"
                    style={{
                        position: 'absolute',
                        top: item.y,
                        left: 0,
                        width: '100%',
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 20px',
                        zIndex: 10,
                    }}
                >
                    <span className="owner-name">{item.groupKey}</span>
                    <span className="owner-count" style={{ marginLeft: 8 }}>
                        ({item.itemCount} items)
                    </span>
                </div>
            );
        }

        if (item.type === 'item') {
            const obj = item.result.original || item.result;
            const displayTitle = getDisplayTitle
                ? getDisplayTitle(item.result)
                : item.result.title || obj.title || 'Untitled';
            const imageUrl = getImageUrl ? getImageUrl(item.result) : '';
            const isFocused = focusedResultIndex === (item.index || index);

            return (
                <div
                    key={getResultKey ? getResultKey(item.result, index) : `grid-item-${index}`}
                    className={`search-grid-item ${isFocused ? 'keyboard-focused' : ''}`}
                    style={{
                        position: 'absolute',
                        top: item.y,
                        left: item.x,
                        width: itemWidth,
                        height: itemHeight,
                    }}
                    data-location={encodeURIComponent(obj.location || '')}
                    data-file={encodeURIComponent(obj.file || '')}
                    tabIndex={0}
                    title={displayTitle}
                    onClick={() => onResultClick(item.result)}
                    role="button"
                    aria-label={`Open ${displayTitle}`}
                    aria-describedby={`result-${index}-meta`}
                >
                    <div className="search-grid-item-image">
                        {imageUrl && (
                            <LazyImage
                                src={imageUrl}
                                alt={displayTitle}
                                className="search-grid-item-poster"
                                fallbackSrc="/placeholder-poster.jpg"
                            />
                        )}
                        {renderMetadata && (
                            <div id={`result-${index}-meta`} className="search-grid-item-metadata">
                                {renderMetadata(item.result)}
                            </div>
                        )}
                    </div>

                    <div className="search-grid-item-details">
                        <div
                            className="search-grid-item-title"
                            dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm
                                    ? highlightSearchTerm(displayTitle, searchTerm)
                                    : displayTitle,
                            }}
                        />
                    </div>
                </div>
            );
        }

        return null;
    };

    if (!results.length) return null;

    // Unified CSS classes (virtualization is transparent)
    let containerClasses = className;
    if (layoutData.isGrouped) containerClasses += ' search-results-grouped';

    return (
        <div className={containerClasses} ref={resultsContainerRef}>
            {/* Always use unified virtualized display - works for both grouped and non-grouped */}
            <div
                ref={containerRef}
                className="search-grid"
                style={{
                    height: 'calc(100vh - 220px)', // Dynamic height based on viewport minus header/controls
                    overflow: 'auto',
                    position: 'relative',
                }}
                onScroll={handleScroll}
            >
                <div style={{ height: layoutData.totalHeight, position: 'relative' }}>
                    {visibleData.visibleItems.map((item, index) => renderContent(item, index))}
                </div>
            </div>
        </div>
    );
}
