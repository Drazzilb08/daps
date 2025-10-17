/**
 * DAPS API Layer - Main Export Module
 *
 * Centralized API client exports for the DAPS test-ui application.
 * Provides organized access to all domain-specific API modules.
 */

// Core API functionality
import { apiCore, APIError } from './core.js';
import { configAPI } from './config.js';
import { modulesAPI } from './modules.js';
import { jobsAPI } from './jobs.js';
import { instancesAPI } from './instances.js';
import { mediaAPI } from './media.js';
import { postersAPI } from './posters.js';
import { logsAPI } from './logs.js';
import { systemAPI } from './system.js';
import { scheduleAPI } from './schedule.js';
import { notificationsAPI } from './notifications.js';

// Re-export everything
export { apiCore, APIError };
export { configAPI };
export { modulesAPI };
export { jobsAPI };
export { instancesAPI };
export { mediaAPI };
export { postersAPI };
export { logsAPI };
export { systemAPI };
export { scheduleAPI };
export { notificationsAPI };

/**
 * Consolidated API client for convenience
 * All domain APIs accessible through a single object
 */
export const api = {
    core: apiCore,
    config: configAPI,
    modules: modulesAPI,
    jobs: jobsAPI,
    instances: instancesAPI,
    media: mediaAPI,
    posters: postersAPI,
    logs: logsAPI,
    system: systemAPI,
    schedule: scheduleAPI,
    notifications: notificationsAPI,
};

/**
 * Common API response types for TypeScript-like documentation
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} message - Human-readable response message
 * @property {*} data - Response data payload
 * @property {string} [error_code] - Error code for failed requests
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} message - Human-readable response message
 * @property {Array} data - Array of data items
 * @property {Object} pagination - Pagination information
 * @property {number} pagination.total - Total number of items
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {boolean} pagination.hasNext - Whether there are more pages
 * @property {boolean} pagination.hasPrev - Whether there are previous pages
 */

/**
 * @typedef {Object} JobResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} message - Human-readable response message
 * @property {Object} data - Job information
 * @property {string} data.jobId - Unique job identifier
 * @property {string} data.status - Job status (pending, running, completed, failed)
 * @property {string} data.module - Module that created the job
 * @property {string} data.origin - Job origin (web, cli, scheduled)
 */

export default api;
