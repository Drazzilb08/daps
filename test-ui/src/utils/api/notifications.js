/**
 * DAPS Notifications API Module
 *
 * Handles notification configuration management for DAPS modules:
 * - Notification service configuration (Discord, Notifiarr, Email)
 * - Notification testing and validation
 * - Per-module notification settings
 * - Service-specific configuration management
 */

import { apiCore } from './core.js';

/**
 * Notifications API client for notification service management
 */
export const notificationsAPI = {
    /**
     * Fetch all notification configurations for all modules
     * @param {Object} options - Request options
     * @param {boolean} options.useCache - Use cached data (default: true)
     * @returns {Promise<Object>} All notification configurations
     *
     * Response format:
     * {
     *   module_name: {
     *     discord: { bot_name, color, webhook },
     *     notifiarr: { bot_name, color, webhook, channel_id },
     *     email: { smtp_server, smtp_port, use_tls, username, password, to, from }
     *   }
     * }
     */
    fetchNotifications: (options = {}) => {
        return apiCore.get('/notifications', {
            useCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 minutes cache
            ...options,
        });
    },

    /**
     * Fetch notification configurations for a specific module
     * @param {string} moduleId - Module identifier
     * @param {Object} options - Request options
     * @param {boolean} options.useCache - Use cached data (default: true)
     * @returns {Promise<Object>} Module's notification configurations
     *
     * Response format:
     * {
     *   module: "module_name",
     *   notifications: {
     *     discord: { ... },
     *     notifiarr: { ... },
     *     email: { ... }
     *   }
     * }
     */
    fetchModuleNotifications: (moduleId, options = {}) => {
        return apiCore.get(`/notifications/${moduleId}`, {
            useCache: true,
            cacheTTL: 5 * 60 * 1000,
            ...options,
        });
    },

    /**
     * Create or update notification configuration for a module
     * @param {Object} data - Notification configuration data
     * @param {string} data.module - Module name
     * @param {string} data.service_type - Service type ("discord" | "notifiarr" | "email")
     * @param {Object} data.config - Service-specific configuration
     * @returns {Promise<Object>} Updated notification configuration
     *
     * Request body format:
     * {
     *   module: "sync_gdrive",
     *   service_type: "discord",
     *   config: {
     *     bot_name: "My Bot",
     *     color: "#ff7300",
     *     webhook: "https://discord.com/api/webhooks/..."
     *   }
     * }
     *
     * Response format:
     * {
     *   module: "sync_gdrive",
     *   service_type: "discord",
     *   config: { ... }
     * }
     */
    updateNotification: data => {
        return apiCore.post('/notifications', data);
    },

    /**
     * Delete notification service configuration for a module
     * @param {string} moduleId - Module identifier
     * @param {string} serviceType - Service type to delete ("discord" | "notifiarr" | "email")
     * @returns {Promise<Object>} Deletion confirmation
     *
     * Response format:
     * {
     *   module: "module_name",
     *   service_type: "discord"
     * }
     */
    deleteNotification: (moduleId, serviceType) => {
        return apiCore.delete(`/notifications/${moduleId}/${serviceType}`);
    },

    /**
     * Test notification configuration without saving
     * @param {Object} data - Notification test data
     * @param {string} data.module - Module name
     * @param {Object} data.notifications - Notification configurations to test
     * @returns {Promise<Object>} Test result
     *
     * Request body format:
     * {
     *   module: "sync_gdrive",
     *   notifications: {
     *     discord: {
     *       bot_name: "Test Bot",
     *       color: "#ff7300",
     *       webhook: "https://discord.com/api/webhooks/..."
     *     }
     *   }
     * }
     *
     * Response format:
     * {
     *   success: true,
     *   message: "Test notification sent successfully",
     *   results: {
     *     discord: { success: true, message: "..." }
     *   }
     * }
     */
    testNotification: data => {
        return apiCore.post('/notifications/test', data);
    },
};
