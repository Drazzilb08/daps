// ui/src/components/search/views/GridView.jsx
// Grid View with @tanstack/react-virtual - used by all search types

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import LazyImage from '../../common/LazyImage';
import { useSearchJumpBar } from '../SearchJumpBarProvider';

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
    // Container ref for @tanstack/react-virtual
    const containerRef = useRef(null);

    // Jump bar context for page-level communication
    const { updateJumpBarData } = useSearchJumpBar();

    // CSS-First Configuration: Grid dimensions
    const baseItemWidth = 160;
    const itemHeight = 320;
    const gap = 19.2; // 1.2em ≈ 19.2px

    // State for container dimensions
    const [containerWidth, setContainerWidth] = useState(0);

    // Calculate grid layout for responsive design
    const gridLayout = useMemo(() => {
        if (containerWidth <= 0) {
            // Default layout for initial render
            return { itemsPerRow: 4, itemWidth: baseItemWidth, responsiveGap: gap };
        }

        // Responsive gap and minimum width based on screen size
        const isMobile = containerWidth <= 768;
        const currentGap = isMobile ? 12.8 : gap; // 0.8em vs 1.2em
        const minWidth = isMobile ? 100 : 140;

        // Calculate how many items fit with base width
        const itemsPerRow = Math.max(1, Math.floor(containerWidth / (minWidth + currentGap)));

        // Calculate actual item width to fill container completely (edge-to-edge)
        const actualItemWidth = (containerWidth - (itemsPerRow - 1) * currentGap) / itemsPerRow;

        return {
            itemsPerRow,
            itemWidth: Math.max(minWidth, actualItemWidth),
            responsiveGap: currentGap,
        };
    }, [containerWidth, baseItemWidth, gap]);

    // Update container width on resize - with proper timing
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                // Use requestAnimationFrame to ensure layout is complete
                requestAnimationFrame(() => {
                    if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setContainerWidth(rect.width);
                    }
                });
            }
        };

        // Delay initial measurement to ensure CSS layout is complete
        const timeoutId = setTimeout(updateSize, 100);

        // Listen for resize events
        window.addEventListener('resize', updateSize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    // Prepare data for virtualization (convert to rows for grid layout)
    const virtualData = useMemo(() => {
        const { itemsPerRow } = gridLayout;

        if (!groupBy) {
            // Convert items to rows for grid virtualization
            const rows = [];
            for (let i = 0; i < results.length; i += itemsPerRow) {
                const rowItems = results.slice(i, i + itemsPerRow);
                rows.push({ type: 'row', items: rowItems, startIndex: i });
            }
            return rows;
        }

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

        // Convert to flat array with headers and item rows
        const flatData = [];
        Object.entries(groups).forEach(([groupKey, items]) => {
            flatData.push({ type: 'header', groupKey, itemCount: items.length });

            // Convert group items to rows
            for (let i = 0; i < items.length; i += itemsPerRow) {
                const rowItems = items.slice(i, i + itemsPerRow);
                flatData.push({ type: 'row', items: rowItems, startIndex: i, groupKey });
            }
        });

        return flatData;
    }, [results, groupBy, gridLayout]);

    // Fixed height container for proper virtualization
    const containerHeight = useMemo(() => {
        if (!virtualData.length) return 400; // Reasonable default for empty state

        // Fixed height enables virtualization by creating a scrollable viewport
        // This is essential for @tanstack/react-virtual to work correctly
        return '100vh'; // Match ListView.jsx pattern - consistent height for scrolling
    }, [virtualData]);

    // Use @tanstack/react-virtual for virtualization
    const virtualizer = useVirtualizer({
        count: virtualData.length,
        getScrollElement: () => containerRef.current,
        estimateSize: useCallback(
            index => {
                const item = virtualData[index];
                if (item?.type === 'header') {
                    return 50; // Header height
                }
                // For grid rows, return row height
                return itemHeight + gap;
            },
            [virtualData, itemHeight, gap]
        ),
        overscan: 3, // Reduced overscan for better space utilization
    });

    // Performance monitoring - ensure virtualization is working
    useEffect(() => {
        if (import.meta.env.DEV) {
            const virtualItems = virtualizer.getVirtualItems();
            const totalItems = virtualData.length;
            const renderedItems = virtualItems.length;

            if (totalItems > 100 && renderedItems > totalItems * 0.5) {
                console.warn(
                    `GridView Performance Warning: Rendering ${renderedItems}/${totalItems} items. ` +
                        `Expected ~30-50 items for proper virtualization. Check container height and overflow settings.`
                );
            } else if (totalItems > 20) {
                console.log(
                    `GridView Virtualization OK: Rendering ${renderedItems}/${totalItems} items`
                );
            }
        }
    }, [virtualizer, virtualData.length]);

    // Jump bar navigation handler for page-level jump bar
    const handleJumpToLetter = useCallback(
        letter => {
            if (!containerRef.current || !virtualData.length) return;

            let targetIndex = -1;
            for (let i = 0; i < virtualData.length; i++) {
                const dataItem = virtualData[i];
                if (dataItem.type === 'header') {
                    const firstChar = dataItem.groupKey.trim().charAt(0).toUpperCase();
                    if ((letter === '#' && /[0-9]/.test(firstChar)) || firstChar === letter) {
                        targetIndex = i;
                        break;
                    }
                } else if (dataItem.type === 'row') {
                    // Check first item in row
                    const firstItem = dataItem.items[0];
                    if (firstItem) {
                        const title = getDisplayTitle
                            ? getDisplayTitle(firstItem)
                            : firstItem.title ||
                              firstItem.original?.title ||
                              firstItem.name ||
                              firstItem.original?.name ||
                              'Unknown';

                        const firstChar = title.trim().charAt(0).toUpperCase();
                        if ((letter === '#' && /[0-9]/.test(firstChar)) || firstChar === letter) {
                            targetIndex = i;
                            break;
                        }
                    }
                }
            }

            if (targetIndex >= 0) {
                virtualizer.scrollToIndex(targetIndex, { behavior: 'smooth' });
            }
        },
        [virtualData, getDisplayTitle, virtualizer]
    );

    // Register scroll function with jump bar context - prevent circular dependency
    useEffect(() => {
        // Only update if we have valid data and the function has changed
        if (virtualData.length > 0 && handleJumpToLetter) {
            updateJumpBarData({
                scrollToLetter: handleJumpToLetter,
            });
        }
    }, [handleJumpToLetter, updateJumpBarData, virtualData.length]);

    // Render individual virtual item (row or header)
    const renderVirtualItem = useCallback(
        virtualItem => {
            const dataItem = virtualData[virtualItem.index];
            const { itemWidth, responsiveGap, itemsPerRow } = gridLayout;

            if (dataItem.type === 'header') {
                return (
                    <div
                        key={`group-header-${dataItem.groupKey}`}
                        className="owner-label"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: virtualItem.size,
                            transform: `translateY(${virtualItem.start}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 20px',
                            zIndex: 10,
                        }}
                    >
                        <span className="owner-name">{dataItem.groupKey}</span>
                        <span className="owner-count" style={{ marginLeft: 8 }}>
                            ({dataItem.itemCount} items)
                        </span>
                    </div>
                );
            }

            if (dataItem.type === 'row') {
                return (
                    <div
                        key={`grid-row-${virtualItem.index}`}
                        className="search-grid-row"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: virtualItem.size,
                            transform: `translateY(${virtualItem.start}px)`,
                            display: 'grid',
                            gridTemplateColumns: `repeat(${itemsPerRow}, ${itemWidth}px)`,
                            gap: `${responsiveGap}px`,
                            justifyContent: 'start',
                        }}
                    >
                        {dataItem.items.map((item, colIndex) => {
                            const obj = item.original || item;
                            const displayTitle = getDisplayTitle
                                ? getDisplayTitle(item)
                                : item.title || obj.title || 'Untitled';
                            const imageUrl = getImageUrl ? getImageUrl(item) : '';
                            const actualIndex = dataItem.startIndex + colIndex;
                            const isFocused = focusedResultIndex === actualIndex;

                            return (
                                <div
                                    key={
                                        getResultKey
                                            ? getResultKey(item, actualIndex)
                                            : `grid-item-${actualIndex}`
                                    }
                                    className={`search-grid-item ${isFocused ? 'keyboard-focused' : ''}`}
                                    style={{
                                        width: `${itemWidth}px`,
                                        height: `${itemHeight}px`,
                                    }}
                                    data-location={encodeURIComponent(obj.location || '')}
                                    data-file={encodeURIComponent(obj.file || '')}
                                    tabIndex={0}
                                    title={displayTitle}
                                    onClick={() => onResultClick(item)}
                                    role="button"
                                    aria-label={`Open ${displayTitle}`}
                                    aria-describedby={`result-${actualIndex}-meta`}
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
                                            <div
                                                id={`result-${actualIndex}-meta`}
                                                className="search-grid-item-metadata"
                                            >
                                                {renderMetadata(item)}
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
                        })}
                    </div>
                );
            }

            return null;
        },
        [
            virtualData,
            gridLayout,
            itemHeight,
            getDisplayTitle,
            getImageUrl,
            highlightSearchTerm,
            searchTerm,
            renderMetadata,
            onResultClick,
            getResultKey,
            focusedResultIndex,
        ]
    );

    if (!results.length) return null;

    // Unified CSS classes (virtualization is transparent)
    let containerClasses = className;
    if (groupBy) containerClasses += ' search-results-grouped';

    return (
        <div className={containerClasses} ref={resultsContainerRef}>
            {/* Grid container with @tanstack/react-virtual */}
            <div
                ref={containerRef}
                className="search-grid"
                style={{
                    height: containerHeight, // Fixed height for proper virtualization
                    minHeight: containerHeight, // Consistent minimum height
                    overflow: 'auto', // Enable scrolling - essential for virtualization
                    position: 'relative',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-2)',
                }}
            >
                {/* Virtual content wrapper */}
                <div
                    style={{
                        height: virtualizer.getTotalSize(),
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    {virtualizer.getVirtualItems().map(renderVirtualItem)}
                </div>
            </div>
        </div>
    );
}
