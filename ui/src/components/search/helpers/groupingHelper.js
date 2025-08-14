// ui/src/components/search/helpers/groupingHelper.js
// Helper functions for grouping search results

import { humanize } from '../../../utils/tools';

export const groupingHelper = {
    /**
     * Group files by location (for GDrive searches)
     */
    groupByLocation(files) {
        const groups = {};
        files.forEach(fileObj => {
            const obj = fileObj.original || fileObj;
            const location = obj.location || 'Unknown';
            if (!groups[location]) groups[location] = [];
            groups[location].push(fileObj);
        });
        return groups;
    },

    /**
     * Get group order based on sorting and priority
     */
    getGroupOrder(groups, currentSort, priorityOrder = {}) {
        let groupOrder = Object.keys(groups);

        if (currentSort === 'priority-asc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? 9999;
                const pb = priorityOrder[b] ?? 9999;
                return pa - pb;
            });
        } else if (currentSort === 'priority-desc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? -1;
                const pb = priorityOrder[b] ?? -1;
                return pb - pa;
            });
        } else if (currentSort === 'alpha') {
            groupOrder = groupOrder.sort((a, b) => a.localeCompare(b));
        } else if (currentSort === 'alpha-desc') {
            groupOrder = groupOrder.sort((a, b) => b.localeCompare(a));
        }

        return groupOrder;
    },

    /**
     * Get group label for display
     */
    getGroupLabel(groupFiles, location) {
        return humanize(groupFiles[0]?.name || groupFiles[0]?.original?.name || location);
    },

    /**
     * Sort files within a group
     */
    sortFilesInGroup(files, getDisplayTitle) {
        return files.sort((a, b) => getDisplayTitle(a).localeCompare(getDisplayTitle(b)));
    },
};
