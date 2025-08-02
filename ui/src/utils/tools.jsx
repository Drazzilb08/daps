import { fetchConfig } from './api.js';

let isDirty = false;

export function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
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
        return (
            <img
                src={`/icons/${brands[key]}.svg`}
                alt={brands[key][0].toUpperCase() + brands[key].slice(1) + ' logo'}
                style={opts.style}
            />
        );
    }

    if (/^(mi:|material:)/.test(type)) {
        const iconName = type.replace(/^mi:|^material:/, '');
        return (
            <span className="material-icons" style={opts.style}>
                {iconName}
            </span>
        );
    }

    // Fallback
    return (
        <span className="material-icons" style={opts.style}>
            notifications
        </span>
    );
}

export function getSpinner(opts = {}) {
    return <span className="spinner" style={opts.style} />;
}

let _themeMediaListener = null;

export function setTheme() {
    fetchConfig()
        .then(config => {
            let theme =
                config && config.user_interface && typeof config.user_interface.theme === 'string'
                    ? config.user_interface.theme.toLowerCase()
                    : 'light';

            function applySystemTheme() {
                const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
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
                localStorage.setItem('theme', theme);
            }
        })
        .catch(err => {
            console.error('Failed to fetch config:', err);
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        });
}
