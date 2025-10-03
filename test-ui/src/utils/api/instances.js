/**
 * DAPS Instances API Module
 *
 * Handles instance management for external services:
 * - Service instance configuration
 * - Connection testing
 * - Instance health monitoring
 * - Service integration management
 */

import { apiCore } from './core.js';

/**
 * Instances API client for external service management
 */
export const instancesAPI = {
    /**
     * Fetch all configured instances
     * @param {Object} options - Request options
     * @param {boolean} options.useCache - Use cached data (default: true)
     * @param {string} options.type - Filter by instance type
     * @returns {Promise<Array>} List of configured instances
     */
    fetchInstances: async (options = {}) => {
        const { type, ...requestOptions } = options;
        const params = type ? `?type=${type}` : '';

        const response = await apiCore.get(`/instances${params}`, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 minutes cache
            ...requestOptions,
        });

        // Extract data from DAPS API response format
        return response.data || response;
    },

    /**
     * Fetch specific instance configuration
     * @param {string} instanceId - Instance identifier
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Instance configuration
     */
    fetchInstance: (instanceId, options = {}) => {
        return apiCore.get(`/instances/${instanceId}`, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000,
            ...options,
        });
    },

    /**
     * Create new instance configuration
     * @param {Object} instanceData - Instance configuration data
     * @param {string} instanceData.name - Instance name
     * @param {string} instanceData.type - Instance type (e.g., 'radarr', 'sonarr')
     * @param {string} instanceData.url - Instance URL
     * @param {string} instanceData.apiKey - Instance API key
     * @param {Object} instanceData.settings - Additional instance settings
     * @returns {Promise<Object>} Created instance
     */
    createInstance: instanceData => {
        return apiCore.post('/instances', instanceData);
    },

    /**
     * Update instance configuration
     * @param {string} instanceId - Instance identifier
     * @param {Object} instanceData - Updated instance data
     * @returns {Promise<Object>} Updated instance
     */
    updateInstance: (instanceId, instanceData) => {
        return apiCore.put(`/instances/${instanceId}`, instanceData);
    },

    /**
     * Delete instance configuration
     * @param {string} instanceId - Instance identifier
     * @param {string} serviceType - Service type (radarr, sonarr, or plex)
     * @returns {Promise<Object>} Deletion response
     */
    deleteInstance: (instanceId, serviceType) => {
        return apiCore.delete(`/instances/${instanceId}?service=${serviceType}`);
    },

    /**
     * Test instance connection
     * @param {string} instanceId - Instance identifier
     * @returns {Promise<Object>} Connection test result
     */
    testConnection: instanceId => {
        return apiCore.post(`/instances/${instanceId}/test`);
    },

    /**
     * Test instance configuration without saving
     * @param {Object} instanceData - Instance configuration to test
     * @returns {Promise<Object>} Connection test result
     */
    testInstanceConfig: instanceData => {
        return apiCore.post('/instances/test', instanceData);
    },

    /**
     * Fetch instance health status
     * @param {string} instanceId - Instance identifier (optional for all instances)
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Health status
     */
    fetchHealthStatus: (instanceId = null, options = {}) => {
        const url = instanceId ? `/instances/${instanceId}/health` : '/instances/health';
        return apiCore.get(url, {
            useCache: false, // Health should be real-time
            ...options,
        });
    },

    /**
     * Fetch instance statistics
     * @param {string} instanceId - Instance identifier
     * @param {Object} options - Statistics options
     * @param {string} options.period - Time period (24h, 7d, 30d)
     * @returns {Promise<Object>} Instance statistics
     */
    fetchStatistics: (instanceId, options = {}) => {
        const params = new URLSearchParams(options);
        const url = params.toString()
            ? `/instances/${instanceId}/stats?${params}`
            : `/instances/${instanceId}/stats`;

        return apiCore.get(url, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000,
        });
    },

    /**
     * Fetch supported instance types
     * @param {Object} options - Request options
     * @returns {Promise<Array>} List of supported instance types
     */
    fetchSupportedTypes: (options = {}) => {
        return apiCore.get('/instances/types', {
            useCache: true,
            cacheTTL: 30 * 60 * 1000, // 30 minutes cache
            ...options,
        });
    },

    /**
     * Fetch instance type schema
     * @param {string} instanceType - Type of instance
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Instance type schema
     */
    fetchTypeSchema: (instanceType, options = {}) => {
        return apiCore.get(`/instances/types/${instanceType}/schema`, {
            useCache: true,
            cacheTTL: 30 * 60 * 1000,
            ...options,
        });
    },

    /**
     * Enable/disable instance
     * @param {string} instanceId - Instance identifier
     * @param {boolean} enabled - Whether to enable the instance
     * @returns {Promise<Object>} Update response
     */
    toggleInstance: (instanceId, enabled) => {
        return apiCore.patch(`/instances/${instanceId}`, { enabled });
    },

    /**
     * Refresh instance data
     * @param {string} instanceId - Instance identifier
     * @returns {Promise<Object>} Refresh response
     */
    refreshInstance: instanceId => {
        return apiCore.post(`/instances/${instanceId}/refresh`);
    },

    /**
     * Fetch instance logs
     * @param {string} instanceId - Instance identifier
     * @param {Object} options - Log options
     * @param {number} options.limit - Maximum log entries
     * @param {string} options.level - Log level filter
     * @param {Date|string} options.since - Logs since date
     * @returns {Promise<Object>} Instance logs
     */
    fetchInstanceLogs: (instanceId, options = {}) => {
        const params = new URLSearchParams();

        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (value instanceof Date) {
                    params.set(key, value.toISOString());
                } else {
                    params.set(key, value.toString());
                }
            }
        });

        const url = params.toString()
            ? `/instances/${instanceId}/logs?${params}`
            : `/instances/${instanceId}/logs`;

        return apiCore.get(url, {
            useCache: false,
        });
    },

    /**
     * Sync instance data
     * @param {string} instanceId - Instance identifier
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync job information
     */
    syncInstance: (instanceId, options = {}) => {
        return apiCore.post(`/instances/${instanceId}/sync`, options);
    },

    /**
     * Fetch Plex libraries for a specific instance
     * @param {string} instanceName - Plex instance name
     * @param {Object} options - Request options
     * @returns {Promise<Array>} List of Plex libraries
     */
    fetchPlexLibraries: (instanceName, options = {}) => {
        return apiCore.get(`/plex/${instanceName}/libraries`, {
            useCache: true,
            cacheTTL: 10 * 60 * 1000, // 10 minutes cache for library data
            ...options,
        });
    },
};
