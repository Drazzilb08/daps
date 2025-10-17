import { useState, useEffect } from 'react';
import { logsAPI } from '../utils/api/logs.js';
import { moduleOrder } from '../utils/constants/constants.js';

/**
 * useLogModules - Fetch and order log modules
 *
 * Fetches available log modules on mount and orders them according to
 * the moduleOrder constant, with any additional modules appended.
 *
 * @returns {Object} Module state
 * @property {Array<string>} modules - Ordered module list
 * @property {boolean} loading - Loading state
 * @property {Error|null} error - Error state
 */
export function useLogModules() {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadModules() {
            try {
                setLoading(true);
                setError(null);

                const availableModules = await logsAPI.fetchLogModules();

                if (!isMounted) return;

                // Order modules by moduleOrder constant
                const ordered = (moduleOrder || [])
                    .filter(m => availableModules.includes(m))
                    .concat(availableModules.filter(m => !(moduleOrder || []).includes(m)));

                setModules(ordered);
            } catch (err) {
                if (!isMounted) return;
                console.error('Failed to fetch log modules:', err);
                setError(err);
                setModules([]);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadModules();

        return () => {
            isMounted = false;
        };
    }, []);

    return { modules, loading, error };
}
