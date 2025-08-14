// ui/src/components/search/views/GridView.jsx
// Reusable grid view component for poster displays

import React from 'react';
import LazyImage from '../../common/LazyImage';

export default function GridView({
    results = [],
    searchTerm = '',
    onResultClick,
    getResultKey,
    getDisplayTitle,
    getImageUrl,
    highlightSearchTerm,
    renderMetadata = () => null,
    className = 'search-results',
    focusedResultIndex = -1, // Phase 2 Enhancement: keyboard navigation
    resultsContainerRef,
}) {
    return (
        <div className={className} id="search-results" ref={resultsContainerRef}>
            <div className="search-grid">
                {results.map((result, index) => {
                    const obj = result.original || result;
                    const displayTitle = getDisplayTitle(result);
                    const imageUrl = getImageUrl(result);
                    const isFocused = focusedResultIndex === index;

                    return (
                        <div
                            className={`search-grid-item ${isFocused ? 'keyboard-focused' : ''}`}
                            data-location={encodeURIComponent(obj.location || '')}
                            data-file={encodeURIComponent(obj.file || '')}
                            tabIndex={0}
                            title={displayTitle}
                            key={getResultKey(result, index)}
                            onClick={() => onResultClick(result)}
                            role="button"
                            aria-label={`Open ${displayTitle}`}
                            aria-describedby={`result-${index}-meta`}
                        >
                            {imageUrl && (
                                <LazyImage
                                    src={imageUrl}
                                    alt={displayTitle}
                                    className="poster-thumb-img"
                                    threshold={0.1}
                                    rootMargin="100px"
                                />
                            )}
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
        </div>
    );
}
