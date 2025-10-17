import { useEffect, useRef } from 'react';

/**
 * useLogPolling - Auto-refresh log content
 *
 * Polls the refresh callback every 1 second when both module and file
 * are selected. Clears interval on unmount or when selections change.
 *
 * @param {string} selectedModule - Currently selected module
 * @param {string} selectedLogFile - Currently selected log file
 * @param {Function} refreshCallback - Function to call every interval
 * @returns {void}
 */
export function useLogPolling(selectedModule, selectedLogFile, refreshCallback) {
    const intervalRef = useRef(null);

    useEffect(() => {
        // Only poll when both module and file selected
        if (!selectedModule || !selectedLogFile || !refreshCallback) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Clear existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Start polling every 1 second
        intervalRef.current = setInterval(() => {
            refreshCallback();
        }, 1000);

        // Cleanup on unmount or when dependencies change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [selectedModule, selectedLogFile, refreshCallback]);
}
