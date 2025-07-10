export const moduleOrder = [
    'sync_gdrive',
    'poster_renamerr',
    'border_replacerr',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
    'main',
];

export const moduleList = [
    'sync_gdrive',
    'poster_renamerr',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
    'unmatched_assets',
]

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

export function setupPasswordToggles(scope = document) {
    scope.querySelectorAll('.toggle-password').forEach(btn => {
        btn.onclick = () => {
            const inputId = btn.getAttribute('data-input');
            const input = scope.querySelector(`#${inputId}`);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                input.classList.remove('masked-input');
                btn.innerHTML = '<i class="material-icons">visibility_off</i>';
            } else {
                input.type = 'password';
                input.classList.add('masked-input');
                btn.innerHTML = '<i class="material-icons">visibility</i>';
            }
        };
        // On initial load, ensure eye icon matches input type
        const inputId = btn.getAttribute('data-input');
        const input = scope.querySelector(`#${inputId}`);
        if (input && input.type === 'password') {
            btn.innerHTML = '<i class="material-icons">visibility</i>';
        } else {
            btn.innerHTML = '<i class="material-icons">visibility_off</i>';
        }
    });
}

export function getIcon(type)
{
    if (type === 'radarr') {
            return `<img src="/web/static/icons/radarr.svg" alt="Radarr logo" />`;
    }
    if (type === 'sonarr') {
        return `<img src="/web/static/icons/sonarr.svg" alt="Sonarr logo" />`;
    }
    if (type === 'plex') {
        return `<img src="/web/static/icons/plex.svg" alt="Plex logo" />`;
    }
}
