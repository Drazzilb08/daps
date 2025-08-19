// ========== CACHING LAYER ==========

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEYS = {
    CONFIG: 'config',
    INSTANCES: 'instances',
    LOG_MODULES: 'log_modules',
    JOB_STATS: 'job_stats',
    UNMATCHED_STATS: 'unmatched_stats',
    MATCHED_POSTER_STATS: 'matched_poster_stats',
    GDRIVE_STATS: 'gdrive_stats',
    PLEX_LIBRARIES: 'plex_libraries',
};

/**
 * Cache management utilities
 */
function getCacheKey(baseKey, params = {}) {
    const paramString =
        Object.keys(params).length > 0
            ? '?' +
              Object.entries(params)
                  .map(([k, v]) => `${k}=${v}`)
                  .join('&')
            : '';
    return `${baseKey}${paramString}`;
}

function isCacheValid(entry) {
    return entry && Date.now() - entry.timestamp < CACHE_TTL;
}

function getFromCache(key) {
    const entry = cache.get(key);
    return isCacheValid(entry) ? entry.data : null;
}

function setCache(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now(),
    });
    return data;
}

function clearCache(pattern = null) {
    if (pattern) {
        // Clear specific pattern
        for (const key of cache.keys()) {
            if (key.includes(pattern)) {
                cache.delete(key);
            }
        }
    } else {
        // Clear all cache
        cache.clear();
    }
}

/**
 * Cacheable wrapper for API calls
 * @param {string} cacheKey - Cache key for this request
 * @param {Function} apiCall - Function that returns a Promise
 * @param {boolean} forceRefresh - Skip cache and force fresh data
 * @returns {Promise} - Cached or fresh API data
 */
async function withCache(cacheKey, apiCall, forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getFromCache(cacheKey);
        if (cached !== null) {
            return cached;
        }
    }

    const result = await apiCall();
    return setCache(cacheKey, result);
}

// ========== HELPER FUNCTIONS ==========

/**
 * Handle standardized API responses
 * @param {Response} res - Fetch response object
 * @returns {Promise<Object>} - Parsed response data
 */
async function handleApiResponse(res) {
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
        const errorMessage = data.message || `API Error (${res.status})`;
        const error = new Error(errorMessage);
        error.code = data.error_code;
        error.status = res.status;
        throw error;
    }

    return data;
}

/**
 * Extract data from standardized API response
 * @param {Object} response - API response object
 * @param {string} field - Optional field to extract from data
 * @returns {*} - Extracted data
 */
function extractData(response, field = null) {
    if (!response.data) return field ? undefined : {};
    return field ? response.data[field] : response.data;
}

// ========== JOB MANAGEMENT FUNCTIONS ==========

// Get details of a specific job by ID (not cached - real-time data)
export async function fetchJobDetail(jobId) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await handleApiResponse(res);
    return extractData(data, 'job');
}

// Retry a failed job (not cached - action)
export async function retryJob(jobId) {
    const res = await fetch(`/api/job/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await handleApiResponse(res);

    // Clear job-related cache after retry
    clearCache('job');

    return {
        success: true,
        message: data.message,
        job_id: extractData(data, 'job_id'),
    };
}

// List jobs with optional filtering (not cached - real-time data)
export async function fetchJobs(status = null, limit = 50) {
    let url = `/api/jobs?limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    const res = await fetch(url);
    const data = await handleApiResponse(res);
    return extractData(data, 'jobs') || [];
}

// Get job statistics (cached)
export async function fetchJobStats(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.JOB_STATS,
        async () => {
            const res = await fetch('/api/jobs/stats');
            const data = await handleApiResponse(res);
            return extractData(data, 'stats') || {};
        },
        forceRefresh
    );
}

// ========== GDRIVE SYNC FUNCTIONS ==========

