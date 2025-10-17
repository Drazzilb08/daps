/**
 * DAPS Logs API Module
 *
 * Handles log file access, content retrieval, and external log sharing:
 * - Log module listing
 * - Log file retrieval for specific modules
 * - Log content fetching
 * - Log download URLs
 * - External log upload (dpaste)
 */

import { apiCore } from './core.js';

/**
 * Logs API client for file-based log viewing
 */
export const logsAPI = {
    /**
     * Fetch available log modules
     * @param {boolean} forceRefresh - Bypass cache if true
     * @returns {Promise<Array<string>>} List of module names
     */
    fetchLogModules: async (forceRefresh = false) => {
        const response = await apiCore.get('/logs', {
            useCache: !forceRefresh,
            cacheTTL: 5 * 60 * 1000, // 5 minutes
        });
        return response.data?.modules || [];
    },

    /**
     * Fetch log files for specific module
     * @param {string} moduleName - Module name
     * @param {boolean} forceRefresh - Bypass cache if true
     * @returns {Promise<Array<string>>} List of log file names
     */
    fetchLogFiles: async (moduleName, forceRefresh = false) => {
        if (!moduleName) return [];

        try {
            const response = await apiCore.get(`/logs/${moduleName}`, {
                useCache: !forceRefresh,
                cacheTTL: 5 * 60 * 1000, // 5 minutes
            });
            return response.data?.files || [];
        } catch (error) {
            console.error('Failed to fetch log files:', error);
            return [];
        }
    },

    /**
     * Fetch log file content
     * @param {string} moduleName - Module name
     * @param {string} fileName - Log file name
     * @returns {Promise<string>} Log file content as text
     */
    fetchLogContent: async (moduleName, fileName) => {
        if (!moduleName || !fileName) return '';

        try {
            // Direct fetch for text content (not using apiCore which expects JSON)
            const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
            if (!res.ok) return '';
            return await res.text();
        } catch (error) {
            console.error('Failed to fetch log content:', error);
            return '';
        }
    },

    /**
     * Get log download URL
     * @param {string} moduleName - Module name
     * @param {string} fileName - Log file name
     * @returns {string} Download URL for log file
     */
    getLogDownloadUrl: (moduleName, fileName) => {
        if (!moduleName || !fileName) return '';
        return `/api/logs/${moduleName}/${fileName}`;
    },

    /**
     * Upload log content to external dpaste service
     * @param {string} logContent - Log content to upload
     * @returns {Promise<Object>} Upload result with URL
     * @throws {Error} If upload fails
     */
    uploadLogToPaste: async logContent => {
        if (!logContent) {
            throw new Error('No log content provided');
        }

        const response = await fetch('https://dpaste.com/api/v2/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                content: logContent,
                syntax: 'text',
                expiry_days: '1',
            }),
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        const responseText = await response.text();

        // dpaste returns the URL as plain text
        return {
            success: true,
            url: responseText.trim(),
            message: 'Log uploaded successfully',
        };
    },
};
