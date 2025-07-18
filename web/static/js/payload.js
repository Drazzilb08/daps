import { SETTINGS_SCHEMA } from './settings/settings_schema.js';
import { fetchConfig } from './api.js';

export function buildNotificationPayload(notifications, entry, module, type) {
    // Defensive: ensure correct args
    if (!notifications || typeof notifications !== 'object')
        return { error: ['Missing notifications object.'] };
    if (!module || !type)
        return { error: ['Missing module or type information for notification payload.'] };
    if (!entry || typeof entry !== 'object')
        return { error: ['No notification settings provided.'] };

    // Shallow copy notifications so we don't mutate upstream reference
    const out = JSON.parse(JSON.stringify(notifications));

    // Set/replace relevant notification
    if (!out[module]) out[module] = {};
    out[module][type] = { ...entry };

    return { notifications: out };
}

export async function buildSchedulePayload(module, time, remove = false) {
    let schedule = {};
    const cfg = await fetchConfig();
    schedule =
        cfg.schedule && typeof cfg.schedule === 'object'
            ? JSON.parse(JSON.stringify(cfg.schedule))
            : {};

    if (remove) {
        delete schedule[module];
    } else {
        schedule[module] = time;
    }
    return { schedule };
}

export async function buildInstancesPayload(instances) {
    return { instances };
}
