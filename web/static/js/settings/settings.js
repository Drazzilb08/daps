import { fetchConfig, postConfig } from '../api.js';
import { renderSettingsForm } from './dynamic_forms.js';
import { showToast, markDirty, resetDirty } from '../util.js';
import { SETTINGS_SCHEMA, SETTINGS_MODULES } from './settings_schema.js';
import { setTheme } from '../index.js';

// Tracks last loaded values for the current module, for dirty checking
let currentModule = null;
let lastLoadedConfig = {};
let currentConfig = {};

// --- Load settings for a given module ---
export async function loadSettings(moduleName) {
    currentModule = moduleName;
    const schema = SETTINGS_SCHEMA.find((s) => s.key === moduleName);
    if (schema) {
        document.getElementById('settingsPageTitle').textContent = schema.label || moduleName;
    }

    // Fetch config
    const rootConfig = await fetchConfig();
    const moduleConfig = rootConfig[moduleName] || {};
    lastLoadedConfig = JSON.parse(JSON.stringify(moduleConfig));
    currentConfig = JSON.parse(JSON.stringify(moduleConfig));

    // Render form
    const form = document.getElementById('settingsForm');
    renderSettingsForm(form, moduleName, currentConfig, rootConfig);

    // Set up dirty detection for any field change (for fields in schema)
    setupFormDirtyDetection(moduleName);

    // Set up save button handler
    setupSettingsFormHandler();

    // Show form, hide splash
    document.querySelector('.settings-splash')?.classList.add('hidden');
    document.getElementById('settingsToolBar')?.classList.remove('hidden');
    document.getElementById('settingsForm')?.classList.remove('hidden');

    resetDirty(); // Not dirty after initial load
}

// --- Save settings for current module ---
export async function saveSettings() {
    if (!currentModule) return;
    const saveBtn = document.getElementById('saveBtnFixed');
    if (saveBtn) saveBtn.disabled = true;

    // const payload = await buildSettingsPayload(currentModule, currentConfig);
    const payload = { [currentModule]: currentConfig };

    if (!payload) {
        if (saveBtn) saveBtn.disabled = false;
        return;
    }
    const formFields = document.getElementById('settingsForm');
    const schema = getSchemaForModule(currentModule);
    const errorFields = validateSettingsFields(schema.fields, formFields);
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

// --- Set up form save button handler ---
export function setupSettingsFormHandler() {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        await saveSettings();
    };
}

// --- Get the schema section for a module ---
function getSchemaForModule(moduleName) {
    return SETTINGS_SCHEMA.find((s) => s.key === moduleName);
}

// --- Mark dirty when any schema-relevant field changes ---
function setupFormDirtyDetection(moduleName) {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    const schema = getSchemaForModule(moduleName);
    if (!schema) return;

    // --- ADD THIS: ---
    // Listen for input/change events from any descendant field (including dynamic/array fields)
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
            // Always update currentConfig when a value changes!
            let value = el.type === 'checkbox' ? el.checked : el.value;
            if (el.type === 'number') value = el.value === '' ? null : parseInt(el.value, 10);
            currentConfig[field.key] = value;

            markDirty();
        };
    });
}

// --- Render the splash/settings list ---
export function renderSettingsSplash() {
    // Hide toolbar and view frame when showing splash
    document.getElementById('settingsToolBar')?.classList.add('hidden');
    document.getElementById('settingsForm')?.classList.add('hidden');
    // Show splash
    document.querySelector('.settings-splash')?.classList.remove('hidden');

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
        link.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });

        container.appendChild(link);
    });
}

// settings_validation.js

/**
 * Validate fields for settings (global, not just modals).
 * Returns an array of error field keys.
 */
