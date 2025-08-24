// ui/src/components/search/adapters/GdriveSearchAdapter.js
// GDrive/Custom search adapter that replicates exact logic from GdriveSearch.jsx

import { fetchConfig, fetchPosters, fetchPosterPreviewUrl } from '../../../utils/api';

// Utility function to check if a file is an image (preserved from existing code)
function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

/**
 * Module-level cache implementation for GDrive/Custom data
 *
 * Implements intelligent caching to prevent redundant API calls during the same session.
 * Cache is invalidated when configuration changes or when explicitly cleared.
 * Thread-safe loading prevents concurrent fetch operations.
 */
let cachedData = null; // Stores loaded configuration and file data
let isLoading = false; // Prevents concurrent load operations

export const gdriveSearchAdapter = {
    /**
     * Clear cached data when configuration changes
     *
     * Call this method when GDrive locations or custom directories are modified
     * to ensure fresh data is loaded on next search operation.
     */
    clearLocationCache() {
        cachedData = null; // Invalidate cached data
        isLoading = false; // Reset loading state
        console.log('GDrive data cache cleared - next search will reload from API');
    },

    /**
     * Get current cache state for debugging and monitoring
     *
     * @returns {Object} Cache status information
     * @returns {boolean} hasCache - Whether data is currently cached
     * @returns {boolean} isLoading - Whether a load operation is in progress
     */
    getCacheStatus() {
        return {
            hasCache: !!cachedData,
            isLoading,
        };
    },
    /**
     * Load initial data for GDrive/Custom search
     * Replicates the exact logic from GdriveSearch.jsx useEffect
     */
    async loadInitialData() {
        // Return cached data if available
        if (cachedData) {
            return cachedData;
        }

        // Prevent multiple simultaneous loads
        if (isLoading) {
            return new Promise(resolve => {
                const checkLoading = () => {
                    if (!isLoading && cachedData) {
                        resolve(cachedData);
                    } else if (!isLoading) {
                        resolve(this.loadInitialData());
                    } else {
                        setTimeout(checkLoading, 100);
                    }
                };
                checkLoading();
            });
        }

        isLoading = true;
        try {
            // Load config first
            const config = await fetchConfig();

            // GDrive Locations & Files (exact same logic)
            let gdriveLocations =
                (config.sync_gdrive?.gdrive_list || []).map(g => ({
                    name: g.name,
                    location: g.location,
                })) || [];

            // Custom Locations (exact same logic)
            const gdriveLocSet = new Set(gdriveLocations.map(g => g.location));
            const sourceDirs = config.poster_renamerr?.source_dirs || [];
            const customLocations = sourceDirs.filter(dir => !gdriveLocSet.has(dir));

            // Fetch files for GDrive/Custom (exact same logic)
            let gdriveFiles = [];
            let customFiles = [];
            let errorSources = [];

            // Load GDrive files (exact same logic as original)
            for (const { name, location } of gdriveLocations) {
                const stats = await fetchPosters(location);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('GDrive');
                    continue;
                }
                stats.files.forEach(f => gdriveFiles.push({ file: f, name, location }));
            }

            // Load Custom files (exact same logic as original)
            for (const dir of customLocations) {
                const stats = await fetchPosters(dir);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('Custom');
                    continue;
                }
                customFiles.push(
                    ...stats.files.map(f => ({
                        file: f,
                        name: dir.split('/').pop() + ' (Custom)',
                        location: dir,
                    }))
                );
            }

            // Priority order - match GDrive locations to source_dirs positions
            // Last entry in source_dirs has highest priority
            const priorityOrder = {};
            const ownerPriorityOrder = {};

            // For each GDrive location, check if it exists in source_dirs and assign priority
            gdriveLocations.forEach(gdrive => {
                const sourceIndex = sourceDirs.indexOf(gdrive.location);

                if (sourceIndex !== -1) {
                    // Found in source_dirs - later positions = higher priority values
                    // Use index directly so last item gets highest priority
                    const priority = sourceIndex;
                    priorityOrder[gdrive.location] = priority;

                    // Also map owner name to priority for group sorting
                    ownerPriorityOrder[gdrive.name] = priority;
                }
            });

            // Extract unique owners for filtering
            const gdriveOwners = Array.from(
                new Set(gdriveFiles.map(f => f.name).filter(Boolean))
            ).sort();

            const result = {
                config,
                gdriveLocations,
                customLocations,
                gdriveFiles,
                customFiles,
                gdriveOwners,
                priorityOrder,
                ownerPriorityOrder,
                errorSources,
                files: [...gdriveFiles, ...customFiles], // Combined for easier access
            };

            // Cache the result
            cachedData = result;
            return result;
        } catch (error) {
            console.error('Error loading GDrive configuration:', error);
            // Return empty state instead of throwing - allows UI to continue
            const result = {
                config: {},
                gdriveLocations: [],
                customLocations: [],
                gdriveFiles: [],
                customFiles: [],
                gdriveOwners: [],
                priorityOrder: {},
                ownerPriorityOrder: {},
                errorSources: ['Configuration'],
                files: [],
            };

            // Cache even the error state to prevent retries
            cachedData = result;
            return result;
        } finally {
            isLoading = false;
        }
    },

    /**
     * Search through GDrive/Custom data
     * Replicates the exact handleSearch() logic from GdriveSearch.jsx
     */
    search(data, searchTerm, filters, currentSource) {
        if (!data) return [];

        const { gdriveFiles, customFiles } = data;

        // Get all files based on current source (exact same logic as getAllFiles())
        function getAllFiles() {
            if (currentSource === 'gdrive') return gdriveFiles;
            if (currentSource === 'custom') return customFiles;
            return [];
        }

        let allFiles = getAllFiles();
        let filtered = allFiles.filter(obj => obj.file && isImageFile(obj.file));

        // Apply search term (exact same logic)
        let results = filtered;
        if (searchTerm && searchTerm.trim()) {
            const lc = searchTerm.trim().toLowerCase();
            results = filtered.filter(obj => obj.file.toLowerCase().includes(lc));
        }

        return results;
    },

    /**
     * Apply additional filters to search results
     * Replicates the useMemo filtering logic from GdriveSearch.jsx
     */
    filter(results, filters, currentSource) {
        let filtered = [...results];

        // Owner filter (for GDrive only - exact same logic)
        const selectedGDriveOwner = filters.selectedGDriveOwner;
        if (currentSource === 'gdrive' && selectedGDriveOwner) {
            filtered = filtered.filter(obj => obj.name === selectedGDriveOwner);
        }

        return filtered;
    },

    /**
     * Format a result item for display
     * Ensures consistent structure for SearchResults component
     */
    formatResult(item) {
        // Parse title and year from filename to match MediaSearch format
        let parsedTitle = item.file;
        let parsedYear = '';
        let parsedType = '';

        if (item.file) {
            // Remove file extension
            let fileName = item.file.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');

            // Remove database IDs like {tmdb-123456}
            fileName = fileName.replace(/\{(tmdb|tvdb|imdb-tt)[^}]+\}/gi, '').trim();

            // Remove season information like "- Season 1"
            fileName = fileName.replace(/-+\s*Season.*$/i, '').trim();

            // Extract year from parentheses
            const yearMatch = fileName.match(/^(.*?)\s*\((\d{4})\)\s*(.*)$/);
            if (yearMatch) {
                parsedTitle = yearMatch[1].trim();
                parsedYear = yearMatch[2];
                // Check if there's additional info after year that might indicate type
                const afterYear = yearMatch[3].trim();
                if (afterYear.toLowerCase().includes('collection')) {
                    parsedType = 'collection';
                } else {
                    // Default to movie for files with years
                    parsedType = 'movie';
                }
            } else {
                parsedTitle = fileName;
                // Without year info, assume it's a show or unknown
                parsedType = '';
            }
        }

        return {
            id: `${item.location}|${item.file}`, // Create unique ID
            title: parsedTitle, // Parsed title without filename artifacts
            year: parsedYear, // Extracted year for consistent display
            mediaType: parsedType, // Inferred type (movie/show/collection) - renamed to avoid field conflicts
            instanceCount: 1, // Single instance for file-based items
            instances: [item.name || 'Unknown'], // Source name as instance
            imageUrl:
                item.location && item.file ? fetchPosterPreviewUrl(item.location, item.file) : '',
            // Keep original data for compatibility
            original: item,
            // Metadata for backwards compatibility
            metadata: {
                owner: item.name,
                source: item.location,
                mediaType: parsedType, // Store in metadata too
            },
            // Keep all original data
            ...item,
        };
    },

    /**
     * Get available owners for GDrive filtering
     * Replicates the gdriveOwners useMemo logic from GdriveSearch.jsx
     */
    getAvailableOwners(data, currentSource) {
        if (!data || currentSource !== 'gdrive') return [];

        const { gdriveFiles } = data;
        return Array.from(new Set(gdriveFiles.map(f => f.name).filter(Boolean))).sort();
    },

    /**
     * Check if we should show the empty search prompt
     * Replicates the logic from GdriveSearchResults.jsx
     */
    shouldShowSearchPrompt(searchTerm) {
        return !searchTerm || !searchTerm.trim();
    },
};

// Default export for easier importing
export default gdriveSearchAdapter;
