// ui/src/components/search/renderers/BaseSearchRenderer.jsx
// Base class for search result renderers - defines the interface all renderers must implement

import React from 'react';

export class BaseSearchRenderer {
    /**
     * Render the search results
     * @param {Object} props - Rendering props
     * @param {Array} props.results - Search results array
     * @param {string} props.searchTerm - Current search term
     * @param {string} props.currentSort - Current sort option
     * @param {string} props.currentView - Current view mode ('grid' | 'list')
     * @param {Function} props.onResultClick - Result click handler
     * @param {Object} props.hoverPreviewImgRef - Hover preview ref
     * @param {boolean} props.enableHoverPreview - Hover preview enabled
     * @param {Object} props.additionalProps - Any additional renderer-specific props
     * @returns {React.Element} Rendered results
     */
    render() {
        throw new Error('SearchRenderer must implement render() method');
    }

    /**
     * Get renderer-specific error messages (Phase 2 Enhancement)
     * @param {string} error - Error message
     * @returns {React.Element} Rendered error
     */
    renderError(error) {
        const isNetworkError =
            error.includes('fetch') || error.includes('network') || error.includes('connection');
        const isDataError =
            error.includes('data') || error.includes('cache') || error.includes('load');
        const isConfigError = error.includes('config') || error.includes('setting');

        return (
            <div className="search-error-container" role="alert" aria-live="assertive">
                <div className="search-error-icon" aria-hidden="true">
                    {isNetworkError ? '🌐' : isDataError ? '📊' : isConfigError ? '⚙️' : '⚠️'}
                </div>
                <div className="search-error-content">
                    <div className="search-error-title">
                        {isNetworkError
                            ? 'Connection Error'
                            : isDataError
                              ? 'Data Loading Error'
                              : isConfigError
                                ? 'Configuration Error'
                                : 'Search Error'}
                    </div>
                    <div className="search-error-message">{error}</div>
                    <div className="search-error-actions">
                        <button
                            className="search-retry-btn"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Get renderer-specific empty state (Phase 2 Enhancement)
     * @param {string} searchTerm - Current search term
     * @returns {React.Element} Rendered empty state
     */
    renderEmptyState(searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            // Simple centered message without the big white box
            return (
                <div className="search-empty-container" role="status" aria-live="polite">
                    <div className="search-empty-icon" aria-hidden="true">
                        🔍
                    </div>
                    <div className="search-empty-content">
                        <div className="search-empty-title">Ready to Search</div>
                        <div className="search-empty-message">
                            Type a search term and press <kbd>Enter</kbd> or click{' '}
                            <strong>Search</strong>.
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="search-empty-container" role="status" aria-live="polite">
                <div className="search-empty-icon" aria-hidden="true">
                    📭
                </div>
                <div className="search-empty-content">
                    <div className="search-empty-title">No Results Found</div>
                    <div className="search-empty-message">
                        No results found for &ldquo;<strong>{searchTerm}</strong>&rdquo;. Try
                        adjusting your search terms or filters.
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Pre-process results before rendering (sorting, filtering, etc.)
     * @param {Array} results - Raw results
     * @param {Object} options - Processing options
     * @returns {Array} Processed results
     */
    processResults(results) {
        return results;
    }

    /**
     * Get unique key for a result item
     * @param {Object} result - Result item
     * @param {number} index - Item index
     * @returns {string} Unique key
     */
    getResultKey(result, index) {
        const obj = result.original || result;
        return [obj.id || 'item', obj.location || '', obj.file || obj.title || '', index].join('|');
    }

    /**
     * Get display title for a result
     * @param {Object} result - Result item
     * @returns {string} Display title
     */
    getDisplayTitle(result) {
        const obj = result.original || result;
        return result.title || obj.file || obj.title || 'Untitled';
    }

    /**
     * Highlight search terms in text
     * @param {string} text - Text to highlight
     * @param {string} searchTerm - Search term to highlight
     * @returns {string} HTML with highlighted terms
     */
    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(
            `(${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`,
            'gi'
        );
        return text.replace(regex, `<span class="highlight">$1</span>`);
    }
}
