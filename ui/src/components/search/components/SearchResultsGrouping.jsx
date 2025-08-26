// ui/src/components/search/components/SearchResultsGrouping.jsx
// Common search results grouping component for both GridView and ListView

import React, { memo } from 'react';

/**
 * SearchResultsGrouping - Header component for grouped search result sections
 * Displays the group name with consistent styling across view types
 *
 * @param {string} groupKey - The key/name of the group
 * @param {string} groupBy - The type of grouping (owner, location, etc.)
 * @param {string} variant - View variant ('grid' or 'list') for styling differences
 */
const SearchResultsGrouping = memo(({ groupKey, groupBy, variant = 'grid' }) => {
    const getGroupLabel = () => {
        if (groupBy === 'owner') {
            return `Owner: ${groupKey}`;
        }
        if (groupBy === 'location') {
            return `Location: ${groupKey}`;
        }
        return groupKey;
    };

    // Determine CSS class based on variant
    const headerClass = variant === 'list' ? 'group-header group-header--list' : 'group-header';

    return (
        <div className={headerClass}>
            <h2 className="group-header__title">{getGroupLabel()}</h2>
        </div>
    );
});

SearchResultsGrouping.displayName = 'SearchResultsGrouping';

export default SearchResultsGrouping;
