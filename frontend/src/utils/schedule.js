/**
 * Schedule Utilities
 * Provides schedule parsing, validation, and human-readable formatting
 */

import cronstrue from 'cronstrue/i18n';
import { isValidCron } from 'cron-validator';

/**
 * Convert schedule string to human-readable format
 * @param {string} schedule - Schedule string from config
 * @returns {string} Human-readable schedule description
 */
export function scheduleToHuman(schedule) {
    if (!schedule || typeof schedule !== 'string') return 'Not scheduled';

    const matchHourly = schedule.match(/^hourly\((\d{1,2})\)$/);
    const matchDaily = schedule.match(/^daily\(([\d:|]+)\)$/);
    const matchWeekly = schedule.match(/^weekly\(([^)]+)\)$/);
    const matchMonthly = schedule.match(/^monthly\(([^)]+)\)$/);
    const matchCron = schedule.match(/^cron\(([^)]*)\)$/);

    if (matchHourly) {
        return `Hourly at minute ${parseInt(matchHourly[1], 10)}`;
    }
    if (matchDaily) {
        const times = matchDaily[1].split('|');
        if (times.length === 1) {
            return `Daily at ${times[0]}`;
        }
        return `Daily at ${times.join(', ')}`;
    }
    if (matchWeekly) {
        const parts = matchWeekly[1].split('|');
        const dayTimes = parts.map(part => {
            const [day, time] = part.split('@');
            return `${day} at ${time}`;
        });
        return `Weekly: ${dayTimes.join(', ')}`;
    }
    if (matchMonthly) {
        const parts = matchMonthly[1].split('|');
        const dayTimes = parts.map(part => {
            const [day, time] = part.split('@');
            return `${day} at ${time}`;
        });
        return `Monthly: ${dayTimes.join(', ')}`;
    }
    if (matchCron) {
        const expr = matchCron[1];
        if (!expr) return 'Custom cron (empty)';
        if (!isValidCron(expr, { seconds: true, allowBlankDay: true })) {
            return 'Invalid cron expression';
        }
        try {
            return `Cron: ${cronstrue.toString(expr)}`;
        } catch {
            return 'Cron: (unparseable)';
        }
    }

    return `Unknown: ${schedule}`;
}

/**
 * Parse schedule string into structured format
 * @param {string} schedule - Schedule string from config
 * @returns {Object|null} Parsed schedule object
 */
export function parseSchedule(schedule) {
    if (!schedule || typeof schedule !== 'string') return null;

    const match = schedule.match(/^(\w+)\(([^)]*)\)$/);
    if (!match) return null;

    const [, frequency, data] = match;

    return {
        frequency,
        data,
        human: scheduleToHuman(schedule),
    };
}

/**
 * Validate schedule string format
 * @param {string} schedule - Schedule string to validate
 * @returns {boolean} True if valid schedule format
 */
export function validateSchedule(schedule) {
    if (!schedule || typeof schedule !== 'string') return false;

    try {
        const match = schedule.match(/^(\w+)\(([^)]*)\)$/);
        if (!match) return false;

        const [, frequency, data] = match;

        switch (frequency) {
            case 'cron':
                return isValidCron(data, { seconds: true, allowBlankDay: true });
            case 'hourly':
                return /^\d{1,2}$/.test(data);
            case 'daily':
                return /^(\d{1,2}:\d{2}(\|\d{1,2}:\d{2})*)$/.test(data);
            case 'weekly':
                return /^([0-6]@\d{1,2}:\d{2}(\|[0-6]@\d{1,2}:\d{2})*)$/.test(data);
            case 'monthly':
                return /^(\d{1,2}@\d{1,2}:\d{2}(\|\d{1,2}@\d{1,2}:\d{2})*)$/.test(data);
            default:
                return false;
        }
    } catch {
        return false;
    }
}
