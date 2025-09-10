/**
 * DAPS System API Module
 * 
 * Handles system-level operations using REAL DAPS endpoints:
 * - GET /api/version - Application version
 * - GET /api/directory - Directory listing
 * - POST /api/test - Test endpoint
 * - POST /api/folder - Create directory
 */

import { apiCore } from './core.js';

/**
 * System API client matching actual DAPS backend endpoints
 */
export const systemAPI = {
  /**
   * Get application version
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Version information
   */
  getVersion: (options = {}) => {
    return apiCore.get('/version', {
      useCache: true,
      cacheTTL: 60 * 60 * 1000, // 1 hour cache for version
      ...options
    });
  },

  /**
   * List directory contents
   * @param {string} path - Directory path to list
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Directory listing
   */
  listDirectory: (path, options = {}) => {
    return apiCore.get(`/directory?path=${encodeURIComponent(path)}`, {
      useCache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes cache for directories
      ...options
    });
  },

  /**
   * Test endpoint for API validation
   * @param {Object} testData - Test data to send
   * @param {Object} options - Request options  
   * @returns {Promise<Object>} Test response
   */
  test: (testData = {}, options = {}) => {
    return apiCore.post('/test', {
      message: 'test',
      data: null,
      ...testData
    }, options);
  },

  /**
   * Create directory
   * @param {string} path - Directory path to create
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Creation response
   */
  createDirectory: (path, options = {}) => {
    return apiCore.post('/folder', { path }, options);
  }
};