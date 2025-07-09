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
];

function isEditablePage(currentUrl) {
    return EDITABLE_PAGES.some((page) => currentUrl && currentUrl.includes(page));
}

// --- HIGHLIGHT ACTIVE MAIN + SUB-NAV (SETTINGS) & CONTROL SUBMENU VISIBILITY ---
function highlightNav(frag, url) {
    // Remove all highlights and section classes
    document
        .querySelectorAll('.menu a, .menu .sub-menu a, .menu .settings-sub-menu a, .dropdown-toggle, .dropdown-menu li a, .dropdown')
        .forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.menu > li').forEach(li => li.classList.remove('active-section'));

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
    let isSettings = (frag === 'settings');

    // Show/hide settings submenu and accent-section
    if (settingsSubMenu) settingsSubMenu.style.display = isSettings ? 'block' : 'none';
    if (isSettings && settingsLi) settingsLi.classList.add('active-section');
    if (isSettings && settingsSection) settingsSection.classList.add('active');

    // Highlight selected settings sub-section
    if (isSettings && settingsSubMenu) {
        const moduleParam = new URL(url, window.location.origin).searchParams.get('module_name');
        if (moduleParam) {
            settingsSubMenu.querySelectorAll('a.sub-section').forEach(a => {
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
                    await PAGE_LOADERS[frag](moduleName);
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



// Dirty check for forms
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

        // ---- AUTO-CLOSE SIDEBAR ON MOBILE ----
        if (window.innerWidth <= 1000) {
            document.body.classList.remove('sidebar-open');
        }
    } else if (choice === 'discard') {
        DAPS.isDirty = false;
        if (iframe && iframe.contentWindow && iframe.contentWindow.DAPS) {
            iframe.contentWindow.DAPS.isDirty = false;
        }
        await navigateTo(anchor);

        // ---- AUTO-CLOSE SIDEBAR ON MOBILE ----
        if (window.innerWidth <= 1000) {
            document.body.classList.remove('sidebar-open');
        }
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

// /web/static/js/navigation.js
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("sidebarToggle");
  const overlay = document.getElementById("pageOverlay");
  const body = document.body;

  if (hamburger && overlay) {
    hamburger.addEventListener("click", () => {
      body.classList.toggle("sidebar-open");
    });
    overlay.addEventListener("click", () => {
      body.classList.remove("sidebar-open");
    });
  }

  // Optionally: close on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") body.classList.remove("sidebar-open");
  });
});