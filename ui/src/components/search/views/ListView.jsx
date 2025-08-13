// ui/src/components/search/views/ListView.jsx
// Reusable list view component for poster displays

import React from 'react';

export default function ListView({
    results = [],
    searchTerm = '',
    onResultClick,
    getResultKey,
    getDisplayTitle,
    highlightSearchTerm,
    setupHoverPreview = () => ({}),
    hoverPreviewImgRef,
    enableHoverPreview,
    renderMetadata = () => null,
    className = 'poster-search-results',
    focusedResultIndex = -1, // Phase 2 Enhancement: keyboard navigation
    resultsContainerRef
}) {
    return (
        <div className={className} id="poster-search-results" ref={resultsContainerRef}>
            {results.map((result, index) => {
                const obj = result.original || result;
                const displayTitle = getDisplayTitle(result);
                const hoverProps = setupHoverPreview(result, hoverPreviewImgRef, enableHoverPreview);
                const isFocused = focusedResultIndex === index;
                
                return (
                    <div
                        className={`poster-list-item ${isFocused ? 'keyboard-focused' : ''}`}
                        data-location={encodeURIComponent(obj.location || '')}
                        data-file={encodeURIComponent(obj.file || '')}
                        tabIndex={0}
                        title={displayTitle}
                        key={getResultKey(result, index)}
                        onClick={() => onResultClick(result)}
                        role="button"
                        aria-label={`Open ${displayTitle}`}
                        aria-describedby={`result-${index}-meta`}
                        {...hoverProps}
                    >
                        <span
                            className="poster-file-label"
                            dangerouslySetInnerHTML={{
                                __html: highlightSearchTerm(displayTitle, searchTerm),
                            }}
                        />
                        {renderMetadata(result)}
                    </div>
                );
            })}
        </div>
    );
}