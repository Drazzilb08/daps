// ui/src/components/search/renderers/PosterRenderer.jsx
// Generic poster renderer that orchestrates views and helpers

import React from 'react';
import { BaseSearchRenderer } from './BaseSearchRenderer.jsx';
import { fetchPosterPreviewUrl } from '../../../utils/api';
import GridView from '../views/GridView';
import ListView from '../views/ListView';
import { groupingHelper } from '../helpers/groupingHelper';
import { SearchSorter } from '../sorting';

export class PosterRenderer extends BaseSearchRenderer {
    processResults(results) {
        // Results are already sorted by SearchSorter in SearchCore
        // Renderer only handles display logic, not sorting
        return results;
    }

    // === HOVER PREVIEW SETUP ===
    setupHoverPreview = (result, hoverPreviewImgRef, enableHoverPreview) => {
        if (!enableHoverPreview || !hoverPreviewImgRef?.current) return {};

        const posterData = result.original || result;

        return {
            onMouseOver: () => {
                const img = hoverPreviewImgRef.current;
                if (posterData.location && posterData.file) {
                    let url = fetchPosterPreviewUrl(
                        posterData.location,
                        posterData.relativeFile || posterData.file
                    );
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
                    // Set max width to constrain size while maintaining aspect ratio
                    img.style.maxWidth = '200px';
                    img.style.maxHeight = '300px';
                    img.style.width = 'auto';
                    img.style.height = 'auto';

                    // Use offsetWidth/Height for actual rendered dimensions
                    const imgWidth = img.offsetWidth || 200;
                    const imgHeight = img.offsetHeight || 300;
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
        const posterData = result.original || result;

        // If result has explicit imageUrl (from adapter formatting)
        if (result.imageUrl) {
            return result.imageUrl;
        }

        // Generate from location/file (existing pattern)
        if (posterData.location && posterData.file) {
            let url = fetchPosterPreviewUrl(
                posterData.location,
                posterData.relativeFile || posterData.file
            );
            url += url.includes('?') ? '&thumb=1' : '?thumb=1';
            return url;
        }

        return '';
    };

    // === TITLE FORMATTING ===
    getDisplayTitle(result) {
        const posterData = result.original || result;

        // All adapters now provide consistent title/year/type format
        const title = result.title || posterData.title || posterData.file || 'Untitled';
        const year = result.year || posterData.year;
        const type = result.type || posterData.type || posterData.asset_type;

        // Format title with year for movies and shows (consistent across all plugins)
        if (year && (type === 'movie' || type === 'show' || type === 'collection')) {
            return `${title} (${year})`;
        }

        return title;
    }

    // === SUBTITLE GENERATION ===
    generateSubtitle(result) {
        const posterData = result.original || result;
        const type = result.type || posterData.type || posterData.asset_type;

        if (type === 'show') {
            // For TV shows, show seasons count if available (MediaSearch data)
            const seasonCount = result.seasonCount || 0;
            if (seasonCount > 1) {
                return `Seasons: ${seasonCount}`;
            } else if (seasonCount === 1) {
                return `Season: 1`;
            } else {
                return '';
            }
        } else if (type === 'movie' || type === 'collection') {
            // Movies and collections should not have any subtitle - title already includes the year
            return '';
        }

        // For file-based results without clear type, return empty
        return '';
    }

    // === METADATA RENDERING ===
    renderAssetMetadata = result => {
        const posterData = result.original || result;
        const type = result.type || posterData.type || posterData.asset_type;
        const subtitle = this.generateSubtitle(result);

        // For all results with consistent type information, show subtitle if available
        if (type === 'movie' || type === 'show' || type === 'collection') {
            return subtitle ? <div className="search-result-subtitle">{subtitle}</div> : null;
        }

        // For legacy file-based results without standardized format, show basic metadata
        if (posterData.asset_type && !type) {
            return (
                <div className="poster-asset-meta">
                    {posterData.asset_type === 'movie' && posterData.year && (
                        <span className="meta-movie">
                            {posterData.title} ({posterData.year})
                        </span>
                    )}
                    {posterData.asset_type === 'show' && (
                        <span className="meta-show">
                            {posterData.title}
                            {posterData.season_number != null
                                ? ` — Season ${posterData.season_number}`
                                : ''}
                        </span>
                    )}
                    {posterData.asset_type === 'collection' && (
                        <span className="meta-collection">{posterData.title} (Collection)</span>
                    )}
                </div>
            );
        }

        return null;
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
        ...additionalProps
    }) {
        const processedResults = this.processResults(results, { currentSort, groupBy });

        // Virtualization is now always enabled in the views themselves

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
            ...additionalProps,
        };

        // === GROUPED RENDERING (when groupBy is specified) ===
        // Note: Grouping functionality simplified - handled directly by views
        if (groupBy === 'location') {
            // Apply grouping helper to process results for display
            const groupedResults = groupingHelper.groupByLocation(processedResults, priorityOrder);
            // Temporarily disable grouping - needs proper implementation
            console.warn('Location grouping temporarily disabled');
            const flattenedResults = processedResults;

            const groupedViewProps = {
                ...viewProps,
                results: flattenedResults,
                isGrouped: true,
                groups: groupedResults,
            };

            if (currentView === 'list') {
                return <ListView {...groupedViewProps} />;
            }
            return <GridView {...groupedViewProps} />;
        }

        if (groupBy === 'owner') {
            // Apply grouping helper to process results for display
            const groupedResults = groupingHelper.groupByOwner(processedResults);

            // Get owner priority order from additional props (passed from SearchCore)
            const ownerPriorityOrder = additionalProps.ownerPriorityOrder || {};

            // Get the proper group order based on sorting and priority
            const groupOrder = SearchSorter.sortGroups(groupedResults, currentSort, {
                priorityOrder,
                ownerPriorityOrder,
                groupBy: 'owner',
            });

            const groupedViewProps = {
                ...viewProps,
                results: processedResults,
                isGrouped: true,
                groups: groupedResults,
                groupOrder,
                groupBy: 'owner',
            };

            if (currentView === 'list') {
                return <ListView {...groupedViewProps} />;
            }
            return <GridView {...groupedViewProps} />;
        }

        // === NON-GROUPED RENDERING ===
        if (currentView === 'list') {
            return <ListView {...viewProps} />;
        }

        return <GridView {...viewProps} />;
    }
}

export default PosterRenderer;
