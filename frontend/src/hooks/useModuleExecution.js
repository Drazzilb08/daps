import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext.jsx';

/**
 * Module execution hook for running and monitoring DAPS modules
 *
 * Features:
 * - Execute modules with loading state management
 * - Real-time status polling for running modules
 * - Automatic polling start/stop based on activity
 * - Toast notifications for all operations
 *
 * @returns {Object} Module execution state and actions
 */
export const useModuleExecution = () => {
    const [runningModules, setRunningModules] = useState(new Set());
    const [runStates, setRunStates] = useState({});
    const [polling, setPolling] = useState(false);

    const toast = useToast();
    const pollingIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    /**
     * Load run states from API
     */
    const loadRunStates = useCallback(async () => {
        try {
            const response = await fetch('/api/modules/run-states');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }

            const data = await response.json();

            if (isMountedRef.current) {
                setRunStates(data?.data || {});
            }
        } catch (error) {
            console.error('Failed to load run states:', error);
        }
    }, []);

    /**
     * Start polling for status updates
     */
    const startPolling = useCallback(() => {
        if (pollingIntervalRef.current) return;

        setPolling(true);
        pollingIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                loadRunStates();
            }
        }, 2000);
    }, [loadRunStates]);

    /**
     * Stop polling
     */
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setPolling(false);
    }, []);

    /**
     * Execute module
     * @param {string} moduleKey - Module key to execute
     */
    const executeModule = useCallback(
        async moduleKey => {
            try {
                setRunningModules(prev => new Set([...prev, moduleKey]));
                startPolling();

                toast.info(`Starting ${moduleKey}...`);

                const response = await fetch('/api/modules/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module: moduleKey }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Response is not JSON');
                }

                const result = await response.json();

                if (result.success) {
                    toast.success(`${moduleKey} completed successfully`);
                    await loadRunStates();
                } else {
                    toast.error(`${moduleKey} failed: ${result.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error(`Failed to run ${moduleKey}:`, error);
                toast.error(`Failed to run ${moduleKey}: ${error.message}`);
            } finally {
                if (isMountedRef.current) {
                    setRunningModules(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(moduleKey);
                        return newSet;
                    });
                }
            }
        },
        [toast, startPolling, loadRunStates]
    );

    // Initial load and cleanup
    useEffect(() => {
        loadRunStates();
        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [loadRunStates, stopPolling]);

    // Auto start/stop polling based on running modules
    useEffect(() => {
        if (runningModules.size > 0) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [runningModules.size, startPolling, stopPolling]);

    return {
        runningModules,
        runStates,
        polling,
        executeModule,
        refreshData: loadRunStates,
        isRunning: moduleKey => runningModules.has(moduleKey),
        getRunState: moduleKey => runStates[moduleKey] || null,
    };
};
