import { PAGE_LOADERS, PAGE_CSS } from './pages/init_pages.js';
import { showToast, getIsDirty, loadCSS, unloadCSS } from './util.js';
import { unsavedSettingsModal } from './common/modals.js';
import { saveSettings, buildSidebarSettingsSubMenu } from './pages/settings.js';

let currentPageCssId = null;

function setPageCSS(page) {
    // Unload previous page CSS if any
    if (currentPageCssId) {
        unloadCSS(currentPageCssId);
        currentPageCssId = null;
    }
    // Determine the CSS id from your PAGE_CSS map or fallback to the page name
    let cssId = PAGE_CSS[page] || page;
    if (!cssId) return;
    const href = `/web/static/css/${cssId}.css`;
    loadCSS(href, cssId + '-css');
    currentPageCssId = cssId + '-css';
}

// ================= NAVIGATION HIGHLIGHTING =================
function highlightNav(frag, url) {
    document
        .querySelectorAll(
            '.menu a, .menu .sub-menu a, .menu .settings-sub-menu a, .dropdown-toggle, .dropdown-menu li a, .dropdown'
        )
        .forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.menu > li').forEach((li) => li.classList.remove('active-section'));

    const linkIdMap = {
        schedule: 'link-schedule',
        instances: 'link-instances',
        notifications: 'link-notifications',
        logs: 'link-logs',
        poster_search: 'link-poster-search',
        poster_management: 'link-poster-management',
    };

    if (frag in linkIdMap) {
        const link = document.getElementById(linkIdMap[frag]);
        if (link) {
            link.classList.add('active');
            const li = link.closest('li');
            if (li) li.classList.add('active-section');
        }
    }

    const settingsLi = document.getElementById('settings-section');
    const settingsSubMenu = settingsLi?.querySelector('.settings-sub-menu');
    const settingsSection = settingsLi?.querySelector('a.main-section');
    const isSettings = frag === 'settings';

    if (settingsSubMenu) settingsSubMenu.style.display = isSettings ? 'block' : 'none';

    const moduleParam = new URL(url, location.origin).searchParams.get('module_name');

    if (isSettings) {
        if (settingsLi) settingsLi.classList.add('active-section');
        if (!moduleParam) {
            if (settingsSection) settingsSection.classList.add('active');
        } else {
            settingsSubMenu?.querySelectorAll('a.sub-section').forEach((a) => {
                if (a.href.includes(`module_name=${moduleParam}`)) {
                    a.classList.add('active');
                }
            });
        }
    }
}

// ================= MAIN SPA ROUTER =================
export async function navigateTo(link, { pushState = true } = {}) {
    const viewFrame = document.getElementById('viewFrame');
    if (!viewFrame) {
        console.error('[navigateTo] viewFrame not found');
        return;
    }

    // Visual transition out
    viewFrame.style.opacity = '0';
    viewFrame.classList.remove('fade-in', 'splash-mask');
    viewFrame.classList.add('fade-out');

    // Sidebar/menu/overlay state
    document.body.classList.remove('sidebar-open', 'logs-open');
    document.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('open'));
    const hamburger = document.getElementById('sidebarToggle');
    if (hamburger) {
        hamburger.classList.remove('opened');
        hamburger.setAttribute('aria-expanded', 'false');
    }
    const splashCard = viewFrame.querySelector('.splash-card');
    if (splashCard) splashCard.remove();

    // URL normalization & fragment
    let url =
        typeof link === 'string'
            ? link
            : link && link.href
            ? link.href
            : location.pathname + location.search;
    if (!url.startsWith('/')) {
        url = new URL(url, location.origin).pathname + location.search;
    }
    let frag = '';
    const match = url.match(/\/pages\/([a-zA-Z0-9_\-]+)/) || url.match(/\/([a-zA-Z0-9_\-]+)$/);
    if (match) frag = match[1];
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');

    // Nav/URL state
    viewFrame.dataset.currentUrl = url;
    highlightNav(frag, url);

    setPageCSS(frag);

    if (pushState && location.pathname + location.search !== url) {
        history.pushState({}, '', url);
    }

    // Remove loaders and clear all children
    [...viewFrame.querySelectorAll('.poster-search-loader-modal')].forEach((loader) =>
        loader.remove()
    );
    [...viewFrame.children].forEach((child) => child.remove());

    // Load SPA module
    try {
        if (PAGE_LOADERS[frag]) {
            if (frag === 'settings') {
                const params = new URLSearchParams(url.split('?')[1] || '');
                const moduleName = params.get('module_name');
                await PAGE_LOADERS.settings(moduleName);
            } else {
                await PAGE_LOADERS[frag]();
            }
        } else {
            viewFrame.innerHTML = `
        <div class="not-found-outer">
  <div class="not-found-animation">
    <div class="stars"></div>
    <div class="planet"></div>
    <div class="astronaut">
      <div class="helmet">
        <div class="glow"></div>
      </div>
      <div class="backpack"></div>
      <div class="body"></div>
      <div class="arm left"></div>
      <div class="arm right"></div>
      <div class="leg left"></div>
      <div class="leg right"></div>
      <div class="tether"></div>
    </div>
    <div class="not-found-404-bounce">404</div>
    <div class="not-found-planet-shadow"></div>
  </div>
  <div class="not-found-msg">
    <div class="not-found-headline">Whoops! Lost in Space</div>
    <div class="not-found-desc">We couldn't find this page. <span class="emoji">🚀</span></div>
    <a class="not-found-home-btn" href="/pages/index">Return to Home</a>
  </div>
</div>
    `;
        }

        setTimeout(() => {
            viewFrame.style.opacity = '1';
        }, 30);

        viewFrame.classList.remove('fade-out');
        viewFrame.classList.add('fade-in');
        highlightNav(frag, url);
    } catch (err) {
        showToast('Failed to load page', 'error');
        console.error('[navigateTo] Error:', err);
        viewFrame.innerHTML = `<div class="error-msg">Failed to load page.</div>`;
        viewFrame.style.opacity = '1';
        viewFrame.classList.remove('fade-out');
        viewFrame.classList.add('fade-in');
    }
}

