// ========== HELPER FUNCTIONS ==========

/**
 * Handle standardized API responses
 * @param {Response} res - Fetch response object
 * @returns {Promise<Object>} - Parsed response data
 */
async function handleApiResponse(res) {
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok || !data.success) {
        const errorMessage = data.message || `API Error (${res.status})`;
        const error = new Error(errorMessage);
        error.code = data.error_code;
        error.status = res.status;
        throw error;
    }
    
    return data;
}

/**
 * Extract data from standardized API response
 * @param {Object} response - API response object
 * @param {string} field - Optional field to extract from data
 * @returns {*} - Extracted data
 */
function extractData(response, field = null) {
    if (!response.data) return field ? undefined : {};
    return field ? response.data[field] : response.data;
}

// ========== JOB MANAGEMENT FUNCTIONS ==========

// Get details of a specific job by ID
export async function fetchJobDetail(jobId) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await handleApiResponse(res);
    return extractData(data, 'job');
}

// Retry a failed job
export async function retryJob(jobId) {
    const res = await fetch(`/api/job/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        message: data.message,
        job_id: extractData(data, 'job_id')
    };
}

// List jobs with optional filtering
export async function fetchJobs(status = null, limit = 50) {
    let url = `/api/jobs?limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    
    const res = await fetch(url);
    const data = await handleApiResponse(res);
    return extractData(data, 'jobs') || [];
}

// Get job statistics
export async function fetchJobStats() {
    const res = await fetch('/api/jobs/stats');
    const data = await handleApiResponse(res);
    return extractData(data, 'stats') || {};
}

// ========== GDRIVE SYNC FUNCTIONS ==========

// Run GDrive sync with enhanced error handling and job tracking
export async function runGDriveAdhocSync(gdrive_names) {
    const qs = gdrive_names.map(n => `gdrive_names=${encodeURIComponent(n)}`).join('&');
    const res = await fetch(`/api/run/gdrive?${qs}`, { method: 'POST' });
    const data = await handleApiResponse(res);
    
    const responseData = extractData(data);
    
    // Handle single vs multiple jobs
    if (responseData.job_id) {
        return {
            success: true,
            message: data.message,
            job_id: responseData.job_id,
            name: responseData.name
        };
    } else if (responseData.jobs) {
        return {
            success: true,
            message: data.message,
            jobs: responseData.jobs
        };
    }
    
    throw new Error('Sync started but no job information returned');
}

// Get Gdrive Statistics
export async function fetchGDriveStats() {
    const res = await fetch('/api/gdrive/stats');
    const data = await handleApiResponse(res);
    return extractData(data, 'gdrive_stats') || [];
}

// ========== MEDIA & COLLECTION MANAGEMENT ==========

// Upload a single media cache item by ID
export async function uploadMediaById(id) {
    if (!id) throw new Error('Missing id for media upload');
    const res = await fetch(`/api/run/upload/media/${id}`, {
        method: 'POST',
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        message: data.message,
        data: extractData(data)
    };
}

// Upload a single collection cache item by ID
export async function uploadCollectionById(id) {
    if (!id) throw new Error('Missing id for collection upload');
    const res = await fetch(`/api/run/upload/collection/${id}`, {
        method: 'POST',
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        message: data.message,
        data: extractData(data)
    };
}

// Get all media cache entries
export async function fetchMediaCache() {
    const res = await fetch('/api/cache/media');
    const data = await handleApiResponse(res);
    return extractData(data, 'media_cache') || [];
}

// Get all collection cache entries
export async function fetchCollectionCache() {
    const res = await fetch('/api/cache/collection');
    const data = await handleApiResponse(res);
    return extractData(data, 'collection_cache') || [];
}

// Delete media cache entry by id
export async function deleteMediaCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/cache/media/${id}`, {
        method: 'DELETE',
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        message: data.message,
        deleted_id: extractData(data, 'deleted_id')
    };
}

// Delete collection cache entry by id
export async function deleteCollectionCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/cache/collection/${id}`, {
        method: 'DELETE',
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        message: data.message,
        deleted_id: extractData(data, 'deleted_id')
    };
}

// ========== POSTER STATISTICS ==========

// Get unmatched poster statistics
export async function fetchUnmatchedStats() {
    const res = await fetch('/api/posters/unmatched/stats');
    const data = await handleApiResponse(res);
    return extractData(data, 'summary') || {};
}

// Get matched poster statistics
export async function fetchMatchedPosterStats() {
    const res = await fetch('/api/posters/matched/stats');
    const data = await handleApiResponse(res);
    return extractData(data, 'matched_posters_stats') || [];
}

// Get poster/folder stats
export async function fetchPosters(location) {
    if (!location) {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
            message: 'Missing location for stats fetch.',
        };
    }
    
    try {
        const res = await fetch(`/api/posters?location=${encodeURIComponent(location)}`);
        const data = await handleApiResponse(res);
        const posterData = extractData(data);
        
        return {
            error: false,
            file_count: posterData.file_count || 0,
            size_bytes: posterData.size_bytes || 0,
            files: posterData.files || [],
            message: data.message
        };
    } catch (error) {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
            message: error.message || 'Failed to fetch poster stats.',
        };
    }
}

// Get poster asset list
export async function fetchPosterAssetList() {
    const res = await fetch('/api/poster/assets');
    const data = await handleApiResponse(res);
    const files = extractData(data, 'files');
    return Array.isArray(files) ? files : [];
}

