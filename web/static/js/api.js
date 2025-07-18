export async function fetchConfig() {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        return await res.json();
    } catch (err) {
        console.error('Error loading config:', err);
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
        return { success: false, error: err.message || 'Save failed' };
    }
}

export async function fetchStats(location) {
    if (!location)
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    try {
        const res = await fetch('/api/poster-search-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location,
            }),
        });
        if (!res.ok) {
            return {
                error: true,
                file_count: 0,
                size_bytes: 0,
                files: [],
            };
        }
        return await res.json();
    } catch (err) {
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
            const okTarget = result.results.find((r) => r.ok === true);
            if (okTarget) {
                return { ok: true, message: okTarget.message || 'Test notification sent!' };
            }
            const failTarget = result.results.find((r) => r.ok === false);
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
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

// --------- Test instance (API check) ----------
export async function testInstance(service, entry) {
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
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(`Cannot save: Test failed: ${err.error || res.statusText}`, 'error');
            return false;
        }
        return true;
    } catch (err) {
        showToast('Cannot save: Test failed', 'error');
        return false;
    }
}

export async function fetchAllRunStates() {
    try {
        const res = await fetch('/api/run_state');
        if (!res.ok) return {};
        const data = await res.json();
        return (data.run_states || []).reduce((acc, r) => {
            acc[r.module_name] = r;
            return acc;
        }, {});
    } catch {
        return {};
    }
}

export async function getModuleStatus(module) {
    try {
        const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();
        return !!data.running;
    } catch {
        return false;
    }
}
