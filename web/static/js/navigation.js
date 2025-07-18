import { loadSchedule } from './schedule.js';
import { loadInstances } from './instances.js';
import { loadLogs } from './logs.js';
import { loadNotifications } from './notifications.js';
import { initPosterSearch } from './poster_search.js';
import { loadSettings, renderSettingsSplash } from './settings/settings.js';
import { showSplashScreen } from './index.js';
import { showToast, getIsDirty, resetDirty } from './util.js';
import { unsavedSettingsModal } from './settings/modals.js';
import { saveSettings } from './settings/settings.js';

const PAGE_LOADERS = {
    schedule: loadSchedule,
    instances: loadInstances,
    logs: loadLogs,
    notifications: loadNotifications,
    settings: loadSettings,
    poster_search: initPosterSearch,
};

// --- HIGHLIGHT ACTIVE NAV LINK AND HANDLE SUBMENUS ---
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
    const isSettings = frag === 'settings';

    if (settingsSubMenu) settingsSubMenu.style.display = isSettings ? 'block' : 'none';

    // Determine if we are on a settings splash or a module page
    const moduleParam = new URL(url, location.origin).searchParams.get('module_name');

    if (isSettings) {
        // Always highlight parent <li> for settings
        if (settingsLi) settingsLi.classList.add('active-section');
        if (!moduleParam) {
            // On splash page, highlight parent link
            if (settingsSection) settingsSection.classList.add('active');
        } else {
            // On module page, highlight sub-section link
            settingsSubMenu?.querySelectorAll('a.sub-section').forEach((a) => {
                if (a.href.includes(`module_name=${moduleParam}`)) {
                    a.classList.add('active');
                }
            });
        }
    }
}

// --- MAIN PAGE NAVIGATION HANDLER ---
async function navigateTo(link, { pushState = true } = {}) {
    const viewFrame = document.getElementById('viewFrame');

    if (!viewFrame) {
        console.error('[navigateTo] viewFrame not found');
        return;
    }

    // --- DIRTY CHECK (should be in click handler, but keeping here for debug) ---
    const currentUrl = viewFrame.dataset.currentUrl || location.pathname + location.search;

    viewFrame.style.opacity = '0';

    // --- Close sidebar and dropdowns for navigation (important for mobile) ---
    document.body.classList.remove('sidebar-open');
    const hamburger = document.getElementById('sidebarToggle');
    if (hamburger) {
        hamburger.classList.remove('opened');
        hamburger.setAttribute('aria-expanded', 'false');
    }
    document.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('open'));

    viewFrame.classList.remove('fade-in');
    viewFrame.classList.remove('splash-mask', 'fade-in');
    const splashCard = viewFrame.querySelector('.splash-card');
    if (splashCard) {
        splashCard.remove();
    }
    viewFrame.classList.add('fade-out');
    viewFrame.classList.remove('splash-mask');

    // --- Normalize the URL string ---
    let url =
        typeof link === 'string'
            ? link
            : link && link.href
            ? link.href
            : location.pathname + location.search;
    if (!url.startsWith('/')) {
        url = new URL(url, location.origin).pathname + location.search;
    }

    // --- Extract fragment (e.g., "instances" from "/pages/instances") ---
    let frag = '';
    const match = url.match(/\/pages\/([a-zA-Z0-9_\-]+)/);
    if (match) {
        frag = match[1];
    } else {
        const matchAlt = url.match(/\/([a-zA-Z0-9_\-]+)$/);
        if (matchAlt) {
            frag = matchAlt[1];
        }
    }
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');

    // --- Highlight sidebar nav and store current URL for reference ---
    if (viewFrame) {
        viewFrame.dataset.currentUrl = url;
    }
    highlightNav(frag, url);

    // --- Only pushState for direct navigation, NOT for reload/initial load ---
    if (pushState && location.pathname + location.search !== url) {
        history.pushState({}, '', url);
    }

    try {
        const fragmentName = frag;

        // --- Fetch fragment HTML from backend ---
        const response = await fetch(`/api/page-fragment?name=${encodeURIComponent(fragmentName)}`);
        if (!response.ok) {
            const msg = `Failed to load fragment: ${fragmentName} (${response.status})`;
            showToast(msg, 'error');
            viewFrame.innerHTML = `<div class="error-msg">${msg}</div>`;
            viewFrame.style.opacity = '1';
            viewFrame.classList.remove('fade-out');
            viewFrame.classList.add('fade-in');
            console.error('[navigateTo] Fetch error:', msg);
            return;
        }
        const html = await response.text();

        // --- Parse HTML fragment (remove <script> tags just in case) ---
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let bodyContent = doc.body ? doc.body.innerHTML : html;
        bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        // --- Inject fragment content and run page loader if available ---
        setTimeout(async () => {
            viewFrame.innerHTML = bodyContent;

            setTimeout(() => {
                viewFrame.style.opacity = '1';
            }, 30);
            document.body.classList.remove('logs-open');
            viewFrame.classList.remove('fade-out');
            viewFrame.classList.add('fade-in');

            if (PAGE_LOADERS[frag]) {
                if (frag === 'settings') {
                    const params = new URLSearchParams(url.split('?')[1] || '');
                    const moduleName = params.get('module_name');
                    if (moduleName) {
                        viewFrame.classList.add('is-settings');
                        await loadSettings(moduleName);
                    } else {
                        renderSettingsSplash();
                    }
                } else {
                    await PAGE_LOADERS[frag]();
                    viewFrame.classList.remove('is-settings');
                }
            } else {
            }

            setupDropdownMenus();
            highlightNav(frag, url);
        }, 200);
    } catch (err) {
        showToast('Failed to load page', 'error');
        console.error('[navigateTo] Error loading fragment:', err);
        viewFrame.innerHTML = `<div class="error-msg">Failed to load page fragment.</div>`;
        viewFrame.style.opacity = '1';
        viewFrame.classList.remove('fade-out');
        viewFrame.classList.add('fade-in');
    }
}

