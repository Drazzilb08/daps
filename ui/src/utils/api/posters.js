/**
 * Poster & GDrive API Functions
 * Handles poster statistics, GDrive sync, and poster file operations
 */

import {
    handleApiResponse,
    extractData,
    clearCache,
    withCache,
    CACHE_KEYS,
    getCacheKey,
} from './core.js';

// ========== GDRIVE SYNC FUNCTIONS ==========

/**
 * Execute GDrive synchronization for specified locations
 *
 * Initiates poster synchronization jobs for one or more GDrive locations.
 * Handles both single and bulk sync operations with proper job tracking.
 *
 * @param {Array<string>} gdrive_names - Array of GDrive location names to sync
 * @returns {Promise<Object>} Sync response with job information
 * @returns {boolean} success - Operation success status
 * @returns {string} message - Status message from backend
 * @returns {string} [job_id] - Single job identifier (for single sync)
 * @returns {string} [name] - GDrive location name (for single sync)
 * @returns {Array} [jobs] - Array of job objects (for bulk sync)
 *
 * @throws {Error} When sync starts but returns no job information
 *
 * @example
 * // Sync single GDrive location
 * const result = await runGDriveAdhocSync(['primary-gdrive']);
 * console.log('Job started:', result.job_id);
 *
 * @example
 * // Bulk sync multiple locations
 * const result = await runGDriveAdhocSync(['gdrive-1', 'gdrive-2']);
 * result.jobs.forEach(job => console.log('Job:', job.id));
 */
export async function runGDriveAdhocSync(gdrive_names) {
    // Build query string for multiple GDrive locations
    const qs = gdrive_names.map(n => `gdrive_names=${encodeURIComponent(n)}`).join('&');
    const res = await fetch(`/api/posters/gdrive/sync?${qs}`, { method: 'POST' });
    const data = await handleApiResponse(res);

    // Invalidate GDrive-related cache entries after sync initiation
    clearCache('gdrive');

    const responseData = extractData(data);

    // Handle different response formats based on sync scope
    if (responseData.job_id) {
        // Single sync operation response
        return {
            success: true,
            message: data.message,
            job_id: responseData.job_id,
            name: responseData.name,
        };
    } else if (responseData.jobs) {
        // Bulk sync operation response
        return {
            success: true,
            message: data.message,
            jobs: responseData.jobs,
        };
    }

    // Unexpected response format - should not occur with valid backend
    throw new Error('Sync started but no job information returned');
}

// Get Gdrive Statistics (cached)
export async function fetchGDriveStats(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.GDRIVE_STATS,
        async () => {
            const res = await fetch('/api/posters/gdrive/stats');
            const data = await handleApiResponse(res);
            return extractData(data, 'gdrive_stats') || [];
        },
        forceRefresh
    );
}

// ========== POSTER STATISTICS ==========

// Get unmatched poster statistics (cached)
export async function fetchUnmatchedStats(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.UNMATCHED_STATS,
        async () => {
            const res = await fetch('/api/posters/unmatched/stats');
            const data = await handleApiResponse(res);
            return extractData(data, 'summary') || {};
        },
        forceRefresh
    );
}

// Get matched poster statistics (cached)
export async function fetchMatchedPosterStats(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.MATCHED_POSTER_STATS,
        async () => {
            const res = await fetch('/api/posters/matched/stats');
            const data = await handleApiResponse(res);
            return extractData(data, 'matched_posters_stats') || [];
        },
        forceRefresh
    );
}

// Get poster/folder stats (cached per location)
export async function fetchPosters(location, forceRefresh = false) {
    if (!location) {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
            message: 'Missing location for stats fetch.',
        };
    }

    const cacheKey = getCacheKey('posters', { location });

    try {
        return await withCache(
            cacheKey,
            async () => {
                const res = await fetch(
                    `/api/posters/analyze?location=${encodeURIComponent(location)}`
                );
                const data = await handleApiResponse(res);
                const posterData = extractData(data);

                return {
                    error: false,
                    file_count: posterData.file_count || 0,
                    size_bytes: posterData.size_bytes || 0,
                    files: posterData.files || [],
                    message: data.message,
                };
            },
            forceRefresh
        );
    } catch (error) {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
            message: error.message || 'Failed to fetch poster stats.',
        };
    }
}

// Get list of poster files (cached)
export async function fetchPosterFileList(forceRefresh = false) {
    return await withCache(
        'poster_file_list',
        async () => {
            const res = await fetch('/api/posters/list');
            const data = await handleApiResponse(res);
            const files = extractData(data, 'files');
            return Array.isArray(files) ? files : [];
        },
        forceRefresh
    );
}

// ========== POSTER UPLOAD FUNCTIONS ==========

// Upload a single media cache item by ID (not cached - action)
export async function uploadMediaById(id) {
    if (!id) throw new Error('Missing id for media upload');
    const res = await fetch(`/api/posters/upload/media/${id}`, {
        method: 'POST',
    });
    const data = await handleApiResponse(res);

    // Clear cache after upload
    clearCache('cache');

    return {
        success: true,
        message: data.message,
        data: extractData(data),
    };
}

// Upload a single collection cache item by ID (not cached - action)
export async function uploadCollectionById(id) {
    if (!id) throw new Error('Missing id for collection upload');
    const res = await fetch(`/api/posters/upload/collection/${id}`, {
        method: 'POST',
    });
    const data = await handleApiResponse(res);

    // Clear cache after upload
    clearCache('cache');

    return {
        success: true,
        message: data.message,
        data: extractData(data),
    };
}

// ========== POSTER PREVIEW FUNCTIONS ==========

// Poster preview URL (not async, just guard errors)
export function fetchPosterPreviewUrl(location, path) {
    if (!location || !path) {
        return '';
    }
    return `/api/posters/preview?location=${encodeURIComponent(location)}&path=${encodeURIComponent(
        path
    )}`;
}

// Generate poster preview URL with flexible parameters (used by search components)
export function getPosterPreviewUrl(options = {}) {
    const { location, file, relativeFile, path, thumb, ...otherParams } = options;

    // Return empty string for invalid options
    if (!location && !path) {
        return '';
    }

    const params = new URLSearchParams();

    // Handle different parameter patterns
    if (location) {
        params.append('location', location);
        if (file || relativeFile) {
            params.append('file', relativeFile || file);
        }
    } else if (path) {
        params.append('path', path);
    }

    // Add thumbnail parameter if specified
    if (thumb) {
        params.append('thumb', '1');
    }

    // Add any additional parameters
    Object.entries(otherParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, value);
        }
    });

    return `/api/posters/preview?${params.toString()}`;
}

// Poster preview URL for renamed files (path-based)
export function getPosterPreviewUrlByPath(filePath) {
    if (!filePath) {
        return '';
    }
    return `/api/posters/preview?path=${encodeURIComponent(filePath)}`;
}
