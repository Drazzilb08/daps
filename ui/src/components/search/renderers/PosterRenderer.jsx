// ui/src/components/search/renderers/PosterRenderer.jsx
// Generic poster renderer that orchestrates views and helpers

import React from 'react';
import { BaseSearchRenderer } from './BaseSearchRenderer.jsx';
import { fetchPosterPreviewUrl } from '../../../utils/api';
import GridView from '../views/GridView';
import ListView from '../views/ListView';
import GroupedView from '../views/GroupedView';
import VirtualizedGridView from '../views/VirtualizedGridView';
import VirtualizedListView from '../views/VirtualizedListView';
import { groupingHelper } from '../helpers/groupingHelper';

export class PosterRenderer extends BaseSearchRenderer {
    processResults(results, { currentSort, groupBy }) {
        // For grouped displays with priority sorting, don't sort individual files
        if (groupBy && currentSort && currentSort.startsWith('priority-')) {
            return results;
        }

        // Apply individual file sorting for non-priority sorts
        let sortedResults = [...results];
        if (currentSort === 'alpha') {
            sortedResults.sort((a, b) => {
                const titleA = this.getDisplayTitle(a);
                const titleB = this.getDisplayTitle(b);
                return titleA.localeCompare(titleB);
            });
        } else if (currentSort === 'alpha-desc') {
            sortedResults.sort((a, b) => {
                const titleA = this.getDisplayTitle(a);
                const titleB = this.getDisplayTitle(b);
                return titleB.localeCompare(titleA);
            });
        } else if (currentSort === 'date') {
            sortedResults.sort((a, b) => {
                const dateA = new Date(a.updated_at || a.added_at || a.last_indexed || 0);
                const dateB = new Date(b.updated_at || b.added_at || b.last_indexed || 0);
                return dateB - dateA;
            });
        }

        return sortedResults;
    }