export function validateSettingsFields(schema, container) {
    const errorFields = [];

    schema.forEach((field) => {
        // ---- INSTANCES FIELD (plex/radarr/sonarr special validation) ----
        if (field.type === 'instances' && field.required) {
            let foundValid = false;

            // --- Plex: at least one instance checked and at least one library per checked instance ---
            if (field.instance_types && field.instance_types.includes('plex')) {
                const plexBlocks = container.querySelectorAll('.plex-instance-card');
                let plexInstanceSelected = false;
                let plexMissingLibraries = false;

                plexBlocks.forEach((block) => {
                    // Checkbox
                    const chkLabel = block.querySelector('.instance-checkbox-container');
                    const chk = chkLabel ? chkLabel.querySelector('input[type="checkbox"]') : null;

                    if (chk && chk.checked) {
                        plexInstanceSelected = true;

                        // Library selection
                        const libraryChecks = block.querySelectorAll(
                            '.instance-library-list input[type="checkbox"]'
                        );
                        const anyLibChecked = Array.from(libraryChecks).some((l) => l.checked);

                        // Show/hide errors for library selection
                        const libList = block.querySelector('.instance-library-list');
                        if (!anyLibChecked) {
                            plexMissingLibraries = true;
                            libraryChecks.forEach((libChk) => libChk.classList.add('input-error'));
                            if (libList && !libList.querySelector('.field-error-text')) {
                                const err = document.createElement('div');
                                err.className = 'field-error-text';
                                err.textContent = 'At least one library must be selected.';
                                libList.appendChild(err);
                            }
                        } else {
                            libraryChecks.forEach((libChk) =>
                                libChk.classList.remove('input-error')
                            );
                            if (libList) {
                                const err = libList.querySelector('.field-error-text');
                                if (err) err.remove();
                            }
                        }
                    } else if (chk) {
                        // Clean up errors on unchecked instances
                        const libraryChecks = block.querySelectorAll(
                            '.instance-library-list input[type="checkbox"]'
                        );
                        libraryChecks.forEach((libChk) => libChk.classList.remove('input-error'));
                        const libList = block.querySelector('.instance-library-list');
                        if (libList) {
                            const err = libList.querySelector('.field-error-text');
                            if (err) err.remove();
                        }
                    }
                });

                // Plex instance must be selected
                if (!plexInstanceSelected) {
                    plexBlocks.forEach((block) => {
                        block.classList.add('field-error');
                        const header = block.querySelector('.instance-header');
                        if (header && !header.querySelector('.field-error-text')) {
                            const err = document.createElement('div');
                            err.className = 'field-error-text';
                            err.textContent = `${field.label} cannot be empty.`;
                            header.appendChild(err);
                        }
                    });
                } else {
                    plexBlocks.forEach((block) => {
                        block.classList.remove('field-error');
                        const header = block.querySelector('.instance-header');
                        if (header) {
                            const err = header.querySelector('.field-error-text');
                            if (err) err.remove();
                        }
                    });
                }

                if (!plexInstanceSelected || plexMissingLibraries) {
                    errorFields.push(field.key);
                }
                if (plexInstanceSelected && !plexMissingLibraries) {
                    foundValid = true;
                }
            }

            // --- Radarr/Sonarr: at least one checked ---
            if (
                field.instance_types &&
                (field.instance_types.includes('radarr') || field.instance_types.includes('sonarr'))
            ) {
                const allCols = container.querySelectorAll('.instance-type-col');
                let anyChecked = false;
                allCols.forEach((col) => {
                    const chks = col.querySelectorAll('input[type="checkbox"]');
                    if (Array.from(chks).some((chk) => chk.checked)) {
                        anyChecked = true;
                    }
                });
                if (!anyChecked) {
                    allCols.forEach((col) => {
                        col.classList.add('field-error');
                        if (!col.querySelector('.field-error-text')) {
                            const err = document.createElement('div');
                            err.className = 'field-error-text';
                            err.textContent = `${field.label} cannot be empty.`;
                            col.appendChild(err);
                        }
                    });
                    errorFields.push(field.key);
                } else {
                    allCols.forEach((col) => {
                        col.classList.remove('field-error');
                        const err = col.querySelector('.field-error-text');
                        if (err) err.remove();
                    });
                    foundValid = true;
                }
            }
            return; // Skip default logic for this field
        }

        // ---- GENERIC REQUIRED FIELD VALIDATION ----
        if (field.required) {
            // Try to find the input(s) for this field
            const input = container.querySelector(`[name="${field.key}"]`);
            let isEmpty = false;

            if (input) {
                isEmpty = input.value === '' || input.value == null;
            } else if (field.type === 'color_list') {
                const colorInputs = container.querySelectorAll(
                    '.field-color-list input[type="color"]'
                );
                isEmpty = Array.from(colorInputs).filter((i) => i.value).length === 0;
            } else if (field.type && field.type.startsWith('dir_')) {
                // Directory list type: at least one non-empty input
                const dirInputs = container.querySelectorAll(`input[name="${field.key}"]`);
                isEmpty = Array.from(dirInputs).every((inp) => !inp.value);
            } else {
                isEmpty = true;
            }

            // Find wrapper for error message placement
            const wrapper = input?.closest('.settings-field-inputwrap, div');
            if (isEmpty) {
                errorFields.push(field.key);
                if (input) input.classList.add('input-error');
                if (wrapper && !wrapper.querySelector('.field-error-text')) {
                    const err = document.createElement('div');
                    err.className = 'field-error-text';
                    err.textContent = field.label
                        ? `${field.label} cannot be empty.`
                        : 'This field cannot be empty.';
                    wrapper && wrapper.appendChild(err);
                }
            } else {
                if (input) input.classList.remove('input-error');
                if (wrapper) {
                    const err = wrapper.querySelector('.field-error-text');
                    if (err) err.remove();
                }
            }
        }
    });

    return errorFields;
}

function buildSettingsToolbar() {
    // Remove any existing toolbar in the form (avoid duplicates)
    const form = document.getElementById('settingsForm');
    const oldToolbar = form.querySelector('.settings-toolbar-bar');
    if (oldToolbar) oldToolbar.remove();

    // Create the toolbar element
    const toolbar = document.createElement('div');
    toolbar.className = 'settings-toolbar-bar';
    toolbar.id = 'settingsToolBar';

    const title = document.createElement('span');
    title.className = 'settings-page-title';
    title.id = 'settingsPageTitle';
    title.textContent = 'Settings'; // Will be updated by loadSettings

    const saveBtn = document.createElement('button');
    saveBtn.id = 'saveBtnFixed';
    saveBtn.type = 'submit';
    saveBtn.form = 'settingsForm';
    saveBtn.className = 'settings-toolbar-btn';
    saveBtn.setAttribute('aria-label', 'Save');
    saveBtn.title = 'Save changes';

    // SVG icon for save
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

    // Assemble toolbar
    toolbar.appendChild(title);
    toolbar.appendChild(saveBtn);

    // Insert as first child of settingsForm
    form.prepend(toolbar);
}
