import { loadSchedule } from './schedule.js';
import { loadInstances } from './instances.js';
import { loadLogs } from './logs.js';
import { loadNotifications } from './notifications.js';
import { loadSettings } from './settings/settings.js';
import { initPosterSearch } from './poster_search.js';
import { handleSettingsNavigation } from './settings/settings.js';


export const PAGE_LOADERS = {
    schedule: loadSchedule,
    instances: loadInstances,
    logs: loadLogs,
    notifications: loadNotifications,
    settings: loadSettings,
    poster_search: initPosterSearch,
};

// --- HIGHLIGHT ACTIVE MAIN + SUB-NAV (SETTINGS) & CONTROL SUBMENU VISIBILITY ---
function highlightNav(frag, url) {
    // Remove all highlights and section classes
    document
        .querySelectorAll(
            '.menu a, .menu .sub-menu a, .menu .settings-sub-menu a, .dropdown-toggle, .dropdown-menu li a, .dropdown'
        )
        .forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.menu > li').forEach((li) => li.classList.remove('active-section'));

    // Accent bar and highlight for main nav
    const linkIdMap = {
        schedule: 'link-schedule',
        instances: 'link-instances',
        notifications: 'link-notifications',
        logs: 'link-logs',
        poster_search: 'link-poster-search',
        poster_management: 'link-poster-management',
    };

    // Main page highlight
    if (frag in linkIdMap) {
        const link = document.getElementById(linkIdMap[frag]);
        if (link) {
            link.classList.add('active');
            const li = link.closest('li');
            if (li) li.classList.add('active-section');
        }
    }

    // SETTINGS submenu control
    const settingsLi = document.getElementById('settings-section');
    const settingsSubMenu = settingsLi?.querySelector('.settings-sub-menu');
    const settingsSection = settingsLi?.querySelector('a.main-section');
    let isSettings = frag === 'settings';

    // Show/hide settings submenu and accent-section
    if (settingsSubMenu) settingsSubMenu.style.display = isSettings ? 'block' : 'none';
    if (isSettings && settingsLi) settingsLi.classList.add('active-section');
    if (isSettings && settingsSection) settingsSection.classList.add('active');

    // Highlight selected settings sub-section
    if (isSettings && settingsSubMenu) {
        const moduleParam = new URL(url, window.location.origin).searchParams.get('module_name');
        if (moduleParam) {
            settingsSubMenu.querySelectorAll('a.sub-section').forEach((a) => {
                if (a.href.includes(`module_name=${moduleParam}`)) {
                    a.classList.add('active');
                }
            });
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
                    if (moduleName) {
                        // Show the settings form for the module
                        document.querySelector('.settings-splash')?.classList.add('hidden');
                        document.getElementById('settingsForm')?.classList.remove('hidden');
                        await PAGE_LOADERS[frag](moduleName);
                    } else {
                        // Show splash, hide form
                        import('./settings/settings.js').then(({ renderSettingsSplash }) => {
                            document.querySelector('.settings-splash')?.classList.remove('hidden');
                            document.getElementById('settingsForm')?.classList.add('hidden');
                            renderSettingsSplash();
                        });
                    }
                } else {
                    await PAGE_LOADERS[frag]();
                }
            }

            setupDropdownMenus();
            // Sub-menu highlight on navigation for SPA
            highlightNav(frag, url);
        }, 200);
    } catch (err) {
        if (typeof DAPS?.showToast === 'function') DAPS.showToast('Failed to load page', 'error');
        console.error(err);
    }
}


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
    setupDropdownMenus();

    let path = window.location.pathname + window.location.search;
    let frag = '';
    if (/\/pages\/([a-zA-Z0-9_\-]+)/.test(path)) {
        frag = path.match(/\/pages\/([a-zA-Z0-9_\-]+)/)[1];
    } else if (/\/([a-zA-Z0-9_\-]+)$/.test(path)) {
        frag = path.match(/\/([a-zA-Z0-9_\-]+)$/)[1];
    }
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');
    highlightNav(frag, path);

    document.addEventListener('click', async (e) => {
        const link = e.target.closest('nav .menu a, .dropdown-toggle');
        if (!link || !link.href || link.origin !== window.location.origin) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
        e.preventDefault();

        // Special handling for settings sub-menu navigation (only those with ?module_name=...)
        if (link.href.includes('/pages/settings?module_name=')) {
            const params = new URL(link.href, window.location.origin).searchParams;
            const moduleName = params.get('module_name');
            if (moduleName) {
                await handleSettingsNavigation(moduleName); // <-- this is where modal logic happens!
                return;
            }
        }

        // All other navigation
        navigateTo(link.href);
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

document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('pageOverlay');
    const body = document.body;

    if (hamburger && overlay) {
        hamburger.addEventListener('click', () => {
            body.classList.toggle('sidebar-open');
        });
        overlay.addEventListener('click', () => {
            body.classList.remove('sidebar-open');
        });
    }

    // Optionally: close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') body.classList.remove('sidebar-open');
    });
});
