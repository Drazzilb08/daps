/**
 * Core API utilities with intelligent caching and standardized error handling
 * Shared utilities used across all API domain modules
 */

// ========== CACHING LAYER ==========

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const CACHE_KEYS = {
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
export function getCacheKey(baseKey, params = {}) {
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
export function clearCache(pattern = null) {
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
export async function withCache(cacheKey, apiCall, forceRefresh = false) {
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
export async function handleApiResponse(res) {
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
export function extractData(response, field = null) {
    if (!response.data) return field ? undefined : {};
    return field ? response.data[field] : response.data;
}

// ========== CACHE MANAGEMENT EXPORTS ==========

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
