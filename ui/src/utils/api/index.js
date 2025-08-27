/**
 * DAPS API Layer - Centralized Backend Communication
 *
 * This module provides a comprehensive, organized API layer for communicating
 * with the DAPS backend services. All API calls are centralized here to ensure
 * consistency, proper caching, and maintainability.
 *
 * Architecture:
 * - Domain-specific modules for logical organization
 * - Shared core utilities for caching and error handling
 * - Backward-compatible exports maintain existing imports
 * - Professional caching strategies with intelligent invalidation
 * - Consistent error handling across all endpoints
 *
 * Usage:
 * import { fetchJobs, fetchConfig, uploadMediaById } from '../utils/api';
 */

// ========== CORE UTILITIES ==========
export { clearCache as clearApiCache, getCacheStats } from './core.js';

// ========== JOB MANAGEMENT ==========
export { fetchJobDetail, retryJob, fetchJobs, fetchJobStats } from './jobs.js';

// ========== POSTER & GDRIVE OPERATIONS ==========
export {
    runGDriveAdhocSync,
    fetchGDriveStats,
    fetchUnmatchedStats,
    fetchMatchedPosterStats,
    fetchPosters,
    fetchPosterFileList,
    uploadMediaById,
    uploadCollectionById,
    fetchPosterPreviewUrl,
    getPosterPreviewUrl,
    getPosterPreviewUrlByPath,
} from './posters.js';

// ========== MEDIA & COLLECTION CACHE ==========
export {
    fetchMediaCache,
    fetchCollectionCache,
    fetchPlexMediaCache,
    refreshMediaDatabase,
    deleteMediaCacheById,
    deleteCollectionCacheById,
} from './media.js';

// ========== CONFIGURATION MANAGEMENT ==========
export { fetchConfig, postConfig } from './config.js';

// ========== SERVICE INSTANCES ==========
export {
    fetchInstances,
    testInstance,
    fetchPlexLibraries,
    fetchPlexLibrariesByInstance,
} from './instances.js';

// ========== LOGGING ==========
export {
    fetchLogModules,
    fetchLogFiles,
    fetchLogContent,
    getLogDownloadUrl,
    uploadLogToPaste,
} from './logs.js';

// ========== MODULE EXECUTION ==========
export {
    fetchAllRunStates,
    fetchModuleStatus,
    runModule,
    cancelScheduledModule,
} from './modules.js';

// ========== NOTIFICATIONS ==========
export { runTestNotification } from './notifications.js';

// ========== SYSTEM & FILESYSTEM ==========
export { createDirectory, fetchDirectoryList } from './system.js';

// ========== LABELARR TAG SYNC ==========
export { syncTagsToMedia } from './labelarr.js';