// ================= DROPDOWN MENUS =================
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
            }, 500);
        });

        menu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                dropdown.classList.remove('open');
            });
        });
    });
}

// ================= SIDEBAR TOGGLE (HAMBURGER) =================
function setupSidebarHamburger() {
    const hamburger = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('pageOverlay');
    const body = document.body;

    if (hamburger && overlay) {
        hamburger.addEventListener('click', function () {
            const isOpen = !body.classList.contains('sidebar-open');
            body.classList.toggle('sidebar-open', isOpen);
            this.classList.toggle('opened', isOpen);
            this.setAttribute('aria-expanded', String(isOpen));
        });
        overlay.addEventListener('click', () => {
            body.classList.remove('sidebar-open');
            hamburger.classList.remove('opened');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            body.classList.remove('sidebar-open');
            hamburger?.classList.remove('opened');
            hamburger?.setAttribute('aria-expanded', 'false');
        }
    });

    // Global click-outside to close sidebar
    document.addEventListener('click', (e) => {
        if (!body.classList.contains('sidebar-open')) return;
        const sidebar = document.querySelector('nav.sidebar');
        if (sidebar && sidebar.contains(e.target)) return;
        if (hamburger && hamburger.contains(e.target)) return;
        body.classList.remove('sidebar-open');
        hamburger?.classList.remove('opened');
        hamburger?.setAttribute('aria-expanded', 'false');
    });
}

// ================= SPA NAVIGATION EVENT HANDLER =================
function setupNavigation() {
    buildSidebarSettingsSubMenu();
    setupDropdownMenus();

    // Initial highlight & route
    let path = location.pathname + location.search;
    let frag = '';
    if (/\/pages\/([a-zA-Z0-9_\-]+)/.test(path)) {
        frag = path.match(/\/pages\/([a-zA-Z0-9_\-]+)/)[1];
    } else if (/\/([a-zA-Z0-9_\-]+)$/.test(path)) {
        frag = path.match(/\/([a-zA-Z0-9_\-]+)$/)[1];
    }
    frag = frag.replace(/-/g, '_').replace(/\.html$/, '');
    highlightNav(frag, path);

    if (path !== '/' && !path.startsWith('/api') && !path.startsWith('/web/static')) {
        navigateTo(path);
    } else if (typeof showSplashScreen === 'function') {
        PAGE_LOADERS.index();
        const viewFrame = document.getElementById('viewFrame');
        if (viewFrame) viewFrame.style.opacity = '1';
    }

    // SPA navigation clicks
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('nav .menu a, .dropdown-toggle, .settings-section-link');
        if (!link || !link.href || link.origin !== location.origin) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
        e.preventDefault();

        const viewFrame = document.getElementById('viewFrame');
        const currentUrl = viewFrame?.dataset.currentUrl || location.pathname + location.search;
        const leavingSettings =
            currentUrl.includes('/pages/settings') &&
            !link.href.endsWith(currentUrl) &&
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
            }
            return;
        }

        document.body.classList.remove('sidebar-open');
        if (link.href.includes('/pages/settings?module_name=')) {
            history.pushState({}, '', link.href);
            await navigateTo(link.href, { pushState: false });
            highlightNav('settings', link.href);
            return;
        }
        history.pushState({}, '', link.href);
        navigateTo(link.href);
    });

    // Keyboard nav (Enter/Space triggers click)
    document.querySelectorAll('nav .menu a, .dropdown-toggle').forEach((link) => {
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                link.click();
            }
        });
    });
}

// ================= DOM READY: BOOTSTRAP APP =================
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupSidebarHamburger();
});
