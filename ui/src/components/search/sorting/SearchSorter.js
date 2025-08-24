// ui/src/components/search/sorting/SearchSorter.js
// Unified sorting component for all search types
// Consolidates sorting logic from adapters, renderers, and helpers

/**
 * Unified SearchSorter class that handles all sorting scenarios
 * Replaces scattered sorting logic across adapters, renderers, and helpers
 */
export class SearchSorter {
    /**
     * Main sorting method - handles all sorting scenarios
     * @param {Array} results - Search results to sort
     * @param {string} sortOption - Sort type ('alpha', 'alpha-desc', 'priority-asc', 'priority-desc', 'date', 'year_asc', 'year_desc', 'recently_added')
     * @param {Object} context - Sorting context data
     * @param {Object} context.priorityOrder - Location-based priorities
     * @param {Object} context.ownerPriorityOrder - Owner-based priorities
     * @param {string} context.groupBy - Grouping mode ('owner', 'location', null)
     * @param {string} context.currentSource - Current data source
     * @param {Function} context.getDisplayTitle - Title extraction function
     * @param {string} context.searchType - Search type ('gdrive', 'media', 'assets')
     * @returns {Array} Sorted results
     */
    static sort(results, sortOption, context = {}) {
        if (!Array.isArray(results) || results.length === 0) {
            return results;
        }

        const {
            priorityOrder = {},
            ownerPriorityOrder = {},
            groupBy = null,
            getDisplayTitle = null,
            searchType = 'generic',
        } = context;

        const sortedResults = [...results];

        switch (sortOption) {
            case 'priority-asc':
                return this._sortByPriority(sortedResults, 'asc', {
                    priorityOrder,
                    ownerPriorityOrder,
                    groupBy,
                });

            case 'priority-desc':
                return this._sortByPriority(sortedResults, 'desc', {
                    priorityOrder,
                    ownerPriorityOrder,
                    groupBy,
                });

            case 'alpha':
                return this._sortAlphabetically(sortedResults, 'asc', {
                    groupBy,
                    getDisplayTitle,
                    searchType,
                });

            case 'alpha-desc':
                return this._sortAlphabetically(sortedResults, 'desc', {
                    groupBy,
                    getDisplayTitle,
                    searchType,
                });

            case 'year_asc':
                return this._sortByYear(sortedResults, 'asc');

            case 'year_desc':
                return this._sortByYear(sortedResults, 'desc');

            case 'recently_added':
                return this._sortByRecentlyAdded(sortedResults);

            case 'date':
                return this._sortByDate(sortedResults, 'desc');

            default:
                console.warn(`SearchSorter: Unknown sort option: ${sortOption}`);
                return sortedResults;
        }
    }

    /**
     * Priority-based sorting (handles both location and owner priorities)
     */
    static _sortByPriority(results, direction, { priorityOrder, ownerPriorityOrder, groupBy }) {
        return results.sort((a, b) => {
            let pa, pb;

            // For owner-based grouping, use owner priority
            if (groupBy === 'owner') {
                // Use -1 for missing entries so they appear LAST, not first
                pa = ownerPriorityOrder[a.name] ?? priorityOrder[a.location] ?? -1;
                pb = ownerPriorityOrder[b.name] ?? priorityOrder[b.location] ?? -1;
            } else {
                // For location-based or no grouping, use location priority
                // Use -1 for missing entries so they appear LAST, not first
                pa = priorityOrder[a.location] ?? -1;
                pb = priorityOrder[b.location] ?? -1;
            }

            if (pa !== pb) {
                // Higher priority values = higher priority (last in source_dirs list)
                // priority-asc means "highest priority first" (larger numbers first)
                return direction === 'asc' ? pb - pa : pa - pb;
            }

            // Same priority - sort alphabetically by appropriate field
            const fieldA = groupBy === 'owner' ? a.name || '' : a.location || '';
            const fieldB = groupBy === 'owner' ? b.name || '' : b.location || '';
            return fieldA.localeCompare(fieldB);
        });
    }

    /**
     * Alphabetical sorting (context-aware based on grouping and search type)
     */
    static _sortAlphabetically(results, direction, { groupBy, getDisplayTitle, searchType }) {
        return results.sort((a, b) => {
            let valueA, valueB;

            if (groupBy === 'owner') {
                // When grouped by owner, sort by owner name
                valueA = a.name || '';
                valueB = b.name || '';
            } else if (searchType === 'media') {
                // Media search - sort by title
                valueA = a.title || '';
                valueB = b.title || '';
            } else if (searchType === 'assets' || searchType === 'gdrive') {
                // Assets/GDrive - sort by file name
                valueA = a.file || '';
                valueB = b.file || '';
            } else if (getDisplayTitle) {
                // Use provided display title function
                valueA = getDisplayTitle(a);
                valueB = getDisplayTitle(b);
            } else {
                // Fallback to title or file
                valueA = a.title || a.file || '';
                valueB = b.title || b.file || '';
            }

            return direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        });
    }

