import { initSchedule } from './schedule.js';
import { initInstances } from './instances.js';
import { initLogs } from './logs.js';
import { initNotifications } from './notifications.js';
import { initPosterSearch } from './poster_search.js';
import { initSettings } from './settings.js';
import { initStatistics } from './statistics.js';
import { initPosterMgmt } from './poster_management.js';
import { initIndex } from './index.js';

export const PAGE_LOADERS = {
    schedule: initSchedule,
    instances: initInstances,
    logs: initLogs,
    notifications: initNotifications,
    settings: initSettings,
    poster_search: initPosterSearch,
    poster_management: initPosterMgmt,
    statistics: initStatistics,
    index: initIndex,
};

export const PAGE_CSS = {
    settings: 'settings',
    instances: 'instances',
    schedule: 'schedule',
    modals: 'modals',
    logs: 'logs',
    poster_search: 'poster_search',
    notifications: 'notifications',
    poster_management: 'poster_management',
    statistics: 'poster_search',
};