    // === HOVER PREVIEW SETUP ===
    setupHoverPreview = (result, hoverPreviewImgRef, enableHoverPreview) => {
        if (!enableHoverPreview || !hoverPreviewImgRef?.current) return {};

        const obj = result.original || result;

        return {
            onMouseOver: () => {
                const img = hoverPreviewImgRef.current;
                if (obj.location && obj.file) {
                    let url = fetchPosterPreviewUrl(obj.location, obj.relativeFile || obj.file);
                    url += url.includes('?') ? '&thumb=1' : '?thumb=1';
                    img.src = url;
                    img.style.display = 'block';
                } else if (result.imageUrl) {
                    img.src = result.imageUrl;
                    img.style.display = 'block';
                }
            },
            onMouseOut: () => {
                const img = hoverPreviewImgRef.current;
                img.style.display = 'none';
                img.src = '';
            },
            onMouseMove: e => {
                const img = hoverPreviewImgRef.current;
                if (img.style.display === 'block') {
                    // Smaller preview for better UX - max 150px width, maintain aspect ratio
                    const maxWidth = 150;
                    const maxHeight = 200;

                    let imgWidth, imgHeight;
                    if (img.naturalWidth && img.naturalHeight) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        if (aspectRatio > 1) {
                            // Landscape: limit by width
                            imgWidth = Math.min(img.naturalWidth, maxWidth);
                            imgHeight = imgWidth / aspectRatio;
                        } else {
                            // Portrait: limit by height
                            imgHeight = Math.min(img.naturalHeight, maxHeight);
                            imgWidth = imgHeight * aspectRatio;
                        }
                    } else {
                        imgWidth = maxWidth;
                        imgHeight = maxHeight;
                    }

                    // Set the image size
                    img.style.width = imgWidth + 'px';
                    img.style.height = imgHeight + 'px';

                    const vpWidth = window.innerWidth;
                    const vpHeight = window.innerHeight;

                    let left = e.pageX + 14;
                    let top = e.pageY + 14;

                    if (left + imgWidth > vpWidth - 10)
                        left = Math.max(10, vpWidth - imgWidth - 10);
                    if (top + imgHeight > vpHeight - 10)
                        top = Math.max(10, vpHeight - imgHeight - 10);

                    img.style.left = left + 'px';
                    img.style.top = top + 'px';
                }
            },
        };
    };

    // === IMAGE URL GENERATION ===
    getImageUrl = result => {
        const obj = result.original || result;

        // If result has explicit imageUrl (from adapter formatting)
        if (result.imageUrl) {
            return result.imageUrl;
        }

        // Generate from location/file (existing pattern)
        if (obj.location && obj.file) {
            let url = fetchPosterPreviewUrl(obj.location, obj.relativeFile || obj.file);
            url += url.includes('?') ? '&thumb=1' : '?thumb=1';
            return url;
        }

        return '';
    };

    // === METADATA RENDERING ===
    renderAssetMetadata = result => {
        const obj = result.original || result;

        if (!obj.asset_type) return null;

        return (
            <div className="search-item-meta">
                {obj.asset_type === 'movie' && obj.year && (
                    <span className="meta-movie">
                        {obj.title} ({obj.year})
                    </span>
                )}
                {obj.asset_type === 'movie' && result.instanceCount > 1 && (
                    <span className="meta-subtitle">Instances: {result.instanceCount}</span>
                )}
                {obj.asset_type === 'show' && result.seasonCount > 0 && (
                    <span className="meta-subtitle">
                        {result.seasonCount === 1 ? `Season: 1` : `Seasons: ${result.seasonCount}`}
                    </span>
                )}
                {obj.asset_type === 'collection' && (
                    <span className="meta-collection">{obj.title} (Collection)</span>
                )}
            </div>
        );
    };

    // === MAIN RENDER METHOD ===
    render({
        results,
        searchTerm,
        currentSort,
        currentView,
        onResultClick,
        hoverPreviewImgRef,
        enableHoverPreview,
        priorityOrder,
        groupBy = null, // 'location' to enable grouping
        focusedResultIndex = -1, // Phase 2 Enhancement: keyboard navigation
        resultsContainerRef,
        enableVirtualization = true, // Phase 2 Enhancement: result virtualization
        virtualizationThreshold = 100, // Enable for 100+ items
        ...additionalProps
    }) {
        const processedResults = this.processResults(results, { currentSort, groupBy });

        // Determine if we should use virtualization
        const shouldUseVirtualization =
            enableVirtualization && processedResults.length >= virtualizationThreshold && !groupBy; // Don't virtualize grouped views yet

        // Common props for all views
        const viewProps = {
            results: processedResults,
            searchTerm,
            currentSort,
            onResultClick,
            getResultKey: this.getResultKey,
            getDisplayTitle: this.getDisplayTitle,
            getImageUrl: this.getImageUrl,
            highlightSearchTerm: this.highlightSearchTerm,
            setupHoverPreview: this.setupHoverPreview,
            hoverPreviewImgRef,
            enableHoverPreview,
            renderMetadata: this.renderAssetMetadata,
            focusedResultIndex,
            resultsContainerRef,
            enableVirtualization,
            virtualizationThreshold,
            ...additionalProps,
        };

        // === GROUPED RENDERING (when groupBy is specified) ===
        if (groupBy === 'location') {
            return (
                <GroupedView
                    {...viewProps}
                    currentView={currentView}
                    priorityOrder={priorityOrder}
                    groupingHelper={groupingHelper}
                />
            );
        }

        // === NON-GROUPED RENDERING ===
        if (currentView === 'list') {
            // Use virtualized list for large datasets
            if (shouldUseVirtualization) {
                return <VirtualizedListView {...viewProps} />;
            }
            return <ListView {...viewProps} />;
        }

        // Use virtualized grid for large datasets
        if (shouldUseVirtualization) {
            return <VirtualizedGridView {...viewProps} />;
        }
        return <GridView {...viewProps} />;
    }
}

export default PosterRenderer;
