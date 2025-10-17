/**
 * DAPS Schedule API Module
 *
 * Handles module scheduling configuration:
 * - Schedule retrieval for all modules
 * - Individual module schedule management
 * - Schedule creation and updates
 * - Schedule deletion
 */

import { apiCore } from './core.js';

/**
 * Schedule API client for module scheduling management
 */
export const scheduleAPI = {
    /**
     * Fetch all module schedules
     * @param {Object} options - Request options
     * @param {boolean} options.useCache - Use cached data (default: true)
     * @returns {Promise<Object>} Schedule configuration for all modules
     */
    fetchSchedules: (options = {}) => {
        return apiCore.get('/schedule', {
            useCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 minutes cache
            ...options,
        });
    },

    /**
     * Fetch specific module schedule
     * @param {string} moduleId - Module identifier
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Module schedule configuration
     */
    fetchSchedule: (moduleId, options = {}) => {
        return apiCore.get(`/schedule/${moduleId}`, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000,
            ...options,
        });
    },

    /**
     * Create or update module schedule
     * @param {Object} data - Schedule data
     * @param {string} data.module - Module name
     * @param {string} data.schedule - Schedule string (e.g., "daily(02:00)")
     * @returns {Promise<Object>} Update response
     */
    updateSchedule: data => {
        return apiCore.post('/schedule', data);
    },

    /**
     * Delete module schedule
     * @param {string} moduleId - Module identifier
     * @returns {Promise<Object>} Deletion response
     */
    deleteSchedule: moduleId => {
        return apiCore.delete(`/schedule/${moduleId}`);
    },
};
