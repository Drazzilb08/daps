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
     * Multi-stage asset search and filtering algorithm
     *
     * This implements a comprehensive search pipeline that processes both media and
     * collection assets through normalization, deduplication, and filtering stages.
     *
     * Algorithm pipeline:
     * 1. Data normalization: Unify collection and media cache structures
     * 2. File filtering: Include only valid image files
     * 3. Deduplication: Remove duplicate file paths using location+file key
     * 4. Type filtering: Apply asset type restrictions
     * 5. Text search: Filter by filename content
     *
     * @param {Object} data - Contains assetsDir, mediaCache, collectionCache
     * @param {string} searchTerm - User search query for filename filtering
     * @param {Object} filters - Filter configuration object
     * @returns {Array} Filtered and deduplicated asset objects
     */
    search(data, searchTerm, filters) {
        if (!data) return [];

        const { assetsDir, mediaCache, collectionCache } = data;

        // STAGE 1: Normalize heterogeneous cache data into unified asset structure
        // Collections and media items have different schemas - normalize for consistent processing
        const allAssets = [
            // Process collection cache: standardize field names and paths
            ...collectionCache.map(c => ({
                ...c, // Preserve all original data
                file: c.renamed_file || c.original_file, // Prefer renamed over original
                location: assetsDir,
                asset_type: 'collection', // Explicit type for filtering
                relativeFile: this.computeRelativePath(
                    c.renamed_file || c.original_file,
                    assetsDir
                ),
            })),
            // Process media cache: handle type variations and path normalization
            ...mediaCache.map(m => ({
                ...m, // Preserve all original data
                file: m.renamed_file || m.original_file, // Prefer renamed over original
                location: assetsDir,
                asset_type: m.asset_type || m.type || 'movie', // Handle schema variations
                relativeFile: this.computeRelativePath(
                    m.renamed_file || m.original_file,
                    assetsDir
                ),
            })),
        ].filter(obj => obj.file && isImageFile(obj.file)); // Only include valid image files

        // STAGE 2: Deduplication using composite key strategy
        // Multiple cache entries might reference the same physical file
        const seen = new Set();
        const uniqueAssets = [];
        for (const asset of allAssets) {
            // Create unique identifier from location + filename
            // This handles cases where same file exists in multiple cache entries
            const key = asset.location + '|' + asset.file;
            if (!seen.has(key)) {
                uniqueAssets.push(asset);
                seen.add(key);
            }
        }

        let filteredAssets = uniqueAssets;

        // STAGE 3: Apply asset type filtering with mapping normalization
        const assetTypeFilter = filters.assetTypeFilter || filters.assetType;
        const assetTypeMap = {
            collections: 'collection',
            movies: 'movie',
            shows: 'show',
        };

        if (assetTypeFilter && assetTypeFilter !== 'all') {
            const targetType = assetTypeMap[assetTypeFilter];
            filteredAssets = filteredAssets.filter(
                obj => (obj.asset_type || '').toLowerCase() === targetType
            );
        }

        // STAGE 4: Apply filename-based text search
        // Search operates on the actual filename, not metadata titles
        if (searchTerm && searchTerm.trim()) {
            const lc = searchTerm.trim().toLowerCase();
            filteredAssets = filteredAssets.filter(
                obj => obj.file && obj.file.toLowerCase().includes(lc)
            );
        }

        return filteredAssets;
    },

    /**
     * Compute relative file path with cross-platform path handling
     * @private
     * @param {string} filePath - Full file path
     * @param {string} basePath - Base directory path
     * @returns {string} Relative path from basePath
     */
    computeRelativePath(filePath, basePath) {
        if (!filePath) return '';
        // Handle both Unix and Windows path separators
        return filePath.replace(basePath + '/', '').replace(basePath + '\\', '');
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
