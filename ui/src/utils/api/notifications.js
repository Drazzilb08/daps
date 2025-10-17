/**
 * Notifications API Functions
 * Handles notification testing and configuration validation
 */

import { handleApiResponse, extractData } from './core.js';

// ========== NOTIFICATIONS ==========

// Send test notification (not cached - action)
export async function runTestNotification(type, data) {
    if (!type || !data) {
        return { ok: false, error: 'Missing type or data' };
    }

    const payload = {
        module: 'notifications',
        notifications: { [type]: data },
    };

    try {
        const res = await fetch('/api/notifications/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await handleApiResponse(res);
        return {
            ok: true,
            message: responseData.message,
            data: extractData(responseData),
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            error_code: error.code,
        };
    }
}
