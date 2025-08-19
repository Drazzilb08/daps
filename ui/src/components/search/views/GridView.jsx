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
    const isGrouped = groupBy !== null;

    // Performance: Use static values to avoid getComputedStyle() on every render
    const itemWidth = 160;
    const itemHeight = 320;
    const gap = 19.2; // 1.2em ≈ 19.2px

    // Calculate items per row using CSS values
    const itemsPerRow =
        containerSize.width > 0
            ? Math.max(1, Math.floor(containerSize.width / (itemWidth + gap)))
            : 1;

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

    // Calculate visible items (always virtualized for consistent performance)
    const visibleData = useMemo(() => {
        const totalRows = Math.ceil(results.length / itemsPerRow);
        const rowHeight = itemHeight + gap;
        const visibleStartRow = Math.floor(scrollTop / rowHeight);
        const visibleEndRow = Math.min(
            totalRows,
            Math.ceil((scrollTop + containerSize.height) / rowHeight)
        );

        const startIndex = Math.max(0, (visibleStartRow - 3) * itemsPerRow); // 3 row overscan
        const endIndex = Math.min(results.length, (visibleEndRow + 3) * itemsPerRow);

        const visibleItems = [];
        for (let i = startIndex; i < endIndex; i++) {
            if (results[i]) {
                visibleItems.push({ index: i, result: results[i] });
            }
        }

        return { visibleItems };
    }, [results, scrollTop, containerSize.height, itemsPerRow, itemHeight, gap]);

    // Total height for virtual scrolling using CSS values
    const totalHeight = Math.ceil(results.length / itemsPerRow) * (itemHeight + gap) - gap;

    // Group results if needed
    const groupedResults = useMemo(() => {
        if (!groupBy) return { ungrouped: results };

        const groups = {};
        results.forEach(item => {
            const groupKey = item[groupBy] || item.original?.[groupBy] || 'Unknown';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
        });
        return groups;
    }, [results, groupBy]);

    // Render a single grid item
    const renderGridItem = ({ result, index }) => {
        const obj = result.original || result;
        const displayTitle = getDisplayTitle
            ? getDisplayTitle(result)
            : result.title || obj.title || 'Untitled';
        const imageUrl = getImageUrl ? getImageUrl(result) : '';
        const isFocused = focusedResultIndex === index;

        // Always virtualized - position using CSS values for perfect responsive behavior
        const style = {
            position: 'absolute',
            top: Math.floor(index / itemsPerRow) * (itemHeight + gap),
            left: (index % itemsPerRow) * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight,
        };

        return (
            <div
                key={getResultKey ? getResultKey(result, index) : `grid-item-${index}`}
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
                <div className="search-grid-item-image">
                    {imageUrl && (
                        <LazyImage
                            src={imageUrl}
                            alt={displayTitle}
                            className="search-grid-item-poster"
                            fallbackSrc="/placeholder-poster.jpg"
                        />
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
                    {renderMetadata && (
                        <div id={`result-${index}-meta`} className="search-grid-item-metadata">
                            {renderMetadata(result)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render group header
    const renderGroupHeader = (groupKey, itemCount) => (
        <div className="owner-label">
            <span className="owner-name">{groupKey}</span>
            <span className="owner-count">({itemCount} items)</span>
        </div>
    );

    // Render group of items (always virtualized)
    const renderGroup = groupItems => {
        return (
            <div
                className="search-grid"
                style={{
                    height: '50vh', // Height constraint for virtualization
                    overflow: 'auto',
                    position: 'relative',
                }}
                onScroll={handleScroll}
            >
                <div style={{ height: totalHeight, position: 'relative' }}>
                    {visibleData.visibleItems
                        .filter(({ result }) => groupItems.includes(result))
                        .map(renderGridItem)}
                </div>
            </div>
        );
    };

    if (!results.length) return null;

    // Unified CSS classes (virtualization is transparent)
    let containerClasses = className;
    if (isGrouped) containerClasses += ' search-results-grouped';

    return (
        <div className={containerClasses} ref={resultsContainerRef}>
            {isGrouped ? (
                // Grouped display
                Object.entries(groupedResults).map(([groupKey, groupItems]) => (
                    <div key={groupKey} className="owner-group">
                        {renderGroupHeader(groupKey, groupItems.length)}
                        {renderGroup(groupItems)}
                    </div>
                ))
            ) : (
                // Always virtualized unified display
                <div
                    ref={containerRef}
                    className="search-grid"
                    style={{
                        height: '70vh', // Restore height constraint for proper virtualization
                        overflow: 'auto',
                        position: 'relative',
                    }}
                    onScroll={handleScroll}
                >
                    <div style={{ height: totalHeight, position: 'relative' }}>
                        {visibleData.visibleItems.map(renderGridItem)}
                    </div>
                </div>
            )}
        </div>
    );
}
