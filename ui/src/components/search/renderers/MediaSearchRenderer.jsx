// ui/src/components/search/renderers/MediaSearchRenderer.jsx
// Custom renderer for media search with database refresh suggestions

import React from 'react';
import PosterRenderer from './PosterRenderer.jsx';

export class MediaSearchRenderer extends PosterRenderer {
    /**
     * Enhanced empty state for media search with refresh suggestions
     * @param {string} searchTerm - Current search term
     * @returns {React.Element} Rendered empty state
     */
    renderEmptyState(searchTerm) {
        // Use the base implementation for initial state (no search term)
        if (!searchTerm || !searchTerm.trim()) {
            return super.renderEmptyState(searchTerm);
        }

        // Custom "no results found" state with refresh suggestion
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
                    <div className="search-empty-advanced">
                        <div className="search-empty-advanced-title">
                            <strong>Advanced Search:</strong>
                        </div>
                        <div className="search-empty-advanced-options">
                            Try searching with database IDs: <code>tmdb:123</code>, <code>imdb:tt123456</code>, or <code>tvdb:789</code>
                        </div>
                    </div>
                    <div className="search-empty-refresh-notice">
                        <strong>Missing content?</strong> If you expect to see this item but it&apos;s not appearing, 
                        try <strong>refreshing your database</strong> using the refresh button above to sync the latest data 
                        from your Radarr, Sonarr, and Plex instances.
                    </div>
                </div>
            </div>
        );
    }
}

// Create and export an instance
export default new MediaSearchRenderer();