    /**
     * Year-based sorting
     */
    static _sortByYear(results, direction) {
        return results.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return direction === 'asc' ? yearA - yearB : yearB - yearA;
        });
    }

    /**
     * Recently added sorting (media-specific)
     */
    static _sortByRecentlyAdded(results) {
        return results.sort((a, b) => {
            const getLatestCreatedAt = item => {
                if (!item.allInstanceData || item.allInstanceData.length === 0) {
                    return new Date(item.created_at || 0);
                }

                const latestInstance = item.allInstanceData.reduce((latest, instance) => {
                    const instanceDate = new Date(instance.created_at || 0);
                    const latestDate = new Date(latest.created_at || 0);
                    return instanceDate > latestDate ? instance : latest;
                });

                return new Date(latestInstance.created_at || 0);
            };

            const dateA = getLatestCreatedAt(a);
            const dateB = getLatestCreatedAt(b);
            return dateB - dateA; // Most recent first
        });
    }

    /**
     * Generic date sorting
     */
    static _sortByDate(results, direction) {
        return results.sort((a, b) => {
            const getDate = item => {
                return new Date(
                    item.updated_at || item.added_at || item.last_indexed || item.created_at || 0
                );
            };

            const dateA = getDate(a);
            const dateB = getDate(b);
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }

    /**
     * Group-level sorting for grouped displays
     * @param {Object} groups - Groups object with group keys and arrays of items
     * @param {string} sortOption - Sort type
     * @param {Object} context - Sorting context
     * @returns {Array} Ordered array of group keys
     */
    static sortGroups(groups, sortOption, context = {}) {
        const { priorityOrder = {}, ownerPriorityOrder = {}, groupBy = null } = context;

        let groupOrder = Object.keys(groups);

        switch (sortOption) {
            case 'priority-asc':
                groupOrder = groupOrder.sort((a, b) => {
                    // Use appropriate priority mapping based on groupBy
                    const priorityMap = groupBy === 'owner' ? ownerPriorityOrder : priorityOrder;
                    const pa = priorityMap[a] ?? -1; // Use -1 as fallback so unmapped groups appear last
                    const pb = priorityMap[b] ?? -1; // Use -1 as fallback so unmapped groups appear last

                    // Debug logging for priority groups
                    if (
                        a === 'BZ' ||
                        a === 'Drazzilb' ||
                        a === 'Chris DC' ||
                        b === 'BZ' ||
                        b === 'Drazzilb' ||
                        b === 'Chris DC'
                    ) {
                        console.log(
                            `Group sort debug: ${a}(${pa}) vs ${b}(${pb}), groupBy=${groupBy}`
                        );
                        console.log('ownerPriorityOrder:', ownerPriorityOrder);
                    }

                    if (pa !== pb) {
                        return pb - pa; // Higher priority values first: pb - pa makes higher pa values sort earlier
                    }

                    return a.localeCompare(b); // Secondary alphabetical sort
                });
                break;

            case 'priority-desc':
                groupOrder = groupOrder.sort((a, b) => {
                    const priorityMap = groupBy === 'owner' ? ownerPriorityOrder : priorityOrder;
                    const pa = priorityMap[a] ?? -1; // Use -1 as fallback so unmapped groups appear last
                    const pb = priorityMap[b] ?? -1; // Use -1 as fallback so unmapped groups appear last

                    if (pa !== pb) {
                        return pa - pb; // Lower priority values first: pa - pb makes lower pa values sort earlier
                    }

                    return a.localeCompare(b); // Secondary alphabetical sort
                });
                break;

            case 'alpha':
                groupOrder = groupOrder.sort((a, b) => a.localeCompare(b));
                break;

            case 'alpha-desc':
                groupOrder = groupOrder.sort((a, b) => b.localeCompare(a));
                break;

            default:
                // For other sort types, maintain alphabetical group order
                groupOrder = groupOrder.sort((a, b) => a.localeCompare(b));
                break;
        }

        return groupOrder;
    }

    /**
     * Sort files within a group (for grouped displays)
     * @param {Array} files - Files in the group
     * @param {Function} getDisplayTitle - Title extraction function
     * @returns {Array} Sorted files
     */
    static sortFilesInGroup(files, getDisplayTitle) {
        if (!files || files.length === 0) return files;

        return files.sort((a, b) => {
            const titleA = getDisplayTitle ? getDisplayTitle(a) : a.title || a.file || '';
            const titleB = getDisplayTitle ? getDisplayTitle(b) : b.title || b.file || '';
            return titleA.localeCompare(titleB);
        });
    }

    /**
     * Helper method to determine search type from results
     * @param {Array} results - Search results
     * @returns {string} Search type identifier
     */
    static inferSearchType(results) {
        if (!results || results.length === 0) return 'generic';

        const sample = results[0];

        // Check for GDrive search results (has location and file properties)
        if (sample.location && sample.file) {
            return 'gdrive';
        }

        // Check for Media search results (has instances/allInstanceData from grouping)
        if (sample.instances || sample.allInstanceData || sample.instanceCount) {
            return 'media';
        }

        // Check for Assets search results (has asset_type but no instance data)
        if (sample.asset_type) {
            return 'assets';
        }

        // Fallback checks
        if (sample.title && sample.year) {
            return 'media';
        }

        return 'generic';
    }
}

export default SearchSorter;
