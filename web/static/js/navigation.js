import { loadSchedule } from './schedule.js';
import { loadInstances } from './instances.js';
import { loadLogs } from './logs.js';
import { loadNotifications } from './notifications.js';
import { loadSettings } from './settings.js';
import { initPosterSearch } from './poster_search.js';
import { moduleOrder } from './helper.js';
import { DAPS, humanize, showUnsavedModal } from './common.js';

export const PAGE_LOADERS = {
    schedule: loadSchedule,
    instances: loadInstances,
    logs: loadLogs,
    notifications: loadNotifications,
    settings: loadSettings,
    poster_search: initPosterSearch,
};

const EDITABLE_PAGES = [
    '/pages/settings',
    '/pages/instances',
    '/pages/schedule',
    '/pages/notifications',
];

function isEditablePage(currentUrl) {
    return EDITABLE_PAGES.some((page) => currentUrl && currentUrl.includes(page));
}

function highlightNav(frag, url) {
    document
        .querySelectorAll('.menu a, .dropdown-toggle, .dropdown-menu li a, .dropdown')
        .forEach((el) => {
            el.classList.remove('active');
        });

    if (!frag || frag === 'index' || !PAGE_LOADERS.hasOwnProperty(frag)) {
        return;
    }

    const linkIdMap = {
        schedule: 'link-schedule',
        instances: 'link-instances',
        notifications: 'link-notifications',
        logs: 'link-logs',
        poster_search: 'link-poster-search',
    };

    if (frag in linkIdMap) {
        document.getElementById(linkIdMap[frag])?.classList.add('active');
    }

    if (frag === 'settings') {
        const dropdown = document.querySelector('.dropdown');
        dropdown?.classList.add('active');
        const settingsToggle = document.querySelector('.dropdown-toggle');
        settingsToggle?.classList.add('active');

        const moduleParam = new URL(url, window.location.origin).searchParams.get('module_name');
        if (moduleParam) {
            const moduleLink = document.querySelector(
                `#settings-dropdown li a[href*="module_name=${moduleParam}"]`
            );
            moduleLink?.classList.add('active');
        }
    }
}

export async function navigateTo(link) {
    document.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('open'));

    const viewFrame = document.getElementById('viewFrame');
    if (!viewFrame) return;
    viewFrame.classList.remove('fade-in');
    viewFrame.classList.add('fade-out');
    viewFrame.classList.remove('splash-mask');
    let url = typeof link === 'string' ? link : link.href;

    let frag = '';
    if (/\/pages\/([a-zA-Z0-9_\-]+)/.test(url)) {
        frag = url.match(/\/pages\/([a-zA-Z0-9_\-]+)/)[1];
    } else if (/\/([a-zA-Z0-9_\-]+)$/.test(url)) {
        frag = url.match(/\/([a-zA-Z0-9_\-]+)$/)[1];
    }
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');

    if (viewFrame) viewFrame.dataset.currentUrl = url;
    window.currentFragmentUrl = url;

    highlightNav(frag, url);

    try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let bodyContent = doc.body ? doc.body.innerHTML : html;
        bodyContent = bodyContent.replace(/<script[^>]*>/g, '').replace(/<\/script>/g, '');

        setTimeout(async () => {
            viewFrame.innerHTML = bodyContent;
            document.body.classList.remove('logs-open');
            viewFrame.classList.remove('fade-out');
            viewFrame.classList.add('fade-in');

            if (PAGE_LOADERS[frag]) {
                if (frag === 'settings') {
                    const params = new URLSearchParams(url.split('?')[1] || '');
                    const moduleName = params.get('module_name');
                    await PAGE_LOADERS[frag](moduleName);
                } else {
                    await PAGE_LOADERS[frag]();
                }
            }

            setupDropdownMenus();
        }, 200);
    } catch (err) {
        if (typeof DAPS?.showToast === 'function') DAPS.showToast('Failed to load page', 'error');
        console.error(err);
    }
}

