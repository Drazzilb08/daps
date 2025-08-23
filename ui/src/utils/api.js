/**
 * API utilities with intelligent caching and standardized error handling
 * Provides a comprehensive interface to DAPS backend services
 */

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
 * Generates cache key with optional parameters
 * @param {string} baseKey - Base cache key
 * @param {Object} [params={}] - Optional parameters to include in key
 * @returns {string} Generated cache key
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

/**
 * Checks if cache entry is still valid
 * @param {Object} entry - Cache entry with timestamp
 * @returns {boolean} Whether entry is within TTL
 */
function isCacheValid(entry) {
    return entry && Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Retrieves data from cache if valid
 * @param {string} key - Cache key
 * @returns {*|null} Cached data or null if invalid/missing
 */
function getFromCache(key) {
    const entry = cache.get(key);
    return isCacheValid(entry) ? entry.data : null;
}

/**
 * Stores data in cache with timestamp
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @returns {*} The cached data
 */
function setCache(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now(),
    });
    return data;
}

/**
 * Clears cache entries by pattern or all entries
 * @param {string|null} [pattern=null] - Pattern to match keys, or null for all
 */
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
 * Intelligent cache wrapper for API calls with automatic cache management
 *
 * Provides transparent caching layer that reduces API load and improves performance.
 * Automatically handles cache validation, expiration, and forced refresh scenarios.
 *
 * Cache strategy:
 * - Check cache validity before making API calls
 * - Store results with timestamps for TTL validation
 * - Support forced refresh to bypass cache when needed
 * - Return cached data immediately for valid entries
 *
 * @param {string} cacheKey - Unique identifier for this cache entry
 * @param {Function} apiCall - Async function that performs the actual API request
 * @param {boolean} [forceRefresh=false] - Skip cache validation and fetch fresh data
 * @returns {Promise<*>} Cached data or fresh API response
 *
 * @example
 * // Basic usage with automatic caching
 * const config = await withCache('config', () => fetchConfig());
 *
 * @example
 * // Force refresh to bypass cache
 * const freshConfig = await withCache('config', () => fetchConfig(), true);
 *
 * @example
 * // Parameterized cache key
 * const userPosts = await withCache(
 *   `posts_${userId}`,
 *   () => fetchUserPosts(userId)
 * );
 */
async function withCache(cacheKey, apiCall, forceRefresh = false) {
    // Fast path: return cached data if valid and not forcing refresh
    if (!forceRefresh) {
        const cached = getFromCache(cacheKey);
        if (cached !== null) {
            return cached;
        }
    }

    // Slow path: execute API call and cache result
    const result = await apiCall();
    return setCache(cacheKey, result);
}

// ========== HELPER FUNCTIONS ==========

/**
 * Standardized API response handler with comprehensive error processing
 *
 * Processes all API responses according to DAPS backend conventions,
 * handling both HTTP-level errors and application-level error responses.
 * Provides consistent error information across the application.
 *
 * Response structure expectation:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "data": object,
 *   "error_code": string (optional)
 * }
 *
 * @param {Response} res - Fetch API Response object
 * @returns {Promise<Object>} Parsed JSON response with success validation
 * @throws {Error} Enhanced error with code and status information
 *
 * @example
 * // Successful response handling
 * const response = await fetch('/api/config');
 * const data = await handleApiResponse(response);
 * console.log(data.message, data.data);
 *
 * @example
 * // Error handling with enhanced error info
 * try {
 *   const response = await fetch('/api/invalid-endpoint');
 *   await handleApiResponse(response);
 * } catch (error) {
 *   console.log('Error:', error.message);
 *   console.log('Status:', error.status);
 *   console.log('Code:', error.code);
 * }
 */
async function handleApiResponse(res) {
    // Parse JSON response with fallback for malformed responses
    const data = await res.json().catch(() => ({}));

    // Check for HTTP errors or application-level failures
    if (!res.ok || !data.success) {
        const errorMessage = data.message || `API Error (${res.status})`;
        const error = new Error(errorMessage);

        // Attach additional error context for debugging and handling
        error.code = data.error_code; // Application error code
        error.status = res.status; // HTTP status code

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

/**
 * Fetches details of a specific job by ID
 * @param {string} jobId - Job identifier
 * @returns {Promise<Object>} Job details
 */
export async function fetchJobDetail(jobId) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await handleApiResponse(res);
    return extractData(data, 'job');
}

/**
 * Retries a failed job
 * @param {string} jobId - Job identifier to retry
 * @returns {Promise<Object>} Retry response with new job ID
 */
export async function retryJob(jobId) {
    const res = await fetch(`/api/job/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await handleApiResponse(res);

    clearCache('job');

    return {
        success: true,
        message: data.message,
        job_id: extractData(data, 'job_id'),
    };
}

/**
 * Lists jobs with optional filtering
 * @param {string|null} [status=null] - Filter by job status
 * @param {number} [limit=50] - Maximum number of jobs to return
 * @returns {Promise<Array>} Array of job objects
 */
export async function fetchJobs(status = null, limit = 50) {
    let url = `/api/jobs?limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    const res = await fetch(url);
    const data = await handleApiResponse(res);
    return extractData(data, 'jobs') || [];
}

/**
 * Fetches job statistics with caching
 * @param {boolean} [forceRefresh=false] - Skip cache
 * @returns {Promise<Object>} Job statistics
 */
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
    const res = await fetch(`/api/run/gdrive?${qs}`, { method: 'POST' });
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

/**
 * Test connectivity and authentication for service instances
 *
 * Validates that a service instance (Radarr, Sonarr, Plex, etc.) is properly
 * configured and accessible. Performs connection test and API authentication.
 *
 * @param {string} service - Service type (radarr, sonarr, plex, etc.)
 * @param {Object} entry - Instance configuration object
 * @param {string} entry.name - Display name for the instance
 * @param {string} entry.url - Base URL for the service API
 * @param {string} entry.api - API key or authentication token
 * @returns {Promise<Object>} Test result with success status and details
 * @returns {boolean} success - Whether the test passed
 * @returns {string} message - Detailed status message
 * @returns {number} [status_code] - HTTP response code (on success)
 * @returns {string} [error_code] - Error code (on failure)
 *
 * @example
 * // Test Radarr instance configuration
 * const testResult = await testInstance('radarr', {
 *   name: 'Main Radarr',
 *   url: 'http://localhost:7878',
 *   api: 'your-api-key-here'
 * });
 *
 * if (testResult.success) {
 *   console.log('Connection successful:', testResult.message);
 * } else {
 *   console.error('Connection failed:', testResult.message);
 * }
 *
 * @example
 * // Test with error handling
 * try {
 *   const result = await testInstance('sonarr', instanceConfig);
 *   // Handle result...
 * } catch (error) {
 *   // Network or parsing errors are caught internally
 *   // This shouldn't throw, but defensive coding is good practice
 * }
 */
export async function testInstance(service, entry) {
    // Validate required parameters before making API call
    if (!service || !entry || !entry.name || !entry.url || !entry.api) {
        return {
            success: false,
            message:
                'Missing required instance parameters: service, name, url, and api are all required',
        };
    }

    try {
        const res = await fetch('/api/test-instance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service,
                name: entry.name.trim(), // Clean whitespace from user input
                url: entry.url.trim(), // Clean URL formatting
                api: entry.api.trim(), // Clean API key
            }),
        });
        const data = await handleApiResponse(res);

        return {
            success: true,
            message: data.message,
            status_code: extractData(data, 'status_code'),
        };
    } catch (error) {
        // Convert API errors to standardized response format
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
