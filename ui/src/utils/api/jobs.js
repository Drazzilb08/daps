/**
 * Job Management API Functions
 * Handles job execution, monitoring, and statistics
 */

import { handleApiResponse, extractData, clearCache, withCache, CACHE_KEYS } from './core.js';

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
    const res = await fetch(`/api/jobs/${jobId}/retry`, {
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
