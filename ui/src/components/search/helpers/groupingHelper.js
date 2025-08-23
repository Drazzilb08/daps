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
            const fileData = fileObj.original || fileObj;
            const location = fileData.location || 'Unknown';
            if (!groups[location]) groups[location] = [];
            groups[location].push(fileObj);
        });
        return groups;
    },

    /**
     * Group files by owner (for GDrive searches)
     */
    groupByOwner(files) {
        const groups = {};
        files.forEach(fileObj => {
            const fileData = fileObj.original || fileObj;
            const owner = fileData.name || 'Unknown';
            if (!groups[owner]) groups[owner] = [];
            groups[owner].push(fileObj);
        });
        return groups;
    },

    /**
     * Get group label for display
     */
    getGroupLabel(groupFiles, location) {
        return humanize(groupFiles[0]?.name || groupFiles[0]?.original?.name || location);
    },
};
