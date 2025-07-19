// --- Utilities ---
import { fetchConfig } from './api.js';

let isDirty = false;

export function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function showToast(message, type = 'info', timeout = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 300);
    });
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 500);
    }, timeout);
}

export function markDirty() {
    isDirty = true;
    const saveBtn = document.getElementById('saveBtnFixed') || document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.classList.add('dirty');
        saveBtn.classList.remove('saved');
        saveBtn.disabled = false;
        saveBtn.title = 'Save changes';
    }
}

export function resetDirty() {
    isDirty = false;
    const saveBtn = document.getElementById('saveBtnFixed') || document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.classList.remove('dirty');
        saveBtn.classList.add('saved');
        saveBtn.disabled = true;
        saveBtn.title = 'All changes saved';
    }
}

export function getIsDirty() {
    return isDirty;
}

export function getIcon(type, opts = {}) {
    const brands = {
        radarr: 'radarr',
        imdb: 'imdb',
        tmdb: 'tmdb',
        tvdb: 'tvdb',
        sonarr: 'sonarr',
        plex: 'plex',
        discord: 'discord',
        notifiarr: 'notifiarr',
    };
    const key = (type || '').toLowerCase();

    if (brands[key]) {
        return `<img src="/web/static/icons/${brands[key]}.svg" alt="${
            brands[key][0].toUpperCase() + brands[key].slice(1)
        } logo" />`;
    }

    // Material icons (mi: or material:)
    if (/^(mi:|material:)/.test(type)) {
        const iconName = type.replace(/^mi:|^material:/, '');
        return `<span class="material-icons"${
            opts.style ? ` style="${opts.style}"` : ''
        }>${iconName}</span>`;
    }

    // Fallback
    return `<span class="material-icons"${
        opts.style ? ` style="${opts.style}"` : ''
    }>notifications</span>`;
}

export function getSpinner() {
    return `<span class="spinner"></span>`;
}


let _themeMediaListener = null;

function parseVersionString(ver) {
    if (!ver) return {};
    const parts = ver.trim().split('.');
    if (parts.length < 4) return {};
    const version = parts.slice(0, 3).join('.');
    const branchAndBuild = parts[3];

    const m = branchAndBuild.match(/^([a-zA-Z]+)(\d+)$/);
    let branch, build;
    if (m) {
        branch = m[1];
        build = parseInt(m[2], 10);
    } else {
        branch = branchAndBuild.replace(/(\d+)$/, '');
        const buildMatch = branchAndBuild.match(/(\d+)$/);
        build = buildMatch ? parseInt(buildMatch[1], 10) : null;
    }
    return {
        version,
        branch,
        build,
        full: ver.trim(),
    };
}

async function getRemoteBuildCount(owner, repo, branch) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) return null;
        const link = response.headers.get('Link');
        if (!link) return 1; // If only one commit
        const match = link.match(/&page=(\d+)>; rel="last"/);
        if (match) return parseInt(match[1], 10);
        return 1;
    } catch {
        return null;
    }
}

async function mainVersionCheck() {
    const localVerStr = await fetch('/api/version')
        .then((r) => r.text())
        .catch(() => null);
    const local = parseVersionString(localVerStr);
    if (!local.version || !local.branch || local.build === null) {
        document.getElementById('version').textContent = 'Version: ' + (localVerStr || 'unknown');
        return;
    }

    const remoteVersion = await fetch(
        `https://raw.githubusercontent.com/Drazzilb08/daps/${local.branch}/VERSION`
    )
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);

    const remoteBuild = await getRemoteBuildCount('Drazzilb08', 'daps', local.branch);
    let remoteFull = '';
    let updateAvailable = false;
    if (remoteVersion && remoteBuild !== null) {
        remoteFull = `${remoteVersion.trim()}.${local.branch}${remoteBuild}`;
        if (remoteVersion.trim() === local.version && remoteBuild > local.build) {
            updateAvailable = true;
        } else if (remoteVersion.trim() !== local.version) {
            updateAvailable = true;
        }
    }
    document.getElementById('version').textContent = 'Version: ' + local.full;
    const badge = document.getElementById('update-badge');

    if (updateAvailable) {
        badge.style.display = '';
        badge.title = ''; // Use custom tooltip
        badge.onclick = () => open('https://github.com/Drazzilb08/daps/releases', '_blank');
        document.getElementById('tooltip-current-version').innerText = local.full;
        document.getElementById('tooltip-latest-version').innerText = remoteFull;
    } else {
        badge.style.display = 'none';
    }
}

export function setTheme() {
    fetchConfig()
        .then((config) => {
            let theme =
                config && config.user_interface && typeof config.user_interface.theme === 'string'
                    ? config.user_interface.theme.toLowerCase()
                    : 'light';

            function applySystemTheme() {
                const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                try {
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch {}
            }

            if (_themeMediaListener) {
                matchMedia('(prefers-color-scheme: dark)').removeEventListener(
                    'change',
                    _themeMediaListener
                );
                _themeMediaListener = null;
            }

            if (theme === 'auto') {
                applySystemTheme();
                _themeMediaListener = applySystemTheme;
                matchMedia('(prefers-color-scheme: dark)').addEventListener(
                    'change',
                    _themeMediaListener
                );
            } else {
                document.documentElement.setAttribute(
                    'data-theme',
                    theme === 'dark' ? 'dark' : 'light'
                );
                try {
                    localStorage.setItem('theme', theme);
                } catch {}
            }
        })
        .catch((err) => {
            console.error('Failed to fetch config:', err);
            document.documentElement.setAttribute('data-theme', 'light');
            try {
                localStorage.setItem('theme', 'light');
            } catch {}
        });
}

// Dynamically add a stylesheet if not present
export function loadCSS(href, id) {
    if (id && document.getElementById(id)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) link.id = id;
    document.head.appendChild(link);
}

// Remove by id
export function unloadCSS(id) {
    const link = document.getElementById(id);
    if (link) link.remove();
}