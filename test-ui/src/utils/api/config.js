/**
 * DAPS Configuration API Module
 * 
 * Handles configuration management operations using REAL DAPS endpoints:
 * - GET /api/config - Fetch complete or sectioned configuration
 * - POST /api/config - Update configuration
 */

import { apiCore } from './core.js';

/**
 * Configuration API client matching actual DAPS backend endpoints
 */
export const configAPI = {
  /**
   * Fetch complete configuration or specific section
   * @param {Object} options - Request options
   * @param {string} options.section - Optional section name (e.g., 'instances', 'modules')
   * @param {boolean} options.useCache - Use cached data (default: true)
   * @returns {Promise<Object>} Configuration data
   */
  fetchConfig: (options = {}) => {
    const { section, ...coreOptions } = options;
    const url = section ? `/config?section=${encodeURIComponent(section)}` : '/config';
    
    return apiCore.get(url, {
      useCache: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes cache for config
      ...coreOptions
    });
  },

  /**
   * Update configuration
   * @param {Object} configData - Configuration data to update
   * @returns {Promise<Object>} Update response
   */
  updateConfig: (configData) => {
    return apiCore.post('/config', configData);
  },

  /**
   * Fetch specific configuration section
   * @param {string} section - Section name (e.g., 'instances', 'modules', 'notifications')
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Section configuration data
   */
  fetchSection: (section, options = {}) => {
    return configAPI.fetchConfig({ section, ...options });
  }
};