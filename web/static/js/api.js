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

