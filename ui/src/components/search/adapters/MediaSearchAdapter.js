// ui/src/components/search/adapters/MediaSearchAdapter.js
// Business logic adapter for media search operations

import { fetchMediaCache, fetchPlexMediaCache } from '../../../utils/api';

/**
 * MediaSearchAdapter - Business logic for media management operations
 * Provides data loading, searching, filtering, and aggregation for media items
 */
export const mediaSearchAdapter = {
    // Data storage
    _mediaItems: [],
    _plexItems: [],
    _aggregatedItems: [],

    /**
     * Load initial data from API endpoints
     */
    async loadInitialData(currentSource) {
        try {
            console.log('MediaSearchAdapter: Loading initial data for source:', currentSource);

            // Load both media cache and plex cache
            console.log('MediaSearchAdapter: Fetching data from APIs...');
            const [mediaItems, plexItems] = await Promise.all([
                fetchMediaCache(),
                fetchPlexMediaCache(),
            ]);

            console.log('MediaSearchAdapter: Raw API responses:', {
                mediaItems: mediaItems ? `Array(${mediaItems.length})` : 'null/undefined',
                plexItems: plexItems ? `Array(${plexItems.length})` : 'null/undefined',
            });

            this._mediaItems = mediaItems || [];
            this._plexItems = plexItems || [];

            // Create aggregated view with plex mapping
            this._aggregatedItems = this.aggregateMediaItems(this._mediaItems, this._plexItems);

            console.log(
                `MediaSearchAdapter: Loaded ${this._mediaItems.length} media items, ${this._plexItems.length} plex items, ${this._aggregatedItems.length} aggregated`
            );

            if (this._aggregatedItems.length === 0) {
                console.warn(
                    'MediaSearchAdapter: No aggregated items created. Check data or aggregation logic.'
                );
                console.log('Sample media item:', this._mediaItems[0]);
                console.log('Sample plex item:', this._plexItems[0]);
            }

            return {
                mediaItems: this._mediaItems,
                plexItems: this._plexItems,
                aggregatedItems: this._aggregatedItems,
                totalCount: this._aggregatedItems.length,
            };
        } catch (error) {
            console.error('MediaSearchAdapter: Error loading data:', error);
            throw error;
        }
    },

    /**
     * Aggregate media items by unique identifiers (same type only)
     * Groups movies with movies, shows with shows
     */
    aggregateMediaItems(mediaItems, plexItems) {
        const grouped = new Map();
        const plexLookup = this.createPlexLookup(plexItems);

        for (const item of mediaItems) {
            // Use pre-computed plex mapping if available, otherwise fall back to manual matching
            let plexData = null;

            if (item.plex_mapping_id) {
                // Fast lookup using pre-computed mapping
                plexData = plexItems.find(p => p.id === item.plex_mapping_id);
            }

            if (!plexData) {
                // Fallback to manual matching for items without pre-computed mappings
                plexData = this.findPlexMapping(item, plexLookup);
            }

            if (!plexData) continue;

            // Create unique key: tmdb_id || tvdb_id || imdb_id || normalized_title+year+type
            const key =
                item.tmdb_id ||
                item.tvdb_id ||
                item.imdb_id ||
                `${item.normalized_title}:${item.year}:${item.asset_type}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    ...item,
                    instances: [item.instance_name],
                    instanceCount: 1,
                    allInstanceData: [item],
                    plexLabels: this.parseLabels(plexData.labels),
                    plexData: plexData,
                    plex_mapping_id: plexData.id, // Add mapping reference
                });
            } else {
                const existing = grouped.get(key);
                // Only aggregate if same type (movies with movies, shows with shows)
                if (existing.asset_type === item.asset_type) {
                    // Only add instance_name if it's not already in the array (avoid duplicates)
                    if (!existing.instances.includes(item.instance_name)) {
                        existing.instances.push(item.instance_name);
                        existing.instanceCount++;
                    }
                    existing.allInstanceData.push(item);
                    // Keep Plex data from first occurrence (they should be the same)
                    if (!existing.plexLabels && plexData.labels) {
                        existing.plexLabels = this.parseLabels(plexData.labels);
                    }
                }
            }
        }

        return Array.from(grouped.values());
    },

    /**
     * Create a lookup map for plex items for efficient matching
     */
    createPlexLookup(plexItems) {
        const lookup = new Map();

        for (const plexItem of plexItems) {
            // Parse guids for matching
            const guids = this.parseGuids(plexItem.guids);

            // Add entries for each guid type
            if (guids.tmdb) lookup.set(`tmdb:${guids.tmdb}`, plexItem);
            if (guids.tvdb) lookup.set(`tvdb:${guids.tvdb}`, plexItem);
            if (guids.imdb) lookup.set(`imdb:${guids.imdb}`, plexItem);

            // Also add title+year fallback
            const titleKey = `${plexItem.normalized_title}:${plexItem.year}:${plexItem.asset_type}`;
            lookup.set(titleKey, plexItem);
        }

        return lookup;
    },

    /**
     * Find matching plex item for a media item
     * Now uses pre-computed plex_mapping_id when available for faster lookups
     */
    findPlexMapping(mediaItem, plexLookup) {
        // Try TMDB ID first
        if (mediaItem.tmdb_id) {
            const match = plexLookup.get(`tmdb:${mediaItem.tmdb_id}`);
            if (match) return match;
        }

        // Try TVDB ID
        if (mediaItem.tvdb_id) {
            const match = plexLookup.get(`tvdb:${mediaItem.tvdb_id}`);
            if (match) return match;
        }

        // Try IMDB ID
        if (mediaItem.imdb_id) {
            const match = plexLookup.get(`imdb:${mediaItem.imdb_id}`);
            if (match) return match;
        }

        // Fallback to title+year+type
        const titleKey = `${mediaItem.normalized_title}:${mediaItem.year}:${mediaItem.asset_type}`;
        return plexLookup.get(titleKey);
    },

    /**
     * Parse Plex labels from JSON string to array
     */
    parseLabels(labelsString) {
        if (!labelsString) return [];

        if (Array.isArray(labelsString)) {
            return labelsString;
        }

        try {
            return JSON.parse(labelsString);
        } catch (error) {
            console.warn('Error parsing Plex labels:', error, 'Raw labels string:', labelsString);
            return [];
        }
    },

    /**
     * Parse Plex GUID string into structured data
     */
    parseGuids(guidsString) {
        const guids = {};
        if (!guidsString) return guids;

        try {
            const parsed = JSON.parse(guidsString);

            // Handle different possible formats
            let guidArray = [];
            if (Array.isArray(parsed)) {
                guidArray = parsed;
            } else if (typeof parsed === 'string') {
                // If it's a single string, wrap in array
                guidArray = [parsed];
            } else if (parsed && typeof parsed === 'object') {
                // If it's an object, try to extract values
                guidArray = Object.values(parsed);
            }

            for (const guid of guidArray) {
                if (typeof guid === 'string') {
                    if (guid.includes('themoviedb://')) {
                        guids.tmdb = guid
                            .replace('com.plexapp.agents.themoviedb://', '')
                            .split('?')[0];
                    } else if (guid.includes('thetvdb://')) {
                        guids.tvdb = guid
                            .replace('com.plexapp.agents.thetvdb://', '')
                            .split('?')[0];
                    } else if (guid.includes('imdb://')) {
                        guids.imdb = guid.replace('com.plexapp.agents.imdb://', '').split('?')[0];
                    }
                }
            }
        } catch (error) {
            console.warn('Error parsing Plex GUIDs:', error, 'Raw GUIDs string:', guidsString);
        }

        return guids;
    },

    /**
     * Search function for filtering aggregated media items
     * Supports advanced search patterns: tmdb:123, imdb:tt123456, tvdb:789
     */
    search(data, searchTerm) {
        if (!searchTerm) {
            return data.aggregatedItems || [];
        }

        const trimmedTerm = searchTerm.trim();

        // Check for advanced search patterns
        const advancedSearchMatch = this.parseAdvancedSearchTerm(trimmedTerm);
        if (advancedSearchMatch) {
            return this.performAdvancedSearch(data.aggregatedItems || [], advancedSearchMatch);
        }

        // Standard text search
        const lowerTerm = trimmedTerm.toLowerCase();
        return (data.aggregatedItems || []).filter(item => {
            return (
                item.title?.toLowerCase().includes(lowerTerm) ||
                item.normalized_title?.toLowerCase().includes(lowerTerm) ||
                item.instances?.some(instance => instance.toLowerCase().includes(lowerTerm)) ||
                item.year?.toString().includes(lowerTerm)
            );
        });
    },

    /**
     * Parse advanced search terms like tmdb:123, imdb:tt123456, tvdb:789
     */
    parseAdvancedSearchTerm(searchTerm) {
        const patterns = [
            { type: 'tmdb', regex: /^tmdb:(\d+)$/i },
            { type: 'imdb', regex: /^imdb:(tt\d+|\d+)$/i },
            { type: 'tvdb', regex: /^tvdb:(\d+)$/i },
        ];

        for (const pattern of patterns) {
            const match = searchTerm.match(pattern.regex);
            if (match) {
                let id = match[1];
                // Normalize IMDB IDs - add 'tt' prefix if not present
                if (pattern.type === 'imdb' && !id.startsWith('tt')) {
                    id = 'tt' + id;
                }
                return { type: pattern.type, id };
            }
        }

        return null;
    },

    /**
     * Perform advanced search based on database IDs
     */
    performAdvancedSearch(items, searchCriteria) {
        const { type, id } = searchCriteria;

        return items.filter(item => {
            switch (type) {
                case 'tmdb':
                    return item.tmdb_id && item.tmdb_id.toString() === id;
                case 'imdb':
                    return item.imdb_id && item.imdb_id === id;
                case 'tvdb':
                    return item.tvdb_id && item.tvdb_id.toString() === id;
                default:
                    return false;
            }
        });
    },

    /**
     * Filter function for applying filters
     */
    filter(results, filters) {
        let filtered = [...results];

        // Apply asset type filter
        if (filters.assetTypeFilter && filters.assetTypeFilter !== 'all') {
            filtered = filtered.filter(item => item.asset_type === filters.assetTypeFilter);
        }

        // Apply source filter (Radarr/Sonarr) - keeping for backward compatibility
        if (filters.sourceFilter && filters.sourceFilter !== 'all') {
            filtered = filtered.filter(item => {
                // Check if any instance data matches the source
                return item.allInstanceData?.some(
                    instance => instance.source === filters.sourceFilter
                );
            });
        }

        return filtered;
    },

    /**
     * Sort function for ordering results
     */
    sort(results, sortOption) {
        const sortedResults = [...results];

        switch (sortOption) {
            case 'alpha':
                return sortedResults.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'alpha-desc':
                return sortedResults.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            case 'year_asc':
                return sortedResults.sort(
                    (a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0)
                );
            case 'year_desc':
                return sortedResults.sort(
                    (a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0)
                );
            case 'recently_added':
                return sortedResults.sort((a, b) => {
                    // Get the most recent created_at from all instance data
                    const getLatestCreatedAt = item => {
                        if (!item.allInstanceData || item.allInstanceData.length === 0) {
                            return new Date(item.created_at || 0);
                        }

                        const dates = item.allInstanceData
                            .map(instance => new Date(instance.created_at || 0))
                            .filter(date => !isNaN(date.getTime()));

                        return dates.length > 0 ? new Date(Math.max(...dates)) : new Date(0);
                    };

                    return getLatestCreatedAt(b) - getLatestCreatedAt(a);
                });
            default:
                return sortedResults;
        }
    },

    /**
     * Format result for display in search results
     */
    formatResult(item) {
        // Get poster from first instance (they should all have same poster)
        const firstInstance = item.allInstanceData?.[0] || item;
        const posterUrl = this.getPosterUrl(firstInstance);

        const seasonInfo = this.getSeasonInfo(item);

        return {
            ...item,
            id: item.id,
            title: item.title, // Raw title - let renderer format with year
            year: item.year,
            type: item.asset_type,
            instances: item.instances,
            plexLabels: item.plexLabels || [],
            allInstanceData: item.allInstanceData,
            plex_mapping_id: item.plex_mapping_id,
            // Raw season information for TV shows - let renderer format
            seasonCount: seasonInfo.count,
            seasonNumbers: seasonInfo.numbers,
            seasonDisplay: seasonInfo.display,
            // Poster display with priority: renamed_file -> poster_url -> default
            posterUrl: posterUrl,
            imageUrl: posterUrl, // PosterRenderer expects imageUrl
            // Route to media management modal instead of poster modal
            modalType: 'media-management',
            activeSubPlugin: 'labelarr', // Default sub-plugin
        };
    },

    /**
     * Generate subtitle based on asset type and data
     */
    generateSubtitle(item) {
        if (item.asset_type === 'show') {
            // For TV shows, show seasons count
            const seasons = this.getActualSeasonCount(item);
            if (seasons > 1) {
                return `Seasons: ${seasons}`;
            } else if (seasons === 1) {
                return `Season: 1`;
            } else {
                // For shows with no season data, don't show redundant "show" label
                return '';
            }
        } else if (item.asset_type === 'movie') {
            // Movies should not have any subtitle - title already includes the year
            return '';
        }

        // Default fallback
        return item.year ? `${item.year}` : '';
    },

    /**
     * Generate badge for display
     */
    generateBadge(item) {
        if (item.asset_type === 'show') {
            const seasons = this.getActualSeasonCount(item);
            return seasons > 1 ? seasons : null;
        } else if (item.asset_type === 'movie') {
            const instances = this.getUniqueInstanceCount(item);
            return instances > 1 ? instances : null;
        }
        return null;
    },

    /**
     * Get actual season count for TV shows (excluding NULL and 0 - Series/Specials entries)
     * Note: allInstanceData contains ALL database rows for this aggregated item,
     * not just unique ARR instances. For 2 Broke Girls with 6 seasons + Series + Specials = 8 rows total.
     */
    getActualSeasonCount(item) {
        if (!item.allInstanceData || item.asset_type !== 'show') {
            return 0;
        }

        // Get unique season numbers, excluding null/undefined/0/empty (Series/Specials entries)
        const validSeasons = new Set();
        item.allInstanceData.forEach(dbRow => {
            const seasonNum = dbRow.season_number;
            // More strict filtering: exclude null, undefined, empty string, 0, and non-numeric values
            if (
                seasonNum !== null &&
                seasonNum !== undefined &&
                seasonNum !== '' &&
                !isNaN(seasonNum)
            ) {
                const parsedSeason = parseInt(seasonNum);
                if (parsedSeason > 0) {
                    validSeasons.add(parsedSeason);
                }
            }
        });

        return validSeasons.size;
    },

    /**
     * Get unique ARR instance count (different Radarr/Sonarr instances)
     * This counts how many different ARR instances have the same content.
     * E.g., if both "Radarr A" and "Radarr B" have the same movie, this returns 2.
     */
    getUniqueInstanceCount(item) {
        if (!item.allInstanceData) {
            return 1;
        }

        // Count unique ARR instance names (e.g., "Radarr A", "Sonarr B")
        const uniqueArrInstances = new Set();
        item.allInstanceData.forEach(dbRow => {
            if (dbRow.instance_name) {
                uniqueArrInstances.add(dbRow.instance_name);
            }
        });

        return uniqueArrInstances.size;
    },

    /**
     * Legacy method for compatibility - use getActualSeasonCount instead
     */
    getSeasonCount(item) {
        return this.getActualSeasonCount(item);
    },

    /**
     * Get detailed season information for TV shows
     */
    getSeasonInfo(item) {
        if (!item.allInstanceData || item.asset_type !== 'show') {
            return { count: 0, numbers: [], display: '' };
        }

        // Use the same logic as getActualSeasonCount to ensure consistency
        const count = this.getActualSeasonCount(item);

        // Get unique season numbers for display purposes (use same logic as getActualSeasonCount)
        const validSeasons = new Set();
        item.allInstanceData.forEach(dbRow => {
            const seasonNum = dbRow.season_number;
            // More strict filtering: exclude null, undefined, empty string, 0, and non-numeric values
            if (
                seasonNum !== null &&
                seasonNum !== undefined &&
                seasonNum !== '' &&
                !isNaN(seasonNum)
            ) {
                const parsedSeason = parseInt(seasonNum);
                if (parsedSeason > 0) {
                    validSeasons.add(parsedSeason);
                }
            }
        });

        const seasonNumbers = Array.from(validSeasons).sort((a, b) => a - b);

        // Create display string for seasons
        let display = '';
        if (count > 0) {
            if (count <= 3) {
                // Show individual seasons: "S1, S2, S3"
                display = seasonNumbers.map(s => `S${s}`).join(', ');
            } else {
                // Show range: "S1-S5" or "S1, S3-S5" for non-consecutive
                const ranges = this.createSeasonRanges(seasonNumbers);
                display = ranges.join(', ');
            }
        }

        return {
            count: count,
            numbers: seasonNumbers,
            display: display,
        };
    },

    /**
     * Create season ranges for display (e.g., "S1-S3", "S5")
     */
    createSeasonRanges(numbers) {
        if (numbers.length === 0) return [];

        const ranges = [];
        let start = numbers[0];
        let end = numbers[0];

        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] === end + 1) {
                end = numbers[i];
            } else {
                // Add the current range
                if (start === end) {
                    ranges.push(`S${start}`);
                } else {
                    ranges.push(`S${start}-S${end}`);
                }
                start = numbers[i];
                end = numbers[i];
            }
        }

        // Add the final range
        if (start === end) {
            ranges.push(`S${start}`);
        } else {
            ranges.push(`S${start}-S${end}`);
        }

        return ranges;
    },

    /**
     * Get poster URL with fallback priority: renamed_file -> poster_url -> default
     */
    getPosterUrl(item) {
        // Priority 1: renamed_file (local file) - serve via API endpoint
        if (item.renamed_file) {
            return `/api/poster/preview?path=${encodeURIComponent(item.renamed_file)}`;
        }

        // Priority 2: poster_url (TMDB/external)
        if (item.poster_url) {
            return item.poster_url;
        }

        // Priority 3: Default placeholder
        return null; // Will use default placeholder in renderer
    },

    /**
     * Get autocomplete suggestions for search input
     */
    getAutocompleteSuggestions(query) {
        if (!query || query.length < 2) return [];

        try {
            // Filter and rank suggestions
            const suggestions = this._aggregatedItems
                .filter(item => this.matchesQuery(item, query))
                .sort((a, b) => this.rankSuggestion(a, query) - this.rankSuggestion(b, query))
                .slice(0, 12); // Limit to 12 suggestions

            // Use the exact same formatResult method as the grid view to ensure consistency
            return suggestions.map(item => {
                const formatted = this.formatResult(item);

                // Extract just the fields needed for autocomplete display
                let displayCount = '';
                let countType = '';

                if (item.asset_type === 'show') {
                    const uniqueArrInstances = this.getUniqueInstanceCount(item);
                    if (uniqueArrInstances > 1) {
                        // Multiple ARR instances have this show (e.g., Sonarr A and Sonarr B)
                        displayCount = uniqueArrInstances;
                        countType = 'instances';
                    } else if (formatted.seasonCount > 0) {
                        // Single ARR instance, show season count
                        displayCount = formatted.seasonCount;
                        countType = formatted.seasonCount === 1 ? 'season' : 'seasons';
                    }
                } else if (item.asset_type === 'movie') {
                    const uniqueArrInstances = this.getUniqueInstanceCount(item);
                    if (uniqueArrInstances > 1) {
                        // Multiple ARR instances have this movie (e.g., Radarr A and Radarr B)
                        displayCount = uniqueArrInstances;
                        countType = 'instances';
                    }
                }

                const result = {
                    ...formatted,
                    // Override the instanceCount and countType with our autocomplete-specific values
                    instanceCount: displayCount || 0,
                    countType: countType,
                };

                // Debug what we're actually returning
                if (item.title && item.title.toLowerCase().includes('broke')) {
                    console.log(
                        'AUTOCOMPLETE FINAL RETURN:',
                        JSON.stringify(
                            {
                                title: result.title,
                                instanceCount: result.instanceCount,
                                countType: result.countType,
                                formattedSeasonCount: formatted.seasonCount,
                                displayCount: displayCount,
                            },
                            null,
                            2
                        )
                    );
                }

                return result;
            });
        } catch (error) {
            console.error('Autocomplete error:', error);
            return [];
        }
    },

    /**
     * Check if item matches search query
     */
    matchesQuery(item, query) {
        const lowerQuery = query.toLowerCase();
        return (
            item.title?.toLowerCase().includes(lowerQuery) ||
            item.normalized_title?.toLowerCase().includes(lowerQuery)
        );
    },

    /**
     * Rank suggestion relevance
     */
    rankSuggestion(item, query) {
        const lowerQuery = query.toLowerCase();
        const title = item.title?.toLowerCase() || '';

        // Exact title match gets highest priority
        if (title === lowerQuery) return 0;

        // Title starts with query gets high priority
        if (title.startsWith(lowerQuery)) return 1;

        // Title contains query gets medium priority
        if (title.includes(lowerQuery)) return 2;

        // Other matches get lower priority
        return 3;
    },
};
