// utils/api.js

export async function fetchJobDetail(jobId) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to fetch job');
    return await res.json();
}

// Add at bottom of file
export async function runGDriveAdhocSync(gdrive_names) {
    const qs = gdrive_names.map(n => `gdrive_names=${encodeURIComponent(n)}`).join('&');
    const res = await fetch(`/api/gdrive-folder?${qs}`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to run GDrive adhoc sync');
    }
    return await res.json();
}

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

// --- Get all media cache entries ---
export async function fetchMediaCache() {
    const res = await fetch('/api/get-media-cache');
    if (!res.ok) throw new Error('Failed to fetch media tocache');
    const data = await res.json();
    return data.media_cache || [];
}

// --- Get all collection cache entries ---
export async function fetchCollectionCache() {
    const res = await fetch('/api/get-collection-cache');
    if (!res.ok) throw new Error('Failed to fetch collection cache');
    const data = await res.json();
    return data.collection_cache || [];
}

// --- Delete media cache entry by id ---
export async function deleteMediaCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/delete-media-cache/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete media cache');
    }
    return await res.json();
}

// --- Delete collection cache entry by id ---
export async function deleteCollectionCacheById(id) {
    if (!id) throw new Error('Missing id for deletion');
    const res = await fetch(`/api/delete-collection-cache/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete collection cache');
    }
    return await res.json();
}

// --- Get Gdrive Statistics ---
export async function fetchGDriveStats() {
    const res = await fetch('/api/gdrive-stats');
    if (!res.ok) throw new Error('Failed to fetch GDrive stats');
    const data = await res.json();
    return data.gdrive_stats || [];
}

// --- Get Unamtched Poster Statistics ---
export async function fetchUnmatchedStats() {
    const res = await fetch('/api/unmatched-stats');
    if (!res.ok) throw new Error('Failed to fetch unmatched poster stats');
    const data = await res.json();
    return data.summary || [];
}

// --- Get Matched Poster Statistics ---
export async function fetchMatchedPosterStats() {
    const res = await fetch('/api/matched-posters-stats');
    if (!res.ok) throw new Error('Failed to fetch matched poster stats');
    const data = await res.json();
    return data.matched_posters_stats || [];
}

// --- Plex Libraries ---
export async function fetchPlexLibraries(instanceName) {
    const resp = await fetch(`/api/plex/libraries?instance=${encodeURIComponent(instanceName)}`);
    if (!resp.ok) {
        const msg = `Failed to fetch Plex libraries (${resp.status})`;
        throw new Error(msg);
    }
    return await resp.json();
}

// --- Create Directory ---
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

// --- Fetch Config ---
export async function fetchConfig(section = null) {
    let url = '/api/config';
    if (section) url += `?section=${encodeURIComponent(section)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.json();
}

// --- Save Config ---
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

// --- Poster/Folder Stats ---
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
    // Use query params for GET
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

// --- Send Test Notification ---
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

// --- Test Instance (API check) ---
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

// --- Fetch all run states (job queue) ---
export async function fetchAllRunStates() {
    const res = await fetch('/api/run_state');
    if (!res.ok) throw new Error('Failed to fetch run states');
    const data = await res.json();
    return (data.run_states || []).reduce((acc, r) => {
        acc[r.module_name] = r;
        return acc;
    }, {});
}

// --- Module status (running) ---
export async function fetchModuleStatus(module) {
    if (!module) return false;
    const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
    if (!res.ok) throw new Error('Failed to check status');
    const data = await res.json();
    return !!data.running;
}

// --- Poster preview URL (not async, just guard errors) ---
export function fetchPosterPreviewUrl(location, path) {
    if (!location || !path) {
        return '';
    }
    return `/api/preview-poster?location=${encodeURIComponent(location)}&path=${encodeURIComponent(
        path
    )}`;
}

// --- Log modules list ---
export async function fetchLogModules() {
    const res = await fetch('/api/logs');
    if (!res.ok) throw new Error('Failed to fetch log modules');
    return await res.json();
}

// --- Log files and content ---
export async function fetchLogFiles(moduleName) {
    if (!moduleName) return [];
    const res = await fetch(`/api/logs/${moduleName}`);
    if (!res.ok) return [];
    return await res.json();
}

export async function fetchLogContent(moduleName, fileName) {
    if (!moduleName || !fileName) return '';
    const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
    if (!res.ok) return '';
    return await res.text();
}

// --- Scheduled jobs (run/cancel) ---
export async function runModule(module) {
    if (!module) return false;
    const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module }),
    });
    return res.ok;
}

export async function cancelScheduledModule(module) {
    if (!module) return false;
    const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module }),
    });
    return res.ok;
}

// --- Poster asset list ---
export async function fetchPosterAssetList() {
    const res = await fetch('/api/poster_assets');
    if (!res.ok) throw new Error('Failed to fetch poster asset list');
    const arr = await res.json();
    return Array.isArray(arr) ? arr : [];
}

// --- Directory listing ---
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
