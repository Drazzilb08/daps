import { fetchConfig, postConfig } from '../api.js';
import { renderSettingsForm } from '../common/dynamic_forms.js';
import { showToast, markDirty, resetDirty, setTheme } from '../util.js';
import { SETTINGS_SCHEMA, SETTINGS_MODULES } from '../constants/settings_schema.js';
import { validateFields } from '../common/validation.js';

// Tracks last loaded values for the current module, for dirty checking
let currentModule = null;
let currentConfig = {};
let lastLoadedConfig = {};
let rootConfig = {};

/**
 * Main entry for settings page.
 * Call this with moduleName (string) or null for splash.
 */
export async function initSettings(moduleName) {
    ensureSettingsDOM();

    if (moduleName) {
        await loadSettings(moduleName);
    } else {
        renderSettingsSplash();
    }
}

/**
 * Ensures the splash and form DOM structure is present (idempotent).
 */
function ensureSettingsDOM() {
    const container =
        document.getElementById('viewFrame') || document.querySelector('.container-iframe');
    if (!container) return;

    // Remove all children except loader modal
    [...container.children].forEach((child) => {
        if (!child.classList.contains('poster-search-loader-modal')) {
            container.removeChild(child);
        }
    });

    // Splash (if missing)
    if (!container.querySelector('.settings-splash')) {
        const splash = document.createElement('div');
        splash.className = 'settings-splash';

        const title = document.createElement('h1');
        title.className = 'settings-splash-title';
        title.textContent = 'Settings';

        const sectionList = document.createElement('div');
        sectionList.className = 'settings-section-list';
        sectionList.id = 'settings-section-list';

        splash.appendChild(title);
        splash.appendChild(sectionList);
        container.appendChild(splash);
    }

    // Form (if missing)
    if (!container.querySelector('#settingsForm')) {
        const form = document.createElement('form');
        form.id = 'settingsForm';
        form.autocomplete = 'off';
        form.className = 'settings-form';
        container.appendChild(form);
    }
}

/**
 * Render the settings splash (module selection page).
 */
function renderSettingsSplash() {
    // Hide toolbar and form, show splash
    document.getElementById('settingsToolBar')?.classList.add('hidden');
    document.getElementById('settingsForm')?.classList.add('hidden');
    document.querySelector('.settings-splash')?.classList.remove('hidden');
    document.querySelector('.settings-splash-title')?.classList.remove('hidden');

    // Populate splash links
    const container = document.getElementById('settings-section-list');
    if (!container) return;
    container.innerHTML = '';
    SETTINGS_MODULES.forEach((mod) => {
        const link = document.createElement('a');
        link.className = 'settings-section-link';
        link.href = `/pages/settings?module_name=${mod.key}`;
        link.setAttribute('tabindex', '0');
        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'settings-section-title';
        titleDiv.textContent = mod.name;
        // Description
        const descDiv = document.createElement('div');
        descDiv.className = 'settings-section-desc';
        descDiv.textContent = mod.description;
        link.appendChild(titleDiv);
        link.appendChild(descDiv);
        // Keyboard navigation
        link.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        container.appendChild(link);
    });
}

/**
 * Load settings page for a given module.
 */
async function loadSettings(moduleName) {
    currentModule = moduleName;
    buildSettingsToolbar();

    // Update title in toolbar
    const schema = SETTINGS_SCHEMA.find((s) => s.key === moduleName);
    if (schema) {
        document.getElementById('settingsPageTitle').textContent = schema.label || moduleName;
    }

    // Fetch and load config
    const rootConfig = await fetchConfig();
    const moduleConfig = rootConfig[moduleName] || {};
    lastLoadedConfig = JSON.parse(JSON.stringify(moduleConfig));
    currentConfig = JSON.parse(JSON.stringify(moduleConfig));

    // Render form
    const form = document.getElementById('settingsForm');
    renderSettingsForm(form, moduleName, currentConfig, rootConfig);

    setupFormDirtyDetection(moduleName);
    setupSettingsFormHandler();

    // Show form, hide splash
    document.querySelector('.settings-splash')?.classList.add('hidden');
    document.querySelector('.settings-splash-title')?.classList.add('hidden');
    document.getElementById('settingsToolBar')?.classList.remove('hidden');
    document.getElementById('settingsForm')?.classList.remove('hidden');

    resetDirty();
}