async function populateSettingsDropdown() {
    const res = await fetch('/api/config');
    const config = await res.json();
    const dropdown = document.getElementById('settings-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    let currentModule = null;
    const url = window.currentFragmentUrl || '';
    if (url.includes('/pages/settings')) {
        const params = new URLSearchParams(url.split('?')[1] || '');
        currentModule = params.get('module_name');
    }

    (moduleOrder || Object.keys(config))
        .filter(
            (key) =>
                config.hasOwnProperty(key) &&
                !Object.keys(PAGE_LOADERS).includes(key) &&
                key !== 'discord'
        )
        .forEach((module) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `/pages/settings?module_name=${module}`;
            a.textContent = humanize(module);
            if (currentModule && module === currentModule) {
                a.classList.add('active');
            }
            li.appendChild(a);
            dropdown.appendChild(li);
        });
}

document.addEventListener('change', function (e) {
    const viewFrame = document.getElementById('viewFrame');
    const currentUrl = viewFrame?.dataset?.currentUrl || window.currentFragmentUrl || '';
    const target = e.target;
    if (
        isEditablePage(currentUrl) &&
        target &&
        target.matches('input, select, textarea') &&
        target.id !== 'schedule-search' &&
        target.id !== 'notifications-search'
    ) {
        DAPS.markDirty();
    }
});
window.addEventListener('beforeunload', function (e) {
    if (DAPS.isDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});
document.addEventListener('click', async function (e) {
    let skip = false;
    if (DAPS.skipDirtyCheck) {
        skip = true;
        DAPS.skipDirtyCheck = false;
    }
    let el = e.target;
    while (el && el.nodeType !== 1) el = el.parentNode;
    if (!el) return;
    const anchor = el.closest('a');
    if (!anchor || !anchor.href) return;
    const hrefUrl = new URL(anchor.href, window.location.origin);
    if (hrefUrl.origin !== window.location.origin) return;
    if (
        anchor.target === '_blank' ||
        anchor.href.startsWith('mailto:') ||
        anchor.href.startsWith('javascript:')
    )
        return;

    if (!hrefUrl.pathname.startsWith('/pages/')) return;

    e.preventDefault();
    let dirty = DAPS.isDirty;
    const iframe = document.getElementById('viewFrame');
    if (
        iframe &&
        iframe.contentWindow &&
        iframe.contentWindow.DAPS &&
        iframe.contentWindow.DAPS.isDirty
    ) {
        dirty = true;
    }
    let choice = null;
    if (!skip && dirty) {
        choice = await showUnsavedModal();
    }
    if (!dirty || choice === 'save' || skip) {
        await navigateTo(anchor);
    } else if (choice === 'discard') {
        DAPS.isDirty = false;
        if (iframe && iframe.contentWindow && iframe.contentWindow.DAPS) {
            iframe.contentWindow.DAPS.isDirty = false;
        }
        await navigateTo(anchor);
    }
});

function setupDropdownMenus() {
    document.querySelectorAll('.dropdown').forEach((dropdown) => {
        const oldToggle = dropdown.querySelector('.dropdown-toggle');
        const oldMenu = dropdown.querySelector('.dropdown-menu');
        if (!oldToggle || !oldMenu) return;

        const toggle = oldToggle.cloneNode(true);
        const menu = oldMenu.cloneNode(true);

        oldToggle.replaceWith(toggle);
        oldMenu.replaceWith(menu);

        let closeTimeout = null;

        toggle.addEventListener('mouseenter', () => {
            clearTimeout(closeTimeout);
            dropdown.classList.add('open');
        });
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            clearTimeout(closeTimeout);
            dropdown.classList.toggle('open');
        });

        menu.addEventListener('mouseenter', () => {
            clearTimeout(closeTimeout);
        });

        dropdown.addEventListener('mouseleave', () => {
            closeTimeout = setTimeout(() => {
                dropdown.classList.remove('open');
            }, 500); // Adjust delay as needed
        });

        menu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                dropdown.classList.remove('open');
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await populateSettingsDropdown();
    setupDropdownMenus();

    let path = window.location.pathname;
    let frag = '';
    if (/\/pages\/([a-zA-Z0-9_\-]+)/.test(path)) {
        frag = path.match(/\/pages\/([a-zA-Z0-9_\-]+)/)[1];
    } else if (/\/([a-zA-Z0-9_\-]+)$/.test(path)) {
        frag = path.match(/\/([a-zA-Z0-9_\-]+)$/)[1];
    }
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');
    highlightNav(frag, path);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('open'));
        }
    });

    document.querySelectorAll('nav .menu a, .dropdown-toggle').forEach((link) => {
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                link.click();
            }
        });
    });
});

export { populateSettingsDropdown };
