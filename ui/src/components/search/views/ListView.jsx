// ui/src/components/search/views/ListView.jsx
// List View with @tanstack/react-virtual - used by all search types

import React, { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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
    // Container ref for @tanstack/react-virtual
    const containerRef = useRef(null);
    const isGrouped = groupBy !== null;

    // Performance: Use static values to avoid getComputedStyle() on every render
    const itemHeight = 56; // Table row height
    const headerHeight = 40; // Group header height

    // Prepare data for virtualization
    const virtualData = useMemo(() => {
        if (!groupBy) {
            return results.map((item, index) => ({ type: 'item', item, index }));
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

        // Convert to flat array with headers and items
        const flatData = [];
        Object.entries(groups).forEach(([groupKey, items]) => {
            flatData.push({ type: 'header', groupKey, itemCount: items.length });
            items.forEach((item, index) => {
                flatData.push({ type: 'item', item, index, groupKey });
            });
        });

        return flatData;
    }, [results, groupBy]);

    // Use @tanstack/react-virtual for virtualization
    const virtualizer = useVirtualizer({
        count: virtualData.length,
        getScrollElement: () => containerRef.current,
        estimateSize: useCallback(
            index => {
                const item = virtualData[index];
                return item?.type === 'header' ? headerHeight : itemHeight;
            },
            [virtualData, headerHeight, itemHeight]
        ),
        overscan: 5,
    });

    // Render individual virtual item
    const renderVirtualItem = useCallback(
        virtualItem => {
            const dataItem = virtualData[virtualItem.index];

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

            if (dataItem.type === 'item') {
                const obj = dataItem.item.original || dataItem.item;
                const displayTitle = dataItem.item.title || obj.title || 'Untitled';
                const year = dataItem.item.year || obj.year || '';
                const type = dataItem.item.mediaType || dataItem.item.type || obj.asset_type || '';
                const instanceCount = dataItem.item.instanceCount || 1;
                const instances = dataItem.item.instances || [
                    dataItem.item.instance_name || 'Unknown',
                ];
                const isFocused = focusedResultIndex === dataItem.index;

                return (
                    <div
                        key={
                            getResultKey
                                ? getResultKey(dataItem.item, dataItem.index)
                                : `list-item-${dataItem.index}`
                        }
                        className={`search-list-row ${isFocused ? 'keyboard-focused' : ''}`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: virtualItem.size,
                            transform: `translateY(${virtualItem.start}px)`,
                        }}
                        data-location={encodeURIComponent(obj.location || '')}
                        data-file={encodeURIComponent(obj.file || '')}
                        tabIndex={0}
                        title={`${displayTitle} (${year})`}
                        onClick={() => onResultClick(dataItem.item)}
                        role="button"
                        aria-label={`Open ${displayTitle}`}
                        aria-describedby={`result-${dataItem.index}-meta`}
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
                                {instanceCount > 1
                                    ? `${instanceCount} instances`
                                    : instances.join(', ')}
                            </span>
                            {renderMetadata && (
                                <div
                                    id={`result-${dataItem.index}-meta`}
                                    className="search-list-item-metadata"
                                >
                                    {renderMetadata(dataItem.item)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            return null;
        },
        [
            virtualData,
            focusedResultIndex,
            getResultKey,
            highlightSearchTerm,
            searchTerm,
            renderMetadata,
            onResultClick,
        ]
    );

    if (!results.length) return null;

    // Unified CSS classes (virtualization is transparent)
    let containerClasses = className;
    if (isGrouped) containerClasses += ' search-results-grouped';

    return (
        <div className={containerClasses} ref={resultsContainerRef}>
            {/* Table header (only show for non-grouped view) */}
            {!isGrouped && (
                <div className="search-list-header">
                    <div className="search-list-col-title">Title</div>
                    <div className="search-list-col-year">Year</div>
                    <div className="search-list-col-type">Type</div>
                    <div className="search-list-col-instances">Instances</div>
                </div>
            )}

            {/* List container with @tanstack/react-virtual */}
            <div
                ref={containerRef}
                className="search-list-body"
                style={{
                    height: '100vh', // Height constraint for proper virtualization
                    overflow: 'auto',
                    position: 'relative',
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
