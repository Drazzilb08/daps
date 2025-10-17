/**
 * Search View Hook
 * Provides shared grouping and virtualization logic for search result views
 * Eliminates duplication between GridView and ListView components
 */

import { useMemo } from 'react';
import { SearchSorter } from '../components/search/sorting';

/**
 * Group search results by owner
 * @param {Array} files - Array of file/result objects
 * @returns {Object} Grouped results by owner
 */
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

/**
 * Group search results by location
 * @param {Array} files - Array of file/result objects
 * @returns {Object} Grouped results by location
 */
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

/**
 * Search view hook for shared grouping and virtualization logic
 * @param {Object} options - Hook configuration options
 * @param {Array} options.results - Search results array
 * @param {string|null} options.groupBy - Grouping type ('owner', 'location', or null)
 * @param {Object} options.currentSort - Current sort configuration
 * @param {Object} options.priorityOrder - Priority ordering configuration
 * @param {Object} options.ownerPriorityOrder - Owner-specific priority ordering
 * @returns {Object} Processed view data
 */
export function useSearchView({
    results = [],
    groupBy = null,
    currentSort,
    priorityOrder = {},
    ownerPriorityOrder = {},
}) {
    // Handle grouping logic - extracted from both GridView and ListView
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
                ownerPriorityOrder,
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
    }, [results, groupBy, currentSort, priorityOrder, ownerPriorityOrder]);

    // Flatten grouped data for virtualization - extracted from both components
    const flattenedItems = useMemo(() => {
        if (!groupBy || !processedGroups || !processedGroupOrder?.length) {
            // Non-grouped: convert results to flat array of items
            return results.map((result, index) => ({
                type: 'item',
                data: result,
                originalIndex: index,
            }));
        }

        // Grouped: flatten into alternating headers and items
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

    return {
        processedGroups,
        processedGroupOrder,
        flattenedItems,
    };
}
