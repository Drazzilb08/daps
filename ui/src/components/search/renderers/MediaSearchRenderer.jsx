// ui/src/components/search/renderers/MediaSearchRenderer.jsx
// Custom renderer for media search with database refresh suggestions

import React, { useState, useRef } from 'react';
import PosterRenderer from './PosterRenderer.jsx';
import Tooltip from '../../Tooltip.jsx';

export class MediaSearchRenderer extends PosterRenderer {
    /**
     * Render metadata for media search items including multiple instance indicators
     * @param {Object} result - Media search result
     * @returns {React.Element} Rendered metadata
     */
    renderAssetMetadata = result => {
        const hasMultipleInstances = result.instanceCount > 1;

        // Only show indicator for items with multiple instances
        if (!hasMultipleInstances) {
            return null;
        }

        const instancesList = result.instances?.join(', ') || '';

        // Use React hooks inside a functional component
        const InstanceIndicator = () => {
            const [showTooltip, setShowTooltip] = useState(false);
            const indicatorRef = useRef(null);

            return (
                <div
                    ref={indicatorRef}
                    className="multiple-instances-indicator"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    aria-label={`This item is available in ${result.instanceCount} instances: ${instancesList}`}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 10,
                        background: 'var(--accent)',
                        color: 'var(--text-color)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'help',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgb(0 0 0 / 40%)',
                        lineHeight: '1',
                    }}
                >
                    {result.instanceCount}
                    <Tooltip
                        anchor={indicatorRef.current}
                        text={`Available in ${result.instanceCount} instances: ${instancesList}`}
                        show={showTooltip}
                        position="top"
                    />
                </div>
            );
        };

        return <InstanceIndicator />;
    };

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
                            Try searching with database IDs: <code>tmdb:123</code>,{' '}
                            <code>imdb:tt123456</code>, or <code>tvdb:789</code>
                        </div>
                    </div>
                    <div className="search-empty-refresh-notice">
                        <strong>Missing content?</strong> If you expect to see this item but
                        it&apos;s not appearing, try <strong>refreshing your database</strong> using
                        the refresh button above to sync the latest data from your Radarr, Sonarr,
                        and Plex instances.
                    </div>
                </div>
            </div>
        );
    }
}

// Create and export an instance
export default new MediaSearchRenderer();
