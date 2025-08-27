/**
 * Module Management API Functions
 * Handles module execution, status monitoring, and cancellation
 */

import { handleApiResponse, extractData, clearCache } from './core.js';

// ========== MODULE MANAGEMENT ==========

// Fetch all run states (not cached - real-time data)
export async function fetchAllRunStates() {
    const res = await fetch('/api/modules/run-states');
    const data = await handleApiResponse(res);
    const runStates = extractData(data, 'run_states') || [];

    return runStates.reduce((acc, r) => {
        acc[r.module_name] = r;
        return acc;
    }, {});
}

// Module status (not cached - real-time data)
export async function fetchModuleStatus(module) {
    if (!module) return false;

    try {
        const res = await fetch(`/api/modules/status?module=${encodeURIComponent(module)}`);
        const data = await handleApiResponse(res);
        const moduleData = extractData(data);
        return moduleData.running || false;
    } catch (error) {
        console.error('Failed to check module status:', error);
        return false;
    }
}

// Run module (not cached - action)
export async function runModule(module) {
    if (!module) return { success: false, message: 'Module name required' };

    try {
        const res = await fetch('/api/modules/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        const data = await handleApiResponse(res);

        // Clear relevant cache after running module
        clearCache('job');
        clearCache('run_state');

        return {
            success: true,
            message: data.message,
            data: extractData(data),
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code,
        };
    }
}

// Cancel scheduled module (not cached - action)
export async function cancelScheduledModule(module) {
    if (!module) return { success: false, message: 'Module name required' };

    try {
        const res = await fetch('/api/modules/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        const data = await handleApiResponse(res);

        // Clear relevant cache after canceling
        clearCache('job');
        clearCache('run_state');

        return {
            success: true,
            message: data.message,
            data: extractData(data),
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code,
        };
    }
}
