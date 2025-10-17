/**
 * Media & Collection Cache API Functions
 * Handles media cache operations, collection management, and database refresh
 */

import { handleApiResponse, extractData, clearCache } from './core.js';

// ========== MEDIA & COLLECTION MANAGEMENT ==========

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
