// ui/src/components/search/renderers/SimpleListRenderer.jsx
// Simple list renderer for basic search results - good for database searches, etc.

import React from 'react';
import { BaseSearchRenderer } from './BaseSearchRenderer.jsx';

export class SimpleListRenderer extends BaseSearchRenderer {
    processResults(results, { currentSort }) {
        let sortedResults = [...results];

        if (currentSort === 'alpha') {
            sortedResults.sort((a, b) =>
                this.getDisplayTitle(a).localeCompare(this.getDisplayTitle(b))
            );
        } else if (currentSort === 'alpha-desc') {
            sortedResults.sort((a, b) =>
                this.getDisplayTitle(b).localeCompare(this.getDisplayTitle(a))
            );
        } else if (currentSort === 'date') {
            sortedResults.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.added_at || a.created_at || 0);
                const dateB = new Date(b.updated_at || b.added_at || b.created_at || 0);
                return dateB - dateA;
            });
        }

        return sortedResults;
    }

    renderListItem(result, index, { searchTerm, onResultClick }) {
        const displayTitle = this.getDisplayTitle(result);
        const obj = result.original || result;

        return (
            <div
                key={this.getResultKey(result, index)}
                className="search-list-item simple-list-item"
                tabIndex={0}
                title={displayTitle}
                onClick={() => onResultClick(result)}
            >
                <span
                    className="poster-file-label"
                    dangerouslySetInnerHTML={{
                        __html: this.highlightSearchTerm(displayTitle, searchTerm),
                    }}
                />
                {result.subtitle && <span className="list-item-subtitle">{result.subtitle}</span>}
                {obj.description && (
                    <span className="list-item-description">{obj.description}</span>
                )}
            </div>
        );
    }

    renderGridItem(result, index, { searchTerm, onResultClick }) {
        const displayTitle = this.getDisplayTitle(result);

        return (
            <div
                key={this.getResultKey(result, index)}
                className="search-grid-item simple-grid-item"
                tabIndex={0}
                title={displayTitle}
                onClick={() => onResultClick(result)}
            >
                {result.imageUrl && (
                    <div className="simple-item-image">
                        <img src={result.imageUrl} alt={displayTitle} />
                    </div>
                )}
                <span
                    className="poster-file-label"
                    dangerouslySetInnerHTML={{
                        __html: this.highlightSearchTerm(displayTitle, searchTerm),
                    }}
                />
                {result.subtitle && <span className="grid-item-subtitle">{result.subtitle}</span>}
            </div>
        );
    }

    render({ results, searchTerm, currentSort, currentView, onResultClick, ...additionalProps }) {
        const processedResults = this.processResults(results, { currentSort });

        if (currentView === 'list') {
            return (
                <div
                    className="search-results simple-list-results"
                    id="search-results"
                >
                    {processedResults.map((result, index) =>
                        this.renderListItem(result, index, {
                            searchTerm,
                            onResultClick,
                            ...additionalProps,
                        })
                    )}
                </div>
            );
        }

        // Grid view
        return (
            <div className="search-results simple-grid-results" id="search-results">
                <div className="search-grid">
                    {processedResults.map((result, index) =>
                        this.renderGridItem(result, index, {
                            searchTerm,
                            onResultClick,
                            ...additionalProps,
                        })
                    )}
                </div>
            </div>
        );
    }
}

// Export as default for convenience
export default SimpleListRenderer;
