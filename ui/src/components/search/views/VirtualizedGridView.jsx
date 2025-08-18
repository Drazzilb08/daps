// ui/src/components/search/views/VirtualizedGridView.jsx
// Virtualized grid view for large datasets - only renders visible items

import React, { useEffect, useRef, useState, useCallback } from 'react';
import LazyImage from '../../common/LazyImage';

// Configuration
const ITEM_HEIGHT = 320; // Height of each grid item in pixels
const ITEM_WIDTH = 160; // Width of each grid item in pixels
const GAP = 16; // Gap between items
const OVERSCAN = 3; // Number of items to render outside visible area

export default function VirtualizedGridView({
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
    enableVirtualization = true,
    virtualizationThreshold = 100, // Enable virtualization for 100+ items
}) {
    const scrollContainerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [scrollTop, setScrollTop] = useState(0);

    // Use virtualization only for large datasets
    const shouldVirtualize = enableVirtualization && results.length >= virtualizationThreshold;

    // Calculate grid dimensions
    const calculateGridDimensions = useCallback(containerWidth => {
        if (containerWidth === 0) return { columns: 0, itemsPerRow: 0 };

        const availableWidth = containerWidth - GAP * 2; // Account for container padding
        const columnsCount = Math.floor((availableWidth + GAP) / (ITEM_WIDTH + GAP));
        return {
            columns: Math.max(1, columnsCount),
            itemsPerRow: Math.max(1, columnsCount),
        };
    }, []);

    // Update container size on resize
    useEffect(() => {
        if (!shouldVirtualize) return;

        const updateSize = () => {
            if (scrollContainerRef.current) {
                const rect = scrollContainerRef.current.getBoundingClientRect();
                setContainerSize({
                    width: rect.width,
                    height: rect.height,
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);

        return () => window.removeEventListener('resize', updateSize);
    }, [shouldVirtualize]);

    // Handle scroll events
    const handleScroll = useCallback(e => {
        setScrollTop(e.target.scrollTop);
    }, []);

    // Calculate visible items for virtualization
    const getVisibleItems = useCallback(() => {
        if (!shouldVirtualize) {
            return {
                startIndex: 0,
                endIndex: results.length,
                visibleItems: results.map((result, index) => ({ result, index })),
            };
        }

        const { itemsPerRow } = calculateGridDimensions(containerSize.width);
        if (itemsPerRow === 0) return { startIndex: 0, endIndex: 0, visibleItems: [] };

        const totalRows = Math.ceil(results.length / itemsPerRow);
        const visibleStartRow = Math.floor(scrollTop / (ITEM_HEIGHT + GAP));
        const visibleEndRow = Math.min(
            totalRows,
            Math.ceil((scrollTop + containerSize.height) / (ITEM_HEIGHT + GAP))
        );

        // Add overscan
        const startRow = Math.max(0, visibleStartRow - OVERSCAN);
        const endRow = Math.min(totalRows, visibleEndRow + OVERSCAN);

        const startIndex = startRow * itemsPerRow;
        const endIndex = Math.min(results.length, endRow * itemsPerRow);

        const visibleItems = [];
        for (let i = startIndex; i < endIndex; i++) {
            if (results[i]) {
                visibleItems.push({ result: results[i], index: i });
            }
        }

        return { startIndex, endIndex, visibleItems };
    }, [shouldVirtualize, results, containerSize, scrollTop, calculateGridDimensions]);

    // Render individual grid item
    const renderGridItem = useCallback(
        ({ result, index }) => {
            const obj = result.original || result;
            const displayTitle = getDisplayTitle(result);
            const imageUrl = getImageUrl(result);
            const isFocused = focusedResultIndex === index;

            const { itemsPerRow } = calculateGridDimensions(containerSize.width);
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;

            // Position the item absolutely for virtualization
            const style = shouldVirtualize
                ? {
                      position: 'absolute',
                      top: row * (ITEM_HEIGHT + GAP) + GAP,
                      left: col * (ITEM_WIDTH + GAP) + GAP,
                      width: ITEM_WIDTH,
                      height: ITEM_HEIGHT,
                  }
                : {};

            return (
                <div
                    key={getResultKey(result, index)}
                    className={`search-grid-item ${isFocused ? 'keyboard-focused' : ''}`}
                    style={style}
                    data-location={encodeURIComponent(obj.location || '')}
                    data-file={encodeURIComponent(obj.file || '')}
                    tabIndex={0}
                    title={displayTitle}
                    onClick={() => onResultClick(result)}
                    role="button"
                    aria-label={`Open ${displayTitle}`}
                    aria-describedby={`result-${index}-meta`}
                >
                    {imageUrl && (
                        <LazyImage
                            src={imageUrl}
                            alt={displayTitle}
                            className="poster-image"
                            loading="lazy"
                        />
                    )}

                    <span
                        className="poster-file-label"
                        dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm
                                ? highlightSearchTerm(displayTitle, searchTerm)
                                : displayTitle,
                        }}
                    />

                    {renderMetadata && (
                        <div id={`result-${index}-meta`}>{renderMetadata(result)}</div>
                    )}
                </div>
            );
        },
        [
            getDisplayTitle,
            getImageUrl,
            getResultKey,
            focusedResultIndex,
            onResultClick,
            highlightSearchTerm,
            searchTerm,
            renderMetadata,
            shouldVirtualize,
            containerSize,
            calculateGridDimensions,
        ]
    );

    // Non-virtualized rendering (for small datasets)
    if (!shouldVirtualize) {
        return (
            <div className={className} id="search-results" ref={resultsContainerRef}>
                <div className="search-grid">
                    {results.map((result, index) => renderGridItem({ result, index }))}
                </div>
            </div>
        );
    }

    // Virtualized rendering (for large datasets)
    const { visibleItems } = getVisibleItems();
    const { itemsPerRow } = calculateGridDimensions(containerSize.width);
    const totalRows = Math.ceil(results.length / itemsPerRow);
    const totalHeight = totalRows * (ITEM_HEIGHT + GAP) + GAP;

    return (
        <div className={className} id="search-results" ref={resultsContainerRef}>
            <div
                ref={scrollContainerRef}
                className="search-grid-virtualized-container"
                style={{
                    height: Math.min(600, containerSize.height || 600), // Max height of 600px
                    overflow: 'auto',
                    position: 'relative',
                }}
                onScroll={handleScroll}
            >
                <div
                    className="search-grid-virtualized-content"
                    style={{
                        height: totalHeight,
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    {visibleItems.map(({ result, index }) => renderGridItem({ result, index }))}
                </div>
            </div>
        </div>
    );
}
