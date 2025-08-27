/**
 * Service Instance Management API Functions
 * Handles service instance configuration and testing (Radarr, Sonarr, Plex, etc.)
 */

import { handleApiResponse, extractData, withCache, CACHE_KEYS, getCacheKey } from './core.js';

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
        const res = await fetch('/api/instances/test', {
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

// ========== PLEX INTEGRATION ==========

// Get Plex libraries (cached per instance)
export async function fetchPlexLibraries(instanceName, forceRefresh = false) {
    const cacheKey = getCacheKey(CACHE_KEYS.PLEX_LIBRARIES, { instance: instanceName });

    return await withCache(
        cacheKey,
        async () => {
            const resp = await fetch(`/api/plex/${encodeURIComponent(instanceName)}/libraries`);
            const data = await handleApiResponse(resp);
            return extractData(data, 'libraries') || [];
        },
        forceRefresh
    );
}

// Get Plex libraries by instance name (alternative endpoint pattern used by components)
export async function fetchPlexLibrariesByInstance(instanceName, forceRefresh = false) {
    const cacheKey = getCacheKey(CACHE_KEYS.PLEX_LIBRARIES + '_alt', { instance: instanceName });

    return await withCache(
        cacheKey,
        async () => {
            const response = await fetch(
                `/api/plex/libraries?instance=${encodeURIComponent(instanceName)}`
            );
            const data = await handleApiResponse(response);
            return extractData(data, 'libraries') || [];
        },
        forceRefresh
    );
}
