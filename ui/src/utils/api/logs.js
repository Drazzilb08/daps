/**
 * Logging API Functions
 * Handles log file access, content retrieval, and external log sharing
 */

import { handleApiResponse, extractData, withCache, CACHE_KEYS, getCacheKey } from './core.js';

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

// Get log download URL
export function getLogDownloadUrl(moduleName, fileName) {
    if (!moduleName || !fileName) return '';
    return `/api/logs/${moduleName}/${fileName}`;
}

// Upload log content to external dpaste service
export async function uploadLogToPaste(logContent) {
    if (!logContent) {
        throw new Error('No log content provided');
    }

    const response = await fetch('https://dpaste.com/api/v2/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            content: logContent,
            syntax: 'text',
            expiry_days: '1',
        }),
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }

    const responseText = await response.text();

    // dpaste returns the URL as plain text
    return {
        success: true,
        url: responseText.trim(),
        message: 'Log uploaded successfully',
    };
}
