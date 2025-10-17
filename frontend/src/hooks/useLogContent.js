import { useState, useEffect, useCallback } from 'react';
import { logsAPI } from '../utils/api/logs.js';

/**
 * useLogContent - Fetch log file content
 *
 * Fetches log content when module and file are selected, and provides
 * a manual refresh function for polling.
 *
 * @param {string} selectedModule - Currently selected module
 * @param {string} selectedLogFile - Currently selected log file
 * @returns {Object} Log content state
 * @property {string} logText - Log file content
 * @property {boolean} loading - Loading state
 * @property {Error|null} error - Error state
 * @property {Function} refresh - Manual refresh function
 */
export function useLogContent(selectedModule, selectedLogFile) {
    const [logText, setLogText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadContent = useCallback(async () => {
        if (!selectedModule || !selectedLogFile) {
            setLogText('');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const content = await logsAPI.fetchLogContent(selectedModule, selectedLogFile);
            setLogText(content);
        } catch (err) {
            console.error('Failed to load log content:', err);
            setError(err);
            setLogText('');
        } finally {
            setLoading(false);
        }
    }, [selectedModule, selectedLogFile]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    // Manual refresh function for polling
    const refresh = useCallback(async () => {
        if (!selectedModule || !selectedLogFile) return;

        try {
            const content = await logsAPI.fetchLogContent(selectedModule, selectedLogFile);
            setLogText(content);
        } catch (err) {
            // Silent failure during polling - don't show toast spam
            console.error('Failed to refresh log content:', err);
        }
    }, [selectedModule, selectedLogFile]);

    return {
        logText,
        loading,
        error,
        refresh,
    };
}
