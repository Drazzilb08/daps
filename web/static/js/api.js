import { showToast } from './util.js';

export async function fetchConfig() {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        return await res.json();
    } catch (err) {
        showToast('Error loading config: ' + (err?.message || err), 'error');
        return {};
    }
}

export async function postConfig(payload) {
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        return { success: true, data };
    } catch (err) {
        showToast('Failed to save config: ' + (err?.message || err), 'error');
        return { success: false, error: err.message || 'Save failed' };
    }
}

export async function fetchStats(location) {
    if (!location) {
        showToast('Missing location for stats fetch.', 'error');
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    }
    try {
        const res = await fetch('/api/poster-search-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ location }),
        });
        if (!res.ok) {
            showToast('Failed to fetch poster stats', 'error');
            return {
                error: true,
                file_count: 0,
                size_bytes: 0,
                files: [],
            };
        }
        return await res.json();
    } catch (err) {
        showToast('Error fetching stats: ' + (err?.message || err), 'error');
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    }
}

export async function fetchGdriveStats(location) {
    if (!location) {
        showToast('Missing GDrive location for stats.', 'error');
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    }
    try {
        const res = await fetch('/api/poster-search-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ location }),
        });
        if (!res.ok) {
            showToast('Failed to fetch GDrive stats', 'error');
            return {
                error: true,
                file_count: 0,
                size_bytes: 0,
                files: [],
            };
        }
        return await res.json();
    } catch (err) {
        showToast('Error fetching GDrive stats: ' + (err?.message || err), 'error');
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    }
}

export async function runTestNotification(type, data) {
    try {
        if (!type || !data) {
            showToast('Type and data required for test notification.', 'error');
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
            showToast('Failed to send test notification: ' + (result.error || 'Error'), 'error');
            return { ok: false, error: result.error || 'Error' };
        }
        if (result.results && Array.isArray(result.results)) {
            const okTarget = result.results.find((r) => r.ok === true);
            if (okTarget) {
                return { ok: true, message: okTarget.message || 'Test notification sent!' };
            }
            const failTarget = result.results.find((r) => r.ok === false);
            if (failTarget) {
                showToast(
                    'Test notification failed: ' + (failTarget.error || failTarget.message),
                    'error'
                );
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
        showToast('Test notification failed: ' + (result.error || 'Unknown error'), 'error');
        return { ok: false, error: result.error || 'Test notification failed (unknown error)' };
    } catch (err) {
        showToast('Error sending test notification: ' + (err?.message || err), 'error');
        return { ok: false, error: String(err) };
    }
}

// --------- Test instance (API check) ----------
export async function testInstance(service, entry) {
    try {
        if (!service || !entry || !entry.name || !entry.url || !entry.api) {
            showToast('Missing parameters for instance test.', 'error');
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
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(`Cannot save: Test failed: ${err.error || res.statusText}`, 'error');
            return false;
        }
        return true;
    } catch (err) {
        showToast('Cannot save: Test failed: ' + (err?.message || err), 'error');
        return false;
    }
}

export async function fetchAllRunStates() {
    try {
        const res = await fetch('/api/run_state');
        if (!res.ok) throw new Error('Failed to fetch run states');
        const data = await res.json();
        return (data.run_states || []).reduce((acc, r) => {
            acc[r.module_name] = r;
            return acc;
        }, {});
    } catch (err) {
        showToast('Failed to fetch run states: ' + (err?.message || err), 'error');
        return {};
    }
}

export async function getModuleStatus(module) {
    try {
        if (!module) {
            showToast('Missing module name for status check.', 'error');
            return false;
        }
        const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();
        return !!data.running;
    } catch (err) {
        showToast('Failed to get module status: ' + (err?.message || err), 'error');
        return false;
    }
}

// --- Fetch list of log modules ---
export async function fetchLogModules() {
    try {
        const res = await fetch('/api/logs');
        if (!res.ok) throw new Error('Failed to fetch log modules');
        return await res.json();
    } catch (err) {
        showToast('Error fetching log modules: ' + (err?.message || err), 'error');
        return [];
    }
}

export function fetchPosterPreviewUrl(location, path) {
    try {
        if (!location || !path) {
            showToast('Missing location or path for preview.', 'error');
            return '';
        }
        return `/api/preview-poster?location=${encodeURIComponent(
            location
        )}&path=${encodeURIComponent(path)}`;
    } catch (err) {
        showToast('Failed to build preview URL: ' + (err?.message || err), 'error');
        return '';
    }
}


// Fetch log files for a module
export async function fetchLogFiles(moduleName) {
    if (!moduleName) return [];
    const res = await fetch(`/api/logs/${moduleName}`);
    if (!res.ok) return [];
    return await res.json();
}

// Fetch log content for a module's log file
export async function fetchLogContent(moduleName, fileName) {
    if (!moduleName || !fileName) return '';
    const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
    if (!res.ok) return '';
    return await res.text();
}

// Run a scheduled module now
export async function runScheduledModule(module) {
    if (!module) return false;
    try {
        const res = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        return res.ok;
    } catch (err) {
        return false;
    }
}

// Cancel a running scheduled module
export async function cancelScheduledModule(module) {
    if (!module) return false;
    try {
        const res = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module }),
        });
        return res.ok;
    } catch (err) {
        return false;
    }
}

export async function fetchPosterAssetList() {
    try {
        const res = await fetch('/api/poster_assets');
        const arr = await res.json();
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}