/**
 * Build the settings toolbar with Save button.
 */
function buildSettingsToolbar() {
    const form = document.getElementById('settingsForm');
    const parent = form.parentNode;
    // Remove existing
    const oldToolbar = parent.querySelector('.settings-toolbar-bar');
    if (oldToolbar) oldToolbar.remove();

    // Build toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'settings-toolbar-bar';
    toolbar.id = 'settingsToolBar';

    const title = document.createElement('span');
    title.className = 'settings-page-title';
    title.id = 'settingsPageTitle';

    const saveBtn = document.createElement('button');
    saveBtn.id = 'saveBtnFixed';
    saveBtn.type = 'submit';
    saveBtn.setAttribute('form', 'settingsForm');
    saveBtn.className = 'settings-toolbar-btn';
    saveBtn.setAttribute('aria-label', 'Save');
    saveBtn.title = 'Save changes';
    saveBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
           style="margin-right: 7px; vertical-align: middle;">
        <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4z"/>
        <polyline points="17 3 17 8 7 8 7 3"/>
        <rect x="8" y="13" width="8" height="5" rx="1"/>
      </svg>
      <span class="save-btn-label">Save</span>
    `;

    toolbar.appendChild(title);
    toolbar.appendChild(saveBtn);

    // Insert before the form
    parent.insertBefore(toolbar, form);
}

/**
 * Save settings for the current module.
 */
export async function saveSettings() {
    if (!currentModule) return;
    const saveBtn = document.getElementById('saveBtnFixed');
    if (saveBtn) saveBtn.disabled = true;

    const payload = { [currentModule]: currentConfig };

    if (!payload) {
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    const formFields = document.getElementById('settingsForm');
    const schema = getSchemaForModule(currentModule);
    const errorFields = validateFields(schema.fields, formFields, { rootConfig, isModal: false });
    if (errorFields.length > 0) {
        showToast('Please fill out all required fields.', 'error');
        // Optionally scroll to first error
        const errEl = formFields.querySelector('.input-error, .field-error');
        if (errEl) errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (saveBtn) saveBtn.disabled = false;
        return; // Don't save!
    }
    const { success, error } = await postConfig(payload);

    if (success) {
        showToast('Settings saved!', 'success');
        lastLoadedConfig = JSON.parse(JSON.stringify(currentConfig));
        resetDirty();
        if (currentModule === 'user_interface') setTheme();
    } else {
        showToast('Save failed: ' + error, 'error');
    }
    if (saveBtn) saveBtn.disabled = false;
    return { success, error };
}

/**
 * Set up form submit/save handler.
 */
function setupSettingsFormHandler() {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        await saveSettings();
    };
}

/**
 * Get the schema for a module.
 */
function getSchemaForModule(moduleName) {
    return SETTINGS_SCHEMA.find((s) => s.key === moduleName);
}

/**
 * Set up dirty detection for any relevant schema field.
 */
function setupFormDirtyDetection(moduleName) {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    const schema = getSchemaForModule(moduleName);
    if (!schema) return;

    // Listen for input/change events (including dynamic fields)
    form.addEventListener('input', markDirty, true);
    form.addEventListener('change', markDirty, true);

    form.querySelectorAll('input, select, textarea').forEach((el) => {
        el.oninput = null;
        el.onchange = null;
    });

    schema.fields.forEach((field) => {
        const el = form.querySelector(`[name="${field.key}"]`);
        if (!el) return;
        el.oninput = el.onchange = () => {
            let value = el.type === 'checkbox' ? el.checked : el.value;
            if (el.type === 'number') value = el.value === '' ? null : parseInt(el.value, 10);
            currentConfig[field.key] = value;
            markDirty();
        };
    });
}

export function buildSidebarSettingsSubMenu() {
    const subMenu = document.getElementById('sidebarSettingsSubMenu');
    if (!subMenu) return;

    subMenu.innerHTML = '';
    SETTINGS_MODULES.forEach((mod) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `/pages/settings?module_name=${mod.key}`;
        a.className = 'sub-section';
        a.textContent = mod.name || mod.key;
        li.appendChild(a);
        subMenu.appendChild(li);
    });
}
