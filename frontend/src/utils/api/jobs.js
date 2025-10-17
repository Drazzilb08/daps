/**
 * DAPS Jobs API Module
 *
 * Handles job queue operations using REAL DAPS endpoints:
 * - GET /api/jobs - List jobs with filtering
 * - GET /api/jobs/stats - Job statistics
 * - GET /api/jobs/{id} - Get specific job details
 * - POST /api/jobs/{id}/retry - Retry failed job
 */

import { apiCore } from './core.js';

/**
 * Jobs API client matching actual DAPS backend endpoints
 */
export const jobsAPI = {
    /**
     * Get job statistics
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Job statistics
     */
    getStats: (options = {}) => {
        return apiCore.get('/jobs/stats', {
            useCache: true,
            cacheTTL: 30 * 1000, // 30 seconds cache for stats
            ...options,
        });
    },

    /**
     * List jobs with optional filtering
     * @param {Object} filters - Job filters
     * @param {string} filters.status - Filter by status
     * @param {number} filters.limit - Limit number of results
     * @param {Object} options - Request options
     * @returns {Promise<Object>} List of jobs
     */
    listJobs: (filters = {}, options = {}) => {
        const params = new URLSearchParams();

        if (filters.status) {
            params.append('status', filters.status);
        }
        if (filters.limit) {
            params.append('limit', filters.limit.toString());
        }

        const url = params.toString() ? `/jobs?${params.toString()}` : '/jobs';

        return apiCore.get(url, {
            useCache: true,
            cacheTTL: 10 * 1000, // 10 seconds cache for job lists
            ...options,
        });
    },

    /**
     * Get specific job details
     * @param {number} jobId - Job ID
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Job details
     */
    getJob: (jobId, options = {}) => {
        return apiCore.get(`/jobs/${jobId}`, {
            useCache: true,
            cacheTTL: 5 * 1000, // 5 seconds cache for job details
            ...options,
        });
    },

    /**
     * Retry failed job
     * @param {number} jobId - Job ID to retry
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Retry response
     */
    retryJob: (jobId, options = {}) => {
        return apiCore.post(`/jobs/${jobId}/retry`, {}, options);
    },
};
