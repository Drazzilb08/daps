/**
 * System & Filesystem API Functions
 * Handles directory operations, system information, and filesystem access
 */

import { handleApiResponse, extractData, clearCache, withCache, getCacheKey } from './core.js';

// ========== FILESYSTEM (Legacy endpoints - may need backend implementation) ==========

// Create directory (not cached - action)
export async function createDirectory(path) {
    try {
        const resp = await fetch('/api/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
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
                const res = await fetch(`/api/directory?path=${encodeURIComponent(path)}`);
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