// Run GDrive sync (not cached - action)
export async function runGDriveAdhocSync(gdrive_names) {
    const qs = gdrive_names.map(n => `gdrive_names=${encodeURIComponent(n)}`).join('&');
    const res = await fetch(`/api/run/gdrive?${qs}`, { method: 'POST' });
    const data = await handleApiResponse(res);

    // Clear relevant cache after sync action
    clearCache('gdrive');

    const responseData = extractData(data);

    // Handle single vs multiple jobs
    if (responseData.job_id) {
        return {
            success: true,
            message: data.message,
            job_id: responseData.job_id,
            name: responseData.name,
        };
    } else if (responseData.jobs) {
        return {
            success: true,
            message: data.message,
            jobs: responseData.jobs,
        };
    }

    throw new Error('Sync started but no job information returned');
}

// Get Gdrive Statistics (cached)
export async function fetchGDriveStats(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.GDRIVE_STATS,
        async () => {
            const res = await fetch('/api/gdrive/stats');
            const data = await handleApiResponse(res);
            return extractData(data, 'gdrive_stats') || [];
        },
        forceRefresh
    );
}

// ========== MEDIA & COLLECTION MANAGEMENT ==========

// Upload a single media cache item by ID (not cached - action)
export async function uploadMediaById(id) {
    if (!id) throw new Error('Missing id for media upload');
    const res = await fetch(`/api/run/upload/media/${id}`, {
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
    const res = await fetch(`/api/run/upload/collection/${id}`, {
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

// Get all media cache entries (not cached - frequently changing data)
export async function fetchMediaCache() {
    const res = await fetch('/api/cache/media');
    const data = await handleApiResponse(res);
    return extractData(data, 'media_cache') || [];
}

// Get all collection cache entries (not cached - frequently changing data)
export async function fetchCollectionCache() {
    const res = await fetch('/api/cache/collection');
    const data = await handleApiResponse(res);
    return extractData(data, 'collection_cache') || [];
}

// Get all plex media cache entries (not cached - frequently changing data)
export async function fetchPlexMediaCache() {
    const res = await fetch('/api/cache/plex');
    const data = await handleApiResponse(res);
    return extractData(data, 'plex_media_cache') || [];
}

// Refresh database caches
export async function refreshMediaDatabase(payload) {
    const res = await fetch('/api/cache/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        job_id: extractData(data, 'job_id'),
        message: data.message,
    };
}

// Delete media cache entry by id (not cached - action)
export async function deleteMediaCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/cache/media/${id}`, {
        method: 'DELETE',
    });
    const data = await handleApiResponse(res);

    // Clear cache after deletion
    clearCache('cache');

    return {
        success: true,
        message: data.message,
        deleted_id: extractData(data, 'deleted_id'),
    };
}

// Delete collection cache entry by id (not cached - action)
export async function deleteCollectionCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/cache/collection/${id}`, {
        method: 'DELETE',
    });
    const data = await handleApiResponse(res);

    // Clear cache after deletion
    clearCache('cache');

    return {
        success: true,
        message: data.message,
        deleted_id: extractData(data, 'deleted_id'),
    };
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
                const res = await fetch(`/api/posters?location=${encodeURIComponent(location)}`);
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

// Poster preview URL (not async, just guard errors)
export function fetchPosterPreviewUrl(location, path) {
    if (!location || !path) {
        return '';
    }
    return `/api/poster/preview?location=${encodeURIComponent(location)}&path=${encodeURIComponent(
        path
    )}`;
}

// ========== PLEX INTEGRATION ==========

// Get Plex libraries (cached per instance)
export async function fetchPlexLibraries(instanceName, forceRefresh = false) {
    const cacheKey = getCacheKey(CACHE_KEYS.PLEX_LIBRARIES, { instance: instanceName });

    return await withCache(
        cacheKey,
        async () => {
            const resp = await fetch(
                `/api/plex/libraries?instance=${encodeURIComponent(instanceName)}`
            );
            const data = await handleApiResponse(resp);
            return extractData(data, 'libraries') || [];
        },
        forceRefresh
    );
}

// ========== CONFIGURATION ==========

// Fetch config (cached per section)
export async function fetchConfig(section = null, forceRefresh = false) {
    const cacheKey = getCacheKey(CACHE_KEYS.CONFIG, section ? { section } : {});

    return await withCache(
        cacheKey,
        async () => {
            let url = '/api/config';
            if (section) url += `?section=${encodeURIComponent(section)}`;

            const res = await fetch(url);
            const data = await handleApiResponse(res);
            return extractData(data);
        },
        forceRefresh
    );
}

// Save config (not cached - action)
export async function postConfig(payload) {
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await handleApiResponse(res);

    // Clear config cache after save
    clearCache(CACHE_KEYS.CONFIG);

    return {
        success: true,
        message: data.message,
        data: extractData(data),
    };
}

// ========== INSTANCES ==========

// Fetch all service instances (cached)
export async function fetchInstances(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.INSTANCES,
        async () => {
            const res = await fetch('/api/instances/');
            const data = await handleApiResponse(res);
            return extractData(data);
        },
        forceRefresh
    );
}

// Test instance (not cached - action)
export async function testInstance(service, entry) {
    if (!service || !entry || !entry.name || !entry.url || !entry.api) {
        return { success: false, message: 'Missing required instance parameters' };
    }

    try {
        const res = await fetch('/api/test-instance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service,
                name: entry.name.trim(),
                url: entry.url.trim(),
                api: entry.api.trim(),
            }),
        });
        const data = await handleApiResponse(res);
        return {
            success: true,
            message: data.message,
            status_code: extractData(data, 'status_code'),
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code,
        };
    }
}

