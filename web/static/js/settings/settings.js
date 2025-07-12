import { fetchConfig, postConfig } from '../api.js';
import { buildSettingsPayload } from '../payload.js';
import { renderSettingsForm } from './dynamic_forms.js';
import { showToast, markDirty, resetDirty, getIsDirty } from '../util.js';
import { unsavedSettingsModal } from './modals.js';
import { SETTINGS_SCHEMA, SETTINGS_MODULES } from './settings_schema.js';
import { setTheme } from '../index.js';

// Tracks last loaded values for the current module, for dirty checking
let currentModule = null;
let lastLoadedConfig = {};
let currentConfig = {};

export async function loadSettings(moduleName) {
    currentModule = moduleName;

    // Fetch config
    const rootConfig = await fetchConfig();
    const moduleConfig = rootConfig[moduleName] || {};
    lastLoadedConfig = JSON.parse(JSON.stringify(moduleConfig));
    currentConfig = JSON.parse(JSON.stringify(moduleConfig));

    // Render form
    const formFields = document.getElementById('form-fields');
    renderSettingsForm(formFields, moduleName, currentConfig, rootConfig);

    // Set up dirty detection for any field change (for fields in schema)
    setupFormDirtyDetection(moduleName);

    // === Add this: Set up save button ===
    setupSettingsFormHandler();

    // Show form, hide splash
    document.querySelector('.settings-splash')?.classList.add('hidden');
    document.getElementById('settingsSaveBar')?.classList.remove('hidden');
    document.getElementById('settingsViewFrame')?.classList.remove('hidden');
    resetDirty();
}

export async function saveSettings() {
    if (!currentModule) return;
    const saveBtn = document.getElementById('saveBtnFixed');
    if (saveBtn) saveBtn.disabled = true;
    const payload = await buildSettingsPayload(currentModule, currentConfig);
    if (!payload) {
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    const { success, error } = await postConfig(payload);
    if (success) {
        showToast('Settings saved!', 'success');
        lastLoadedConfig = JSON.parse(JSON.stringify(payload[currentModule]));
        resetDirty();
        // Add this: re-apply theme if user_interface was updated
        if (currentModule === 'user_interface') setTheme();
    } else {
        showToast('Save failed: ' + error, 'error');
    }
    if (saveBtn) saveBtn.disabled = false;
}

// Attach this to form submit event
export function setupSettingsFormHandler() {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        await saveSettings();
    };
}

// Check if any schema-defined fields have changed
function isSettingsDirty(moduleName) {
    const schemaSection = getSchemaForModule(moduleName);
    if (!schemaSection) return false;
    const keys = schemaSection.fields.map(f => f.key);
    for (const key of keys) {
        const orig = lastLoadedConfig[key];
        const curr = getFormValue(key);
        if (JSON.stringify(orig) !== JSON.stringify(curr)) return true;
    }
    return false;
}

// Helper to fetch current form value for a field
function getFormValue(key) {
    const form = document.getElementById('settingsForm');
    if (!form) return undefined;
    const el = form.querySelector(`[name="${key}"]`);
    if (!el) return undefined;
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number') return el.value === '' ? null : parseInt(el.value, 10);
    if (el.tagName === 'TEXTAREA') return el.value;
    return el.value;
}

// Get the schema section for a module
function getSchemaForModule(moduleName) {
    return SETTINGS_SCHEMA.find(s => s.key === moduleName);
}

// Mark dirty when any schema-relevant field changes
function setupFormDirtyDetection(moduleName) {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.oninput = null;
        el.onchange = null;
    });

    const schema = getSchemaForModule(moduleName);
    if (!schema) return;

    schema.fields.forEach(field => {
        const el = form.querySelector(`[name="${field.key}"]`);
        if (!el) return;
        el.oninput = el.onchange = () => {
            if (isSettingsDirty(moduleName)) markDirty();
            else resetDirty();
        };
    });
}

// Main navigation handler for leaving settings section (call this BEFORE changing module)
export async function handleSettingsNavigation(newModuleName) {
    if (!currentModule || !getIsDirty()) {
        await loadSettings(newModuleName);
        return;
    }
    const choice = await unsavedSettingsModal();
    if (choice === 'save') {
        await saveSettings();
        await loadSettings(newModuleName);
    } else if (choice === 'discard') {
        resetDirty();
        await loadSettings(newModuleName);
    } // else 'cancel' = do nothing
}

export function renderSettingsSplash() {
    const container = document.getElementById('settings-section-list');
    if (!container) return;
    container.innerHTML = '';

    SETTINGS_MODULES.forEach((mod) => {
        const link = document.createElement('a');
        link.className = 'settings-section-link';
        link.href = `/pages/settings?module_name=${mod.key}`;
        link.setAttribute('tabindex', '0'); // For keyboard nav

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


        // Optional: Keyboard navigation (Enter triggers click)
        link.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });

        container.appendChild(link);
    });
}


