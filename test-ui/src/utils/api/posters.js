/**
 * DAPS Posters API Module
 *
 * Handles poster and artwork management operations:
 * - Poster search and discovery
 * - Poster download and management
 * - Artwork collection operations
 * - Poster quality and metadata
 */

import { apiCore } from './core.js';

/**
 * Posters API client for artwork management
 */
export const postersAPI = {
    /**
     * Search for posters
     * @param {Object} searchParams - Search parameters
     * @param {string} searchParams.query - Search query
     * @param {string} searchParams.mediaId - Associated media ID
     * @param {string} searchParams.type - Poster type (poster, backdrop, banner)
     * @param {string} searchParams.source - Source to search (gdrive, assets, tmdb, etc.)
     * @param {Array} searchParams.sizes - Preferred sizes
     * @param {string} searchParams.sort - Sort by (relevance, size, quality)
     * @param {number} searchParams.limit - Results limit
     * @param {number} searchParams.offset - Results offset
     * @returns {Promise<Object>} Search results with pagination
     */
    searchPosters: (searchParams = {}) => {
        const params = new URLSearchParams();

        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(item => params.append(key, item));
                } else {
                    params.set(key, value.toString());
                }
            }
        });

        return apiCore.get(`/posters/search?${params}`, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 minutes cache
        });
    },

    /**
     * Fetch specific poster details
     * @param {string} posterId - Poster identifier
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Poster details
     */
    fetchPoster: (posterId, options = {}) => {
        return apiCore.get(`/posters/${posterId}`, {
            useCache: true,
            cacheTTL: 10 * 60 * 1000,
            ...options,
        });
    },

    /**
     * Download poster
     * @param {string} posterId - Poster identifier
     * @param {Object} options - Download options
     * @param {string} options.size - Preferred size
     * @param {string} options.format - Preferred format
     * @param {string} options.quality - Quality preference
     * @returns {Promise<Object>} Download job information
     */
    downloadPoster: (posterId, options = {}) => {
        return apiCore.post(`/posters/${posterId}/download`, options);
    },

    /**
     * Upload poster
     * @param {FormData|Object} posterData - Poster data
     * @param {Object} metadata - Poster metadata
     * @param {string} metadata.mediaId - Associated media ID
     * @param {string} metadata.type - Poster type
     * @param {string} metadata.title - Poster title
     * @returns {Promise<Object>} Upload response
     */
    uploadPoster: (posterData, metadata = {}) => {
        const formData = posterData instanceof FormData ? posterData : new FormData();

        if (!(posterData instanceof FormData)) {
            Object.entries(posterData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        // Add metadata
        Object.entries(metadata).forEach(([key, value]) => {
            formData.append(`metadata[${key}]`, value);
        });

        return apiCore.post('/posters/upload', formData, {
            headers: {
                // Remove content-type to let browser set multipart boundary
                'Content-Type': undefined,
            },
        });
    },

    /**
     * Delete poster
     * @param {string} posterId - Poster identifier
     * @param {Object} options - Deletion options
     * @param {boolean} options.deleteFile - Delete file from storage
     * @returns {Promise<Object>} Deletion response
     */
    deletePoster: (posterId, options = {}) => {
        return apiCore.delete(`/posters/${posterId}`, {
            body: JSON.stringify(options),
        });
    },

    /**
     * Fetch poster collections
     * @param {Object} options - Request options
     * @param {string} options.type - Collection type filter
     * @returns {Promise<Array>} List of poster collections
     */
    fetchCollections: (options = {}) => {
        const params = new URLSearchParams(options);
        const url = params.toString() ? `/posters/collections?${params}` : '/posters/collections';

        return apiCore.get(url, {
            useCache: true,
            cacheTTL: 10 * 60 * 1000,
        });
    },

    /**
     * Create poster collection
     * @param {Object} collectionData - Collection data
     * @param {string} collectionData.name - Collection name
     * @param {string} collectionData.description - Collection description
     * @param {string} collectionData.type - Collection type
     * @returns {Promise<Object>} Created collection
     */
    createCollection: collectionData => {
        return apiCore.post('/posters/collections', collectionData);
    },

    /**
     * Add poster to collection
     * @param {string} collectionId - Collection identifier
     * @param {string} posterId - Poster identifier
     * @param {Object} options - Addition options
     * @returns {Promise<Object>} Addition response
     */
    addToCollection: (collectionId, posterId, options = {}) => {
        return apiCore.post(`/posters/collections/${collectionId}/add`, {
            posterId,
            ...options,
        });
    },

    /**
     * Remove poster from collection
     * @param {string} collectionId - Collection identifier
     * @param {string} posterId - Poster identifier
     * @returns {Promise<Object>} Removal response
     */
    removeFromCollection: (collectionId, posterId) => {
        return apiCore.delete(`/posters/collections/${collectionId}/remove/${posterId}`);
    },

    /**
     * Fetch poster statistics
     * @param {Object} options - Statistics options
     * @param {string} options.groupBy - Group by (type, source, quality)
     * @param {string} options.period - Time period
     * @returns {Promise<Object>} Poster statistics
     */
    fetchStatistics: (options = {}) => {
        const params = new URLSearchParams(options);
        const url = params.toString() ? `/posters/stats?${params}` : '/posters/stats';

        return apiCore.get(url, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000,
        });
    },

    /**
     * Search Google Drive for posters
     * @param {Object} searchParams - GDrive search parameters
     * @param {string} searchParams.query - Search query
     * @param {string} searchParams.folder - Specific folder to search
     * @param {string} searchParams.mediaType - Media type filter
     * @returns {Promise<Object>} GDrive search results
     */
    searchGoogleDrive: (searchParams = {}) => {
        const params = new URLSearchParams(searchParams);
        return apiCore.get(`/posters/sources/gdrive/search?${params}`, {
            useCache: true,
            cacheTTL: 2 * 60 * 1000, // 2 minutes cache for GDrive
        });
    },

    /**
     * Search local assets for posters
     * @param {Object} searchParams - Assets search parameters
     * @param {string} searchParams.query - Search query
     * @param {string} searchParams.path - Specific path to search
     * @param {Array} searchParams.extensions - File extensions to include
     * @returns {Promise<Object>} Assets search results
     */
    searchAssets: (searchParams = {}) => {
        const params = new URLSearchParams();

        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(item => params.append(key, item));
                } else {
                    params.set(key, value.toString());
                }
            }
        });

        return apiCore.get(`/posters/sources/assets/search?${params}`, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000,
        });
    },

    /**
     * Auto-match posters to media
     * @param {Object} options - Matching options
     * @param {string} options.mediaId - Specific media ID (optional)
     * @param {string} options.source - Source to match from
     * @param {number} options.confidence - Minimum confidence threshold
     * @param {boolean} options.overwrite - Overwrite existing posters
     * @returns {Promise<Object>} Matching job information
     */
    autoMatchPosters: (options = {}) => {
        return apiCore.post('/posters/auto-match', options);
    },

    /**
     * Optimize poster storage
     * @param {Object} options - Optimization options
     * @param {Array} options.sizes - Target sizes to maintain
     * @param {string} options.format - Target format
     * @param {number} options.quality - Target quality
     * @returns {Promise<Object>} Optimization job information
     */
    optimizeStorage: (options = {}) => {
        return apiCore.post('/posters/optimize', options);
    },

    /**
     * Fetch poster duplicates
     * @param {Object} options - Detection options
     * @param {number} options.similarity - Similarity threshold
     * @param {string} options.method - Detection method (hash, visual)
     * @returns {Promise<Array>} List of duplicate groups
     */
    fetchDuplicates: (options = {}) => {
        const params = new URLSearchParams(options);
        const url = params.toString() ? `/posters/duplicates?${params}` : '/posters/duplicates';

        return apiCore.get(url, {
            useCache: true,
            cacheTTL: 10 * 60 * 1000,
        });
    },

    /**
     * Resolve poster duplicates
     * @param {string} duplicateGroupId - Duplicate group identifier
     * @param {Object} resolution - Resolution action
     * @param {string} resolution.keepId - Poster ID to keep
     * @param {Array} resolution.removeIds - Poster IDs to remove
     * @returns {Promise<Object>} Resolution response
     */
    resolveDuplicates: (duplicateGroupId, resolution) => {
        return apiCore.post(`/posters/duplicates/${duplicateGroupId}/resolve`, resolution);
    },

    /**
     * Sync poster metadata
     * @param {string} posterId - Poster identifier (optional for all)
     * @param {Object} options - Sync options
     * @param {boolean} options.overwrite - Overwrite existing metadata
     * @param {Array} options.sources - Metadata sources to sync from
     * @returns {Promise<Object>} Sync job information
     */
    syncMetadata: (posterId = null, options = {}) => {
        const url = posterId ? `/posters/${posterId}/sync-metadata` : '/posters/sync-metadata';
        return apiCore.post(url, options);
    },

    /**
     * Fetch list of poster files
     * @param {boolean} forceRefresh - Force refresh cache
     * @returns {Promise<Array>} Array of poster file names
     */
    fetchPosterFileList: (forceRefresh = false) => {
        return apiCore
            .get('/posters/list', {
                useCache: !forceRefresh,
                cacheTTL: 5 * 60 * 1000, // 5 minutes cache
            })
            .then(response => {
                // Extract files array from response
                if (response && response.data && Array.isArray(response.data.files)) {
                    return response.data.files;
                }
                return [];
            })
            .catch(error => {
                console.error('Failed to fetch poster file list:', error);
                return [];
            });
    },
};