// ========== NOTIFICATIONS ==========

// Send test notification (not cached - action)
export async function runTestNotification(type, data) {
    if (!type || !data) {
        return { ok: false, error: 'Missing type or data' };
    }

    const payload = {
        module: 'notifications',
        notifications: { [type]: data },
    };

    try {
        const res = await fetch('/api/test-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await handleApiResponse(res);
        return {
            ok: true,
            message: responseData.message,
            data: extractData(responseData),
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            error_code: error.code,
        };
    }
}

// ========== MODULE MANAGEMENT ==========

// Fetch all run states (not cached - real-time data)
export async function fetchAllRunStates() {
    const res = await fetch('/api/run_state');
    const data = await handleApiResponse(res);
    const runStates = extractData(data, 'run_states') || [];

    return runStates.reduce((acc, r) => {
        acc[r.module_name] = r;
        return acc;
    }, {});
}

// Module status (not cached - real-time data)
export async function fetchModuleStatus(module) {
    if (!module) return false;

    try {
        const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
        const data = await handleApiResponse(res);
        const moduleData = extractData(data);
        return moduleData.running || false;
    } catch (error) {
        console.error('Failed to check module status:', error);
        return false;
    }
}

// Run module (not cached - action)
export async function runModule(module) {
    if (!module) return { success: false, message: 'Module name required' };

    try {
        const res = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        const data = await handleApiResponse(res);

        // Clear relevant cache after running module
        clearCache('job');
        clearCache('run_state');

        return {
            success: true,
            message: data.message,
            data: extractData(data),
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code,
        };
    }
}

// Cancel scheduled module (not cached - action)
export async function cancelScheduledModule(module) {
    if (!module) return { success: false, message: 'Module name required' };

    try {
        const res = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        const data = await handleApiResponse(res);

        // Clear relevant cache after canceling
        clearCache('job');
        clearCache('run_state');

        return {
            success: true,
            message: data.message,
            data: extractData(data),
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code,
        };
    }
}

// ========== LOGGING ==========

// Get log modules list (cached)
export async function fetchLogModules(forceRefresh = false) {
    return await withCache(
        CACHE_KEYS.LOG_MODULES,
        async () => {
            const res = await fetch('/api/logs');
            const data = await handleApiResponse(res);
            return extractData(data, 'modules') || [];
        },
        forceRefresh
    );
}

// Get log files (cached per module)
export async function fetchLogFiles(moduleName, forceRefresh = false) {
    if (!moduleName) return [];

    const cacheKey = getCacheKey('log_files', { module: moduleName });

    try {
        return await withCache(
            cacheKey,
            async () => {
                const res = await fetch(`/api/logs/${moduleName}`);
                const data = await handleApiResponse(res);
                return extractData(data, 'files') || [];
            },
            forceRefresh
        );
    } catch (error) {
        console.error('Failed to fetch log files:', error);
        return [];
    }
}

// Get log content (not cached - can be large and change frequently)
export async function fetchLogContent(moduleName, fileName) {
    if (!moduleName || !fileName) return '';

    try {
        const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
        if (!res.ok) return '';
        return await res.text();
    } catch (error) {
        console.error('Failed to fetch log content:', error);
        return '';
    }
}

// ========== FILESYSTEM (Legacy endpoints - may need backend implementation) ==========

// Create directory (not cached - action)
export async function createDirectory(path) {
    try {
        const resp = await fetch(`/api/create-folder?path=${encodeURIComponent(path)}`, {
            method: 'POST',
        });
        const data = await handleApiResponse(resp);

        // Clear directory listing cache after creation
        clearCache('directory');

        return {
            success: true,
            message: data.message,
            data: extractData(data),
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to create directory');
    }
}

// Directory listing (cached per path)
export async function fetchDirectoryList(path, forceRefresh = false) {
    if (!path) path = '/';

    const cacheKey = getCacheKey('directory', { path });

    try {
        return await withCache(
            cacheKey,
            async () => {
                const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
                const data = await handleApiResponse(res);
                const dirData = extractData(data);

                return {
                    directories: dirData.directories || [],
                    exists: dirData.exists !== undefined ? dirData.exists : false,
                    writable: dirData.writable !== undefined ? dirData.writable : false,
                    error: undefined,
                };
            },
            forceRefresh
        );
    } catch (error) {
        return {
            directories: [],
            exists: false,
            writable: false,
            error: error.message || 'Failed to load directory list.',
        };
    }
}

// ========== CACHE MANAGEMENT EXPORTS ==========

/**
 * Clear all or specific cache patterns
 * @param {string} pattern - Optional pattern to match cache keys
 */
export function clearApiCache(pattern = null) {
    clearCache(pattern);
}

/**
 * Get cache statistics for debugging
 * @returns {Object} - Cache size and entry info
 */
export function getCacheStats() {
    const entries = [];
    const now = Date.now();

    for (const [key, value] of cache.entries()) {
        entries.push({
            key,
            age: now - value.timestamp,
            valid: isCacheValid(value),
            size: JSON.stringify(value.data).length,
        });
    }

    return {
        totalEntries: cache.size,
        ttl: CACHE_TTL,
        entries,
    };
}

// ========== LABELARR API FUNCTIONS ==========

/**
 * Sync tags from ARR instance to Plex labels
 * @param {Object} payload - Sync request payload
 * @param {string} payload.source_instance - ARR instance name
 * @param {number} payload.media_cache_id - Media cache ID
 * @param {number} [payload.plex_mapping_id] - Optional Plex mapping ID
 * @param {Array<string>} payload.manage_tags - Tags to manage (add/sync) between ARR and Plex
 * @param {Array<string>} payload.tags_to_remove - Tags to remove from Plex
 * @param {string} [payload.plex_instance] - Target Plex instance (default: 'plex_1')
 * @param {boolean} [payload.dry_run] - Whether to perform a dry run (default: false)
 * @returns {Promise<Object>} - Sync response with job_id
 */
export async function syncTagsToMedia(payload) {
    const res = await fetch('/api/labelarr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        job_id: extractData(data, 'job_id'),
        message: data.message,
        data: data.data,
    };
}
