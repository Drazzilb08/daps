/**
 * DAPS Logs API Module
 * 
 * Handles system logging and monitoring operations:
 * - Log retrieval and filtering
 * - Real-time log streaming
 * - Log level management
 * - System monitoring
 */

import { apiCore } from './core.js';

/**
 * Logs API client for system monitoring
 */
export const logsAPI = {
  /**
   * Fetch system logs
   * @param {Object} filters - Log filters
   * @param {string} filters.level - Log level filter (debug, info, warning, error)
   * @param {string} filters.module - Module name filter
   * @param {string} filters.component - Component filter
   * @param {Date|string} filters.since - Logs since timestamp
   * @param {Date|string} filters.until - Logs until timestamp
   * @param {string} filters.search - Text search in log messages
   * @param {number} filters.limit - Maximum number of entries (default: 100)
   * @param {number} filters.offset - Offset for pagination
   * @param {string} filters.sort - Sort order (asc, desc)
   * @returns {Promise<Object>} Log entries with pagination info
   */
  fetchLogs: (filters = {}) => {
    const params = new URLSearchParams();
    
    // Set default limit
    params.set('limit', filters.limit?.toString() || '100');
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'limit') {
        if (value instanceof Date) {
          params.set(key, value.toISOString());
        } else {
          params.set(key, value.toString());
        }
      }
    });

    return apiCore.get(`/logs?${params}`, {
      useCache: false // Logs should not be cached
    });
  },

  /**
   * Fetch logs for specific module
   * @param {string} moduleName - Module name
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Module-specific logs
   */
  fetchModuleLogs: (moduleName, filters = {}) => {
    const params = new URLSearchParams(filters);
    const url = params.toString() ? `/logs/modules/${moduleName}?${params}` : `/logs/modules/${moduleName}`;
    
    return apiCore.get(url, {
      useCache: false
    });
  },

  /**
   * Fetch logs for specific job
   * @param {string} jobId - Job identifier
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Job-specific logs
   */
  fetchJobLogs: (jobId, filters = {}) => {
    const params = new URLSearchParams(filters);
    const url = params.toString() ? `/logs/jobs/${jobId}?${params}` : `/logs/jobs/${jobId}`;
    
    return apiCore.get(url, {
      useCache: false
    });
  },

  /**
   * Stream logs in real-time (Server-Sent Events)
   * @param {Object} filters - Log filters
   * @param {Function} onMessage - Callback for new log entries
   * @param {Function} onError - Error callback
   * @param {Function} onClose - Connection close callback
   * @returns {Object} Stream control object with close method
   */
  streamLogs: (filters = {}, onMessage, onError, onClose) => {
    const params = new URLSearchParams(filters);
    const url = `/logs/stream?${params}`;
    
    const eventSource = new EventSource(`/api${url}`);
    
    eventSource.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data);
        onMessage?.(logEntry);
      } catch (error) {
        onError?.(new Error(`Failed to parse log entry: ${error.message}`));
      }
    };
    
    eventSource.onerror = (error) => {
      onError?.(error);
    };
    
    eventSource.addEventListener('close', () => {
      eventSource.close();
      onClose?.();
    });

    return {
      close: () => eventSource.close(),
      readyState: () => eventSource.readyState
    };
  },

  /**
   * Clear logs
   * @param {Object} options - Clear options
   * @param {string} options.level - Clear logs of specific level
   * @param {string} options.module - Clear logs for specific module
   * @param {Date|string} options.before - Clear logs before timestamp
   * @param {boolean} options.archive - Archive before clearing
   * @returns {Promise<Object>} Clear operation response
   */
  clearLogs: (options = {}) => {
    return apiCore.delete('/logs', {
      body: JSON.stringify(options)
    });
  },

  /**
   * Export logs
   * @param {Object} options - Export options
   * @param {string} options.format - Export format (json, csv, txt)
   * @param {Object} options.filters - Log filters for export
   * @param {boolean} options.compress - Compress export file
   * @returns {Promise<Object>} Export job information or download URL
   */
  exportLogs: (options = {}) => {
    return apiCore.post('/logs/export', options);
  },

  /**
   * Fetch log statistics
   * @param {Object} options - Statistics options
   * @param {string} options.period - Time period (1h, 24h, 7d, 30d)
   * @param {string} options.groupBy - Group by (level, module, hour, day)
   * @returns {Promise<Object>} Log statistics
   */
  fetchStatistics: (options = {}) => {
    const params = new URLSearchParams(options);
    const url = params.toString() ? `/logs/stats?${params}` : '/logs/stats';
    
    return apiCore.get(url, {
      useCache: true,
      cacheTTL: 2 * 60 * 1000 // 2 minutes cache
    });
  },

  /**
   * Fetch available log levels
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Available log levels
   */
  fetchLogLevels: (options = {}) => {
    return apiCore.get('/logs/levels', {
      useCache: true,
      cacheTTL: 30 * 60 * 1000, // 30 minutes cache
      ...options
    });
  },

  /**
   * Update log level configuration
   * @param {Object} levelConfig - Log level configuration
   * @param {string} levelConfig.global - Global log level
   * @param {Object} levelConfig.modules - Module-specific log levels
   * @returns {Promise<Object>} Update response
   */
  updateLogLevels: (levelConfig) => {
    return apiCore.put('/logs/levels', levelConfig);
  },

  /**
   * Fetch system health from logs
   * @param {Object} options - Health check options
   * @param {string} options.period - Time period to analyze
   * @param {Array} options.components - Specific components to check
   * @returns {Promise<Object>} System health report
   */
  fetchSystemHealth: (options = {}) => {
    const params = new URLSearchParams(options);
    const url = params.toString() ? `/logs/health?${params}` : '/logs/health';
    
    return apiCore.get(url, {
      useCache: true,
      cacheTTL: 1 * 60 * 1000 // 1 minute cache
    });
  },

  /**
   * Search logs with advanced filters
   * @param {Object} searchQuery - Advanced search query
   * @param {string} searchQuery.text - Text search query
   * @param {Array} searchQuery.levels - Log levels to include
   * @param {Array} searchQuery.modules - Modules to include
   * @param {Object} searchQuery.timeRange - Time range {start, end}
   * @param {Object} searchQuery.regex - Regular expression patterns
   * @param {boolean} searchQuery.caseSensitive - Case sensitive search
   * @returns {Promise<Object>} Search results
   */
  searchLogs: (searchQuery = {}) => {
    return apiCore.post('/logs/search', searchQuery);
  },

  /**
   * Create log alert rule
   * @param {Object} alertRule - Alert rule configuration
   * @param {string} alertRule.name - Rule name
   * @param {string} alertRule.condition - Alert condition
   * @param {Array} alertRule.actions - Actions to take when triggered
   * @param {boolean} alertRule.enabled - Whether rule is enabled
   * @returns {Promise<Object>} Created alert rule
   */
  createAlertRule: (alertRule) => {
    return apiCore.post('/logs/alerts', alertRule);
  },

  /**
   * Fetch log alert rules
   * @param {Object} options - Request options
   * @returns {Promise<Array>} List of alert rules
   */
  fetchAlertRules: (options = {}) => {
    return apiCore.get('/logs/alerts', {
      useCache: true,
      cacheTTL: 5 * 60 * 1000,
      ...options
    });
  },

  /**
   * Update log alert rule
   * @param {string} ruleId - Alert rule identifier
   * @param {Object} alertRule - Updated alert rule
   * @returns {Promise<Object>} Updated alert rule
   */
  updateAlertRule: (ruleId, alertRule) => {
    return apiCore.put(`/logs/alerts/${ruleId}`, alertRule);
  },

  /**
   * Delete log alert rule
   * @param {string} ruleId - Alert rule identifier
   * @returns {Promise<Object>} Deletion response
   */
  deleteAlertRule: (ruleId) => {
    return apiCore.delete(`/logs/alerts/${ruleId}`);
  }
};