// Poster preview URL (not async, just guard errors)
export function fetchPosterPreviewUrl(location, path) {
    if (!location || !path) {
        return '';
    }
    return `/api/poster/preview?location=${encodeURIComponent(location)}&path=${encodeURIComponent(
        path
    )}`;
}

// ========== PLEX INTEGRATION ==========

// Get Plex libraries
export async function fetchPlexLibraries(instanceName) {
    const resp = await fetch(`/api/plex/libraries?instance=${encodeURIComponent(instanceName)}`);
    const data = await handleApiResponse(resp);
    return extractData(data, 'libraries') || [];
}

// ========== CONFIGURATION ==========

// Fetch config
export async function fetchConfig(section = null) {
    let url = '/api/config';
    if (section) url += `?section=${encodeURIComponent(section)}`;
    
    const res = await fetch(url);
    const data = await handleApiResponse(res);
    return extractData(data);
}

// Save config
export async function postConfig(payload) {
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await handleApiResponse(res);
    return {
        success: true,
        message: data.message,
        data: extractData(data)
    };
}

// ========== INSTANCES ==========

// Fetch all service instances
export async function fetchInstances() {
    const res = await fetch('/api/instances/');
    const data = await handleApiResponse(res);
    return extractData(data);
}

// Test instance (API check)
export async function testInstance(service, entry) {
    if (!service || !entry || !entry.name || !entry.url || !entry.api) {
        return { success: false, message: 'Missing required instance parameters' };
    }
    
    try {
        const res = await fetch('/api/test-instance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service,
                name: entry.name.trim(),
                url: entry.url.trim(),
                api: entry.api.trim(),
            }),
        });
        const data = await handleApiResponse(res);
        return {
            success: true,
            message: data.message,
            status_code: extractData(data, 'status_code')
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code
        };
    }
}

// ========== NOTIFICATIONS ==========

// Send test notification
export async function runTestNotification(type, data) {
    if (!type || !data) {
        return { ok: false, error: 'Missing type or data' };
    }
    
    const payload = {
        module: 'notifications',
        notifications: { [type]: data },
    };
    
    try {
        const res = await fetch('/api/test-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await handleApiResponse(res);
        return {
            ok: true,
            message: responseData.message,
            data: extractData(responseData)
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message,
            error_code: error.code
        };
    }
}

// ========== MODULE MANAGEMENT ==========

// Fetch all run states (job queue)
export async function fetchAllRunStates() {
    const res = await fetch('/api/run_state');
    const data = await handleApiResponse(res);
    const runStates = extractData(data, 'run_states') || [];
    
    return runStates.reduce((acc, r) => {
        acc[r.module_name] = r;
        return acc;
    }, {});
}

// Module status (running)
export async function fetchModuleStatus(module) {
    if (!module) return false;
    
    try {
        const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
        const data = await handleApiResponse(res);
        const moduleData = extractData(data);
        return moduleData.running || false;
    } catch (error) {
        console.error('Failed to check module status:', error);
        return false;
    }
}

// Run module
export async function runModule(module) {
    if (!module) return { success: false, message: 'Module name required' };
    
    try {
        const res = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        const data = await handleApiResponse(res);
        return {
            success: true,
            message: data.message,
            data: extractData(data)
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code
        };
    }
}

// Cancel scheduled module
export async function cancelScheduledModule(module) {
    if (!module) return { success: false, message: 'Module name required' };
    
    try {
        const res = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        const data = await handleApiResponse(res);
        return {
            success: true,
            message: data.message,
            data: extractData(data)
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            error_code: error.code
        };
    }
}

// ========== LOGGING ==========

// Get log modules list
export async function fetchLogModules() {
    const res = await fetch('/api/logs');
    const data = await handleApiResponse(res);
    return extractData(data, 'modules') || [];
}

// Get log files
export async function fetchLogFiles(moduleName) {
    if (!moduleName) return [];
    
    try {
        const res = await fetch(`/api/logs/${moduleName}`);
        const data = await handleApiResponse(res);
        return extractData(data, 'files') || [];
    } catch (error) {
        console.error('Failed to fetch log files:', error);
        return [];
    }
}

// Get log content
export async function fetchLogContent(moduleName, fileName) {
    if (!moduleName || !fileName) return '';
    
    try {
        const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
        if (!res.ok) return '';
        return await res.text();
    } catch (error) {
        console.error('Failed to fetch log content:', error);
        return '';
    }
}

// ========== FILESYSTEM (Legacy endpoints - may need backend implementation) ==========

// Create directory
export async function createDirectory(path) {
    try {
        const resp = await fetch(`/api/create-folder?path=${encodeURIComponent(path)}`, {
            method: 'POST',
        });
        const data = await handleApiResponse(resp);
        return {
            success: true,
            message: data.message,
            data: extractData(data)
        };
    } catch (error) {
        throw new Error(error.message || 'Failed to create directory');
    }
}

// Directory listing
export async function fetchDirectoryList(path) {
    if (!path) path = '/';
    
    try {
        const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
        const data = await handleApiResponse(res);
        const dirData = extractData(data);
        
        return {
            directories: dirData.directories || [],
            exists: dirData.exists !== undefined ? dirData.exists : false,
            writable: dirData.writable !== undefined ? dirData.writable : false,
            error: undefined
        };
    } catch (error) {
        return {
            directories: [],
            exists: false,
            writable: false,
            error: error.message || 'Failed to load directory list.'
        };
    }
}