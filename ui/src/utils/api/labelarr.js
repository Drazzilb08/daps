/**
 * Labelarr API Functions
 * Handles tag synchronization between ARR instances and Plex
 */

import { handleApiResponse, extractData } from './core.js';

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
