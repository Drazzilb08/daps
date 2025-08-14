// ui/src/components/search/views/GroupedView.jsx
// Generic grouped view component that uses helpers and GridView/ListView

import React from 'react';
import ListView from './ListView';

export default function GroupedView({
    results = [],
    searchTerm = '',
    currentSort,
    currentView = 'grid',
    priorityOrder = {},
    onResultClick,
    getResultKey,
    getDisplayTitle,
    getImageUrl,
    highlightSearchTerm,
    setupHoverPreview,
    hoverPreviewImgRef,
    enableHoverPreview,
    renderMetadata,
    className = 'poster-search-results',
    groupingHelper, // Helper that provides grouping functions
}) {
    if (!groupingHelper) {
        console.error('GroupedView requires a groupingHelper prop');
        return <div className="poster-search-error">Grouping configuration error</div>;
    }

    const groups = groupingHelper.groupByLocation(results);
    const groupOrder = groupingHelper.getGroupOrder(groups, currentSort, priorityOrder);

    const viewProps = {
        searchTerm,
        onResultClick,
        getResultKey,
        getDisplayTitle,
        getImageUrl,
        highlightSearchTerm,
        setupHoverPreview,
        hoverPreviewImgRef,
        enableHoverPreview,
        renderMetadata,
    };

    if (currentView === 'list') {
        return (
            <div className={className} id="poster-search-results">
                {groupOrder.map(location => (
                    <React.Fragment key={location}>
                        <div className="poster-owner-label">
                            {groupingHelper.getGroupLabel(groups[location], location)}
                        </div>
                        <ListView
                            results={groupingHelper.sortFilesInGroup(
                                groups[location],
                                getDisplayTitle
                            )}
                            className="" // No wrapper class since we're already wrapped
                            {...viewProps}
                        />
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // Grid view with groups
    return (
        <div className={className} id="poster-search-results">
            {groupOrder.map(location => (
                <div key={location} className="poster-owner-group">
                    <div className="poster-owner-label">
                        {groupingHelper.getGroupLabel(groups[location], location)}
                    </div>
                    <div className="poster-grid">
                        {groups[location].map((result, index) => {
                            const obj = result.original || result;
                            const displayTitle = getDisplayTitle(result);
                            const imageUrl = getImageUrl(result);

                            return (
                                <div
                                    className="poster-grid-item"
                                    data-location={encodeURIComponent(obj.location || '')}
                                    data-file={encodeURIComponent(obj.file || '')}
                                    tabIndex={0}
                                    title={displayTitle}
                                    key={getResultKey(result, index)}
                                    onClick={() => onResultClick(result)}
                                >
                                    {imageUrl && (
                                        <img
                                            src={imageUrl}
                                            alt={displayTitle}
                                            className="poster-thumb-img"
                                            loading="lazy"
                                        />
                                    )}
                                    <span
                                        className="poster-file-label"
                                        dangerouslySetInnerHTML={{
                                            __html: highlightSearchTerm(displayTitle, searchTerm),
                                        }}
                                    />
                                    {renderMetadata && renderMetadata(result)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