// --- CLOSE DROPDOWNS ON NAVIGATION ---
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

    // Always use the full path (with query string) for everything
    let path = location.pathname + location.search;

    // -- Extract fragment for main highlight --
    let frag = '';
    if (/\/pages\/([a-zA-Z0-9_\-]+)/.test(path)) {
        frag = path.match(/\/pages\/([a-zA-Z0-9_\-]+)/)[1];
    } else if (/\/([a-zA-Z0-9_\-]+)$/.test(path)) {
        frag = path.match(/\/([a-zA-Z0-9_\-]+)$/)[1];
    }
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');

    // -- Always highlight nav with full path --
    highlightNav(frag, path);

    if (path !== '/' && !path.startsWith('/api') && !path.startsWith('/web/static')) {
        await navigateTo(path);
    } else {
        if (typeof showSplashScreen === 'function') {
            showSplashScreen();
            const viewFrame = document.getElementById('viewFrame');
            if (viewFrame) viewFrame.style.opacity = '1';
        }
    }

    document.addEventListener('click', async (e) => {
        // Handle sidebar/top-menu AND settings splash links
        const link = e.target.closest('nav .menu a, .dropdown-toggle, .settings-section-link');
        if (!link || !link.href || link.origin !== location.origin) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
        e.preventDefault();

        // Only intercept if on settings page, settings form is dirty, and navigating away
        const viewFrame = document.getElementById('viewFrame');
        const currentUrl = viewFrame?.dataset.currentUrl || location.pathname + location.search;
        const leavingSettings =
            currentUrl.includes('/pages/settings') &&
            !link.href.endsWith(currentUrl) && // not just clicking same page
            typeof getIsDirty === 'function' &&
            getIsDirty();

        if (leavingSettings) {
            const action = await unsavedSettingsModal();
            if (action === 'discard') {
                history.pushState({}, '', link.href);
                await navigateTo(link.href);
            } else if (action === 'save') {
                const result = await saveSettings();
                if (result?.success) {
                    history.pushState({}, '', link.href);
                    await navigateTo(link.href);
                }
                // If not success, stay on the page (errors are already shown by saveSettings)
            }
            // cancel: do nothing
            return;
        }

        document.body.classList.remove('sidebar-open');
        // Special handling for settings sub-menu navigation (only those with ?module_name=...)
        if (link.href.includes('/pages/settings?module_name=')) {
            history.pushState({}, '', link.href);
            await navigateTo(link.href, { pushState: false }); // Ensure consistent pushState logic
            highlightNav('settings', link.href);
            return;
        }

        // All other navigation
        history.pushState({}, '', link.href);
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

// --- SIDEBAR TOGGLE VIA HAMBURGER BUTTON ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('pageOverlay');
    const body = document.body;

    if (hamburger && overlay) {
        hamburger.addEventListener('click', function () {
            const isOpen = !body.classList.contains('sidebar-open');
            if (isOpen) {
                body.classList.add('sidebar-open');
                this.classList.add('opened');
                this.setAttribute('aria-expanded', 'true');
            } else {
                body.classList.remove('sidebar-open');
                this.classList.remove('opened');
                this.setAttribute('aria-expanded', 'false');
            }
        });
        overlay.addEventListener('click', () => {
            body.classList.remove('sidebar-open');
            const hamburger = document.getElementById('sidebarToggle');
            if (hamburger) {
                hamburger.classList.remove('opened');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Optionally: close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            body.classList.remove('sidebar-open');
            const hamburger = document.getElementById('sidebarToggle');
            if (hamburger) {
                hamburger.classList.remove('opened');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        }
    });
});

// If sidebar is open and you click anywhere except the sidebar or hamburger, close sidebar
document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('sidebar-open')) return;
    const sidebar = document.querySelector('nav.sidebar');
    const hamburger = document.getElementById('sidebarToggle');
    // If click is inside sidebar or hamburger, do nothing
    if (sidebar && sidebar.contains(e.target)) return;
    if (hamburger && hamburger.contains(e.target)) return;
    // Otherwise, close the sidebar and revert hamburger
    document.body.classList.remove('sidebar-open');
    if (hamburger) {
        hamburger.classList.remove('opened');
        hamburger.setAttribute('aria-expanded', 'false');
    }
});
