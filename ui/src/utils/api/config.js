/**
 * Configuration Management API Functions
 * Handles application configuration retrieval and updates
 */

import {
    handleApiResponse,
    extractData,
    clearCache,
    withCache,
    CACHE_KEYS,
    getCacheKey,
} from './core.js';

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
