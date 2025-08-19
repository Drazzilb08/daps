// ui/src/components/search/views/ListView.jsx
// List View with hybrid virtualization - used by all search types

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// CSS-First Configuration: All values read from CSS custom properties
// No hardcoded values - CSS is the single source of truth

export default function ListView({
    results = [],
    searchTerm = '',
    onResultClick,
    getResultKey,
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
    const itemHeight = 56; // Table row height

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
        const visibleStart = Math.floor(scrollTop / itemHeight);
        const visibleEnd = Math.min(
            results.length,
            Math.ceil((scrollTop + containerSize.height) / itemHeight)
        );

        const startIndex = Math.max(0, visibleStart - 3); // 3 item overscan
        const endIndex = Math.min(results.length, visibleEnd + 3);

        const visibleItems = [];
        for (let i = startIndex; i < endIndex; i++) {
            if (results[i]) {
                visibleItems.push({ index: i, result: results[i] });
            }
        }

        return { visibleItems };
    }, [results, scrollTop, containerSize.height, itemHeight]);

    // Total height for virtual scrolling
    const totalHeight = results.length * itemHeight;

    // Group results if needed
    const groupedResults = useMemo(() => {
        if (!groupBy) return { ungrouped: results };

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
        return groups;
    }, [results, groupBy]);

    // Render a single list item (table row)
    const renderListItem = ({ result, index }) => {
        const obj = result.original || result;
        const displayTitle = result.title || obj.title || 'Untitled';
        const year = result.year || obj.year || '';
        const type = result.mediaType || result.type || obj.asset_type || '';
        const instanceCount = result.instanceCount || 1;
        const instances = result.instances || [result.instance_name || 'Unknown'];
        const isFocused = focusedResultIndex === index;

        // Always virtualized - position using static values
        const style = {
            position: 'absolute',
            top: index * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
        };

        return (
            <div
                key={getResultKey ? getResultKey(result, index) : `list-item-${index}`}
                className={`search-list-row ${isFocused ? 'keyboard-focused' : ''}`}
                style={style}
                data-location={encodeURIComponent(obj.location || '')}
                data-file={encodeURIComponent(obj.file || '')}
                tabIndex={0}
                title={`${displayTitle} (${year})`}
                onClick={() => onResultClick(result)}
                role="button"
                aria-label={`Open ${displayTitle}`}
                aria-describedby={`result-${index}-meta`}
            >
                <div className="search-list-col-title">
                    <span
                        className="search-list-title"
                        dangerouslySetInnerHTML={{
                            __html: highlightSearchTerm
                                ? highlightSearchTerm(displayTitle, searchTerm)
                                : displayTitle,
                        }}
                    />
                </div>
                <div className="search-list-col-year">
                    <span className="search-list-year">{year}</span>
                </div>
                <div className="search-list-col-type">
                    <span className="search-list-type">{type}</span>
                </div>
                <div className="search-list-col-instances">
                    <span className="search-list-instances">
                        {instanceCount > 1 ? `${instanceCount} instances` : instances.join(', ')}
                    </span>
                    {renderMetadata && (
                        <div id={`result-${index}-meta`} className="search-list-item-metadata">
                            {renderMetadata(result)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render table header
    const renderTableHeader = () => (
        <div className="search-list-header">
            <div className="search-list-col-title">Title</div>
            <div className="search-list-col-year">Year</div>
            <div className="search-list-col-type">Type</div>
            <div className="search-list-col-instances">Instances</div>
        </div>
    );

    // Render group header
    const renderGroupHeader = (groupKey, itemCount) => (
        <div className="owner-label">
            <span className="owner-name">{groupKey}</span>
            <span className="owner-count">({itemCount} items)</span>
        </div>
    );

    // Render group of items (unified CSS classes for virtualized and non-virtualized)
    const renderGroup = groupItems => {
        return (
            <>
                {renderTableHeader()}
                <div
                    ref={containerRef}
                    className="search-list-body"
                    style={{
                        height: '50vh', // Height constraint for virtualization
                        overflow: 'auto',
                        position: 'relative',
                    }}
                    onScroll={handleScroll}
                >
                    <div
                        style={{
                            height: groupItems.length * itemHeight,
                            position: 'relative',
                        }}
                    >
                        {visibleData.visibleItems
                            .filter(({ result }) => groupItems.includes(result))
                            .map(renderListItem)}
                    </div>
                </div>
            </>
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
                // Unified ungrouped display (virtualized and non-virtualized use same CSS classes)
                <>
                    {renderTableHeader()}
                    <div
                        ref={containerRef}
                        className="search-list-body"
                        style={{
                            height: '70vh', // Height constraint for proper virtualization
                            overflow: 'auto',
                            position: 'relative',
                        }}
                        onScroll={handleScroll}
                    >
                        <div style={{ height: totalHeight, position: 'relative' }}>
                            {visibleData.visibleItems.map(renderListItem)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
