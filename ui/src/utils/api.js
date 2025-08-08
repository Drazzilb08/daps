// ========== JOB MANAGEMENT FUNCTIONS ==========

// Get details of a specific job by ID
export async function fetchJobDetail(jobId) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to fetch job');
    return await res.json();
}

// Retry a failed job
export async function retryJob(jobId) {
    const res = await fetch(`/api/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to retry job');
    }
    return await res.json();
}

// ========== GDRIVE SYNC FUNCTIONS ==========

// Run GDrive sync with enhanced error handling and job tracking
export async function runGDriveAdhocSync(gdrive_names) {
    const qs = gdrive_names.map(n => `gdrive_names=${encodeURIComponent(n)}`).join('&');
    const res = await fetch(`/api/run/gdrive?${qs}`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to run GDrive adhoc sync (${res.status})`);
    }
    const result = await res.json();

    // Ensure we have a job_id for tracking
    if (!result.job_id) {
        throw new Error('Sync started but no job ID returned for tracking');
    }

    return result;
}

// Get Gdrive Statistics
export async function fetchGDriveStats() {
    const res = await fetch('/api/gdrive/stats');
    if (!res.ok) throw new Error('Failed to fetch GDrive stats');
    const data = await res.json();
    return data.gdrive_stats || [];
}

// ========== MEDIA & COLLECTION MANAGEMENT ==========

// Upload a single media cache item by ID
export async function uploadMediaById(id) {
    if (!id) throw new Error('Missing id for media upload');
    const res = await fetch(`/api/run/upload/media/${id}`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to upload media');
    return await res.json();
}

// Upload a single collection cache item by ID
export async function uploadCollectionById(id) {
    if (!id) throw new Error('Missing id for collection upload');
    const res = await fetch(`/api/run/upload/collection/${id}`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to upload collection');
    return await res.json();
}

// Get all media cache entries
export async function fetchMediaCache() {
    const res = await fetch('/api/cache/media');
    if (!res.ok) throw new Error('Failed to fetch media cache');
    const data = await res.json();
    return data.media_cache || [];
}

// Get all collection cache entries
export async function fetchCollectionCache() {
    const res = await fetch('/api/cache/collection');
    if (!res.ok) throw new Error('Failed to fetch collection cache');
    const data = await res.json();
    return data.collection_cache || [];
}

// Delete media cache entry by id
export async function deleteMediaCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/cache/media/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete media cache');
    }
    return await res.json();
}

// Delete collection cache entry by id
export async function deleteCollectionCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/cache/collection/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete collection cache');
    }
    return await res.json();
}

// ========== POSTER STATISTICS ==========

// Get unmatched poster statistics
export async function fetchUnmatchedStats() {
    const res = await fetch('/api/posters/unmatched/stats');
    if (!res.ok) throw new Error('Failed to fetch unmatched poster stats');
    const data = await res.json();
    return data.summary || [];
}

// Get matched poster statistics
export async function fetchMatchedPosterStats() {
    const res = await fetch('/api/posters/matched/stats');
    if (!res.ok) throw new Error('Failed to fetch matched poster stats');
    const data = await res.json();
    return data.matched_posters_stats || [];
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
    const res = await fetch(`/api/posters?location=${encodeURIComponent(location)}`);
    if (!res.ok) {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
            message: 'Failed to fetch poster stats.',
        };
    }
    return await res.json();
}

// Get poster asset list
export async function fetchPosterAssetList() {
    const res = await fetch('/api/poster/assets');
    if (!res.ok) throw new Error('Failed to fetch poster asset list');
    const arr = await res.json();
    return Array.isArray(arr) ? arr : [];
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
    if (!resp.ok) {
        const msg = `Failed to fetch Plex libraries (${resp.status})`;
        throw new Error(msg);
    }
    return await resp.json();
}

// ========== CONFIGURATION ==========

// Fetch config
export async function fetchConfig(section = null) {
    let url = '/api/config';
    if (section) url += `?section=${encodeURIComponent(section)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.json();
}

// Save config
export async function postConfig(payload) {
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    return { success: true, data };
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
    const res = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        return { ok: false, error: result.error || 'Error' };
    }
    if (result.results && Array.isArray(result.results)) {
        const okTarget = result.results.find(r => r.ok === true);
        if (okTarget) {
            return { ok: true, message: okTarget.message || 'Test notification sent!' };
        }
        const failTarget = result.results.find(r => r.ok === false);
        if (failTarget) {
            return {
                ok: false,
                error:
                    failTarget.error ||
                    failTarget.message ||
                    result.error ||
                    'Test notification failed.',
            };
        }
    }
    if (result.success) return { ok: true, message: 'Test notification sent!' };
    return { ok: false, error: result.error || 'Test notification failed (unknown error)' };
}

// ========== INSTANCE TESTING ==========

// Test instance (API check)
export async function testInstance(service, entry) {
    if (!service || !entry || !entry.name || !entry.url || !entry.api) {
        return false;
    }
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
    if (!res.ok) return false;
    return true;
}

// ========== MODULE MANAGEMENT ==========

// Fetch all run states (job queue)
export async function fetchAllRunStates() {
    const res = await fetch('/api/run_state');
    if (!res.ok) throw new Error('Failed to fetch run states');
    const data = await res.json();
    return (data.run_states || []).reduce((acc, r) => {
        acc[r.module_name] = r;
        return acc;
    }, {});
}

// Module status (running)
export async function fetchModuleStatus(module) {
    if (!module) return false;
    const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
    if (!res.ok) throw new Error('Failed to check status');
    const data = await res.json();
    return !!data.running;
}

// Run module
export async function runModule(module) {
    if (!module) return false;
    const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module }),
    });
    return res.ok;
}

// Cancel scheduled module
export async function cancelScheduledModule(module) {
    if (!module) return false;
    const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module }),
    });
    return res.ok;
}

// ========== LOGGING ==========

// Get log modules list
export async function fetchLogModules() {
    const res = await fetch('/api/logs');
    if (!res.ok) throw new Error('Failed to fetch log modules');
    return await res.json();
}

// Get log files
export async function fetchLogFiles(moduleName) {
    if (!moduleName) return [];
    const res = await fetch(`/api/logs/${moduleName}`);
    if (!res.ok) return [];
    return await res.json();
}

// Get log content
export async function fetchLogContent(moduleName, fileName) {
    if (!moduleName || !fileName) return '';
    const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
    if (!res.ok) return '';
    return await res.text();
}

// ========== FILESYSTEM ==========

// Create directory
export async function createDirectory(path) {
    const resp = await fetch(`/api/create-folder?path=${encodeURIComponent(path)}`, {
        method: 'POST',
    });
    if (!resp.ok) {
        let err;
        try {
            err = await resp.json();
        } catch {
            err = {};
        }
        throw new Error(err.error || resp.statusText);
    }
    return await resp.json();
}

// Directory listing
export async function fetchDirectoryList(path) {
    if (!path) path = '/';
    const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
    let data;
    try {
        data = await res.json();
    } catch {
        data = { directories: [], exists: false, writable: false, error: 'Invalid response' };
    }
    if (!('directories' in data)) data.directories = [];
    if (!('exists' in data)) data.exists = false;
    if (!('writable' in data)) data.writable = false;
    if (!('error' in data)) data.error = undefined;

    if (!res.ok || data.error) {
        return {
            directories: [],
            exists: false,
            writable: false,
            error: data.error || 'Failed to load directory list.',
        };
    }
    return data;
}
