// ui/src/components/search/adapters/AssetsSearchAdapter.js
// Assets search adapter that replicates exact logic from AssetsSearch.jsx

import {
    fetchConfig,
    fetchMediaCache,
    fetchCollectionCache,
    fetchPosterPreviewUrl,
} from '../../../utils/api';

// Utility function to check if a file is an image (preserved from existing code)
function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

export const assetsSearchAdapter = {
    /**
     * Load initial data for assets search
     * Replicates the exact logic from AssetsSearch.jsx useEffect
     */
    async loadInitialData() {
        try {
            // Load config to get assetsDir
            const config = await fetchConfig();
            const assetsDir = config.poster_renamerr?.destination_dir || '';

            // Load both media and collection caches (handle errors gracefully like original)
            let mediaCache = [];
            let collectionCache = [];

            try {
                const [media, collections] = await Promise.all([
                    fetchMediaCache(),
                    fetchCollectionCache(),
                ]);
                mediaCache = media;
                collectionCache = collections;
            } catch (cacheError) {
                console.log(
                    'Expected error loading cache data (empty caches will be used):',
                    cacheError.message
                );
                // Continue with empty arrays - this matches original behavior
            }

            // Filter to only matched items (same as existing logic)
            const filteredMediaCache = mediaCache.filter(item => item.matched);
            const filteredCollectionCache = collectionCache.filter(item => item.matched);

            return {
                assetsDir,
                mediaCache: filteredMediaCache,
                collectionCache: filteredCollectionCache,
            };
        } catch (error) {
            console.error('Error loading assets configuration:', error);
            // Return empty state instead of throwing - allows UI to continue
            return {
                assetsDir: '',
                mediaCache: [],
                collectionCache: [],
            };
        }
    },

    /**
     * Search through assets data
     * Replicates the exact getAllAssets() and doSearch() logic from AssetsSearch.jsx
     */
    search(data, searchTerm, filters) {
        if (!data) return [];

        const { assetsDir, mediaCache, collectionCache } = data;

        // Step 1: Flatten both caches (exact same logic as getAllAssets())
        const allAssets = [
            ...collectionCache.map(c => ({
                ...c,
                file: c.renamed_file || c.original_file,
                location: assetsDir,
                asset_type: 'collection',
                relativeFile:
                    c.renamed_file || c.original_file
                        ? (c.renamed_file || c.original_file)
                              .replace(assetsDir + '/', '')
                              .replace(assetsDir + '\\', '')
                        : '',
            })),
            ...mediaCache.map(m => ({
                ...m,
                file: m.renamed_file || m.original_file,
                location: assetsDir,
                asset_type: m.asset_type || m.type || 'movie',
                relativeFile:
                    m.renamed_file || m.original_file
                        ? (m.renamed_file || m.original_file)
                              .replace(assetsDir + '/', '')
                              .replace(assetsDir + '\\', '')
                        : '',
            })),
        ].filter(obj => obj.file && isImageFile(obj.file));

        // Step 2: Deduplicate based on absolute file path (exact same logic)
        const seen = new Set();
        const uniqueAssets = [];
        for (const asset of allAssets) {
            const key = asset.location + '|' + asset.file;
            if (!seen.has(key)) {
                uniqueAssets.push(asset);
                seen.add(key);
            }
        }

        let filteredAssets = uniqueAssets;

        // Step 3: Apply asset type filter (exact same logic as existing)
        const assetTypeFilter = filters.assetTypeFilter || filters.assetType;
        const assetTypeMap = {
            collections: 'collection',
            movies: 'movie',
            shows: 'show',
        };

        if (assetTypeFilter && assetTypeFilter !== 'all') {
            filteredAssets = filteredAssets.filter(
                obj => (obj.asset_type || '').toLowerCase() === assetTypeMap[assetTypeFilter]
            );
        }

        // Step 4: Apply search term filter (exact same logic)
        if (searchTerm && searchTerm.trim()) {
            const lc = searchTerm.trim().toLowerCase();
            filteredAssets = filteredAssets.filter(
                obj => obj.file && obj.file.toLowerCase().includes(lc)
            );
        }

        return filteredAssets;
    },

    /**
     * Sort search results
     * Replicates the exact sorting logic from AssetsSearch.jsx
     */
    sort(results, sortOption) {
        const sortedResults = [...results];

        if (sortOption === 'alpha') {
            sortedResults.sort((a, b) => a.file.localeCompare(b.file));
        } else if (sortOption === 'alpha-desc') {
            sortedResults.sort((a, b) => b.file.localeCompare(a.file));
        } else if (sortOption === 'date') {
            sortedResults.sort((a, b) => {
                const dateA = new Date(a.last_indexed || a.added_at || 0);
                const dateB = new Date(b.last_indexed || b.added_at || 0);
                return dateB - dateA;
            });
        }

        return sortedResults;
    },

    /**
     * Format a result item for display
     * Ensures consistent structure for SearchResults component
     */
    formatResult(item) {
        // For assets, prefer the database title over filename parsing
        let displayTitle = item.title || item.file;
        let displayYear = item.year || '';
        let displayType = item.asset_type || '';

        // If no database title, parse from filename like GDrive
        if (!item.title && item.file) {
            // Remove file extension
            let fileName = item.file.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');

            // Remove database IDs like {tmdb-123456}
            fileName = fileName.replace(/\{(tmdb|tvdb|imdb-tt)[^}]+\}/gi, '').trim();

            // Remove season information like "- Season 1"
            fileName = fileName.replace(/-+\s*Season.*$/i, '').trim();

            // Extract year from parentheses
            const yearMatch = fileName.match(/^(.*?)\s*\((\d{4})\)\s*(.*)$/);
            if (yearMatch) {
                displayTitle = yearMatch[1].trim();
                if (!displayYear) displayYear = yearMatch[2];
                // Check if there's additional info after year that might indicate type
                const afterYear = yearMatch[3].trim();
                if (afterYear.toLowerCase().includes('collection') && !displayType) {
                    displayType = 'collection';
                } else if (!displayType) {
                    displayType = 'movie';
                }
            } else {
                displayTitle = fileName;
            }
        }

        return {
            id: item.id,
            title: displayTitle, // Database title or parsed filename
            year: displayYear, // Database year or parsed year
            type: displayType, // Database asset_type or inferred type
            instanceCount: 1, // Single instance for file-based items
            instances: ['Assets'], // Static instance name for assets
            imageUrl:
                item.location && item.file
                    ? fetchPosterPreviewUrl(item.location, item.relativeFile || item.file)
                    : '',
            // Keep original data for compatibility
            original: item,
            // Metadata for backwards compatibility
            metadata: {
                asset_type: item.asset_type,
                year: item.year,
                season_number: item.season_number,
                title: item.title,
            },
            // Keep all original data
            ...item,
        };
    },
};

// Default export for easier importing
export default assetsSearchAdapter;
