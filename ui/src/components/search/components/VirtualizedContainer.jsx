// ui/src/components/search/components/VirtualizedContainer.jsx
// Common virtualized container component for both GridView and ListView

import React, { memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * VirtualizedContainer - Provides common virtualization wrapper for search views
 * Handles the virtualization logic and container styling consistently
 *
 * @param {Array} items - Array of items to virtualize (flattenedItems or gridRows)
 * @param {Function} estimateSize - Function to calculate item/row height
 * @param {Object} containerRef - Ref to the scroll container
 * @param {Function} renderItem - Function to render each virtual item
 * @param {string} className - CSS class for the container
 * @param {Object} style - Additional inline styles
 * @param {number} overscan - Number of items to render outside viewport (default: 3)
 */
const VirtualizedContainer = memo(
    ({
        items = [],
        estimateSize,
        containerRef,
        renderItem,
        className = '',
        style = {},
        overscan = 3,
    }) => {
        // Virtualization setup
        const virtualizer = useVirtualizer({
            count: items.length,
            getScrollElement: () => containerRef?.current || null,
            estimateSize,
            overscan,
        });

        return (
            <div
                className={className}
                ref={containerRef}
                style={{
                    height: '100%', // Use full height of parent container
                    minHeight: '400px', // Minimum height for proper virtualization
                    overflow: 'auto',
                    ...style,
                }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map(virtualItem => (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            {renderItem(virtualItem, items)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);

VirtualizedContainer.displayName = 'VirtualizedContainer';

export default VirtualizedContainer;
