/**
 * DAPS Modules API Module
 * 
 * Handles module management and execution operations:
 * - List available modules
 * - Execute modules with parameters
 * - Module status monitoring
 * - Module configuration management
 */

import { apiCore } from './core.js';

/**
 * Modules API client for module management and execution
 */
export const modulesAPI = {
  /**
   * Fetch list of available modules
   * @param {Object} options - Request options
   * @param {boolean} options.useCache - Use cached data (default: true)
   * @returns {Promise<Array>} List of available modules
   */
  fetchModules: (options = {}) => {
    return apiCore.get('/modules', {
      useCache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes cache
      ...options
    });
  },

  /**
   * Fetch specific module information
   * @param {string} moduleName - Name of the module
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Module information
   */
  fetchModule: (moduleName, options = {}) => {
    return apiCore.get(`/modules/${moduleName}`, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000,
      ...options
    });
  },

  /**
   * Execute a module
   * @param {string} moduleName - Name of the module to execute
   * @param {Object} parameters - Module execution parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution response with job information
   */
  executeModule: (moduleName, parameters = {}, options = {}) => {
    return apiCore.post(`/modules/${moduleName}/execute`, {
      parameters,
      options
    });
  },

  /**
   * Get module execution status
   * @param {string} moduleName - Name of the module
   * @param {string} jobId - Job ID from execution
   * @returns {Promise<Object>} Execution status
   */
  getExecutionStatus: (moduleName, jobId) => {
    return apiCore.get(`/modules/${moduleName}/status/${jobId}`);
  },

  /**
   * Cancel module execution
   * @param {string} moduleName - Name of the module
   * @param {string} jobId - Job ID to cancel
   * @returns {Promise<Object>} Cancellation response
   */
  cancelExecution: (moduleName, jobId) => {
    return apiCore.delete(`/modules/${moduleName}/execution/${jobId}`);
  },

  /**
   * Fetch module configuration schema
   * @param {string} moduleName - Name of the module
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Module configuration schema
   */
  fetchModuleSchema: (moduleName, options = {}) => {
    return apiCore.get(`/modules/${moduleName}/schema`, {
      useCache: true,
      cacheTTL: 15 * 60 * 1000, // 15 minutes cache for schemas
      ...options
    });
  },

  /**
   * Update module configuration
   * @param {string} moduleName - Name of the module
   * @param {Object} configuration - Module configuration
   * @returns {Promise<Object>} Update response
   */
  updateModuleConfig: (moduleName, configuration) => {
    return apiCore.put(`/modules/${moduleName}/config`, configuration);
  },

  /**
   * Enable/disable a module
   * @param {string} moduleName - Name of the module
   * @param {boolean} enabled - Whether to enable the module
   * @returns {Promise<Object>} Update response
   */
  toggleModule: (moduleName, enabled) => {
    return apiCore.patch(`/modules/${moduleName}`, { enabled });
  },

  /**
   * Fetch module execution history
   * @param {string} moduleName - Name of the module (optional)
   * @param {Object} filters - History filters
   * @param {number} filters.limit - Maximum number of records
   * @param {number} filters.offset - Record offset for pagination
   * @param {string} filters.status - Filter by execution status
   * @returns {Promise<Object>} Execution history
   */
  fetchExecutionHistory: (moduleName = null, filters = {}) => {
    const basePath = moduleName ? `/modules/${moduleName}/history` : '/modules/history';
    const params = new URLSearchParams(filters);
    const url = params.toString() ? `${basePath}?${params}` : basePath;
    
    return apiCore.get(url, {
      useCache: false // History should not be cached
    });
  },

  /**
   * Fetch module statistics
   * @param {string} moduleName - Name of the module (optional for all modules)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Module statistics
   */
  fetchStatistics: (moduleName = null, options = {}) => {
    const url = moduleName ? `/modules/${moduleName}/stats` : '/modules/stats';
    return apiCore.get(url, {
      useCache: true,
      cacheTTL: 2 * 60 * 1000, // 2 minutes cache
      ...options
    });
  },

  /**
   * Test module connectivity/health
   * @param {string} moduleName - Name of the module
   * @returns {Promise<Object>} Health check response
   */
  testModule: (moduleName) => {
    return apiCore.post(`/modules/${moduleName}/test`);
  }
};