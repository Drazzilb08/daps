// ui/src/components/search/views/VirtualizedListView.jsx
// Virtualized list view for large datasets - only renders visible items

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Configuration
const ITEM_HEIGHT = 60; // Height of each list item in pixels
const OVERSCAN = 5; // Number of items to render outside visible area

export default function VirtualizedListView({
    results = [],
    searchTerm = '',
    onResultClick,
    getResultKey,
    getDisplayTitle,
    highlightSearchTerm,
    setupHoverPreview = () => ({}),
    hoverPreviewImgRef,
    enableHoverPreview,
    renderMetadata = () => null,
    className = 'search-results',
    focusedResultIndex = -1,
    resultsContainerRef,
    enableVirtualization = true,
    virtualizationThreshold = 100, // Enable virtualization for 100+ items
}) {
    const scrollContainerRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(600);
    const [scrollTop, setScrollTop] = useState(0);

    // Use virtualization only for large datasets
    const shouldVirtualize = enableVirtualization && results.length >= virtualizationThreshold;

    // Update container height on resize
    useEffect(() => {
        if (!shouldVirtualize) return;

        const updateHeight = () => {
            if (scrollContainerRef.current) {
                const rect = scrollContainerRef.current.getBoundingClientRect();
                setContainerHeight(rect.height);
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => window.removeEventListener('resize', updateHeight);
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

        const visibleStart = Math.floor(scrollTop / ITEM_HEIGHT);
        const visibleEnd = Math.min(
            results.length,
            Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT)
        );

        // Add overscan
        const startIndex = Math.max(0, visibleStart - OVERSCAN);
        const endIndex = Math.min(results.length, visibleEnd + OVERSCAN);

        const visibleItems = [];
        for (let i = startIndex; i < endIndex; i++) {
            if (results[i]) {
                visibleItems.push({ result: results[i], index: i });
            }
        }

        return { startIndex, endIndex, visibleItems };
    }, [shouldVirtualize, results, containerHeight, scrollTop]);

    // Render individual list item
    const renderListItem = useCallback(
        ({ result, index }) => {
            const obj = result.original || result;
            const displayTitle = getDisplayTitle(result);
            const hoverProps = setupHoverPreview(result, hoverPreviewImgRef, enableHoverPreview);
            const isFocused = focusedResultIndex === index;

            // Position the item absolutely for virtualization
            const style = shouldVirtualize
                ? {
                      position: 'absolute',
                      top: index * ITEM_HEIGHT,
                      left: 0,
                      right: 0,
                      height: ITEM_HEIGHT,
                  }
                : {};

            return (
                <div
                    key={getResultKey(result, index)}
                    className={`search-list-item ${isFocused ? 'keyboard-focused' : ''}`}
                    style={style}
                    data-location={encodeURIComponent(obj.location || '')}
                    data-file={encodeURIComponent(obj.file || '')}
                    tabIndex={0}
                    title={displayTitle}
                    onClick={() => onResultClick(result)}
                    role="button"
                    aria-label={`Open ${displayTitle}`}
                    aria-describedby={`result-${index}-meta`}
                    {...hoverProps}
                >
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
            getResultKey,
            setupHoverPreview,
            hoverPreviewImgRef,
            enableHoverPreview,
            focusedResultIndex,
            onResultClick,
            highlightSearchTerm,
            searchTerm,
            renderMetadata,
            shouldVirtualize,
        ]
    );

    // Non-virtualized rendering (for small datasets)
    if (!shouldVirtualize) {
        return (
            <div className={className} id="search-results" ref={resultsContainerRef}>
                {results.map((result, index) => renderListItem({ result, index }))}
            </div>
        );
    }

    // Virtualized rendering (for large datasets)
    const { visibleItems } = getVisibleItems();
    const totalHeight = results.length * ITEM_HEIGHT;

    return (
        <div className={className} id="search-results" ref={resultsContainerRef}>
            <div
                ref={scrollContainerRef}
                className="search-list-virtualized-container"
                style={{
                    height: Math.min(600, containerHeight || 600), // Max height of 600px
                    overflow: 'auto',
                    position: 'relative',
                }}
                onScroll={handleScroll}
            >
                <div
                    className="search-list-virtualized-content"
                    style={{
                        height: totalHeight,
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    {visibleItems.map(({ result, index }) => renderListItem({ result, index }))}
                </div>
            </div>
        </div>
    );
}
