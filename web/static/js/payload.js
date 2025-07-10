import { SETTINGS_SCHEMA } from './settings/settings_schema.js';

export async function buildNotificationPayload() {
    const form = document.getElementById('notification-modal-form');
    if (!form) return null;

    // 1. Get the latest notifications config block
    let notifications = {};
    try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        notifications =
            cfg.notifications && typeof cfg.notifications === 'object'
                ? JSON.parse(JSON.stringify(cfg.notifications))
                : {};
    } catch {
        notifications = {};
    }

    // 2. Detect type/module
    let type = null,
        module = null;
    if (form.querySelector('[name="webhook"]')) {
        type = form.querySelector('[name="channel_id"]') ? 'notifiarr' : 'discord';
    } else if (form.querySelector('[name="server"]')) {
        type = 'email';
    }
    const header = form.closest('.modal-content')?.querySelector('.modal-header h2');
    if (header) {
        const match = header.textContent.match(/(?:Edit|Add) ([^-]+) -/);
        if (match) module = match[1].trim().toLowerCase().replace(/\s+/g, '_');
    }

    // 3. Build notification object from form
    const notif = {};
    const missing = [];
    form.querySelectorAll('input, select').forEach((input) => {
        let val = input.value;
        if (input.type === 'checkbox') {
            val = input.checked;
        } else if (input.type === 'number' || input.getAttribute('type') === 'number') {
            val = val === '' ? null : parseInt(val, 10);
            if (!isNaN(val) && val !== null) notif[input.name] = val;
        }
        if (input.required && (val === '' || val == null || Number.isNaN(val))) {
            const label = input.closest('label')?.textContent || input.name;
            missing.push(`"${label}" is required`);
        }
        notif[input.name] = val;
    });
    if (missing.length) return { error: missing };

    // 4. Replace only the relevant module/type
    if (!notifications[module]) notifications[module] = {};
    notifications[module][type] = notif;

    // 5. Return the full notifications object
    return { notifications };
}

export async function buildSchedulePayload(module, time, remove = false) {
    let schedule = {};
    try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        schedule =
            cfg.schedule && typeof cfg.schedule === 'object'
                ? JSON.parse(JSON.stringify(cfg.schedule))
                : {};
    } catch {
        schedule = {};
    }

    if (remove) {
        delete schedule[module];
    } else {
        schedule[module] = time;
    }
    return { schedule };
}

export async function buildInstancesPayload(instances) {
    return { instances };
}

export async function buildSettingsPayload(moduleName) {
    const schema = SETTINGS_SCHEMA.find(s => s.key === moduleName);
    if (!schema) return null;
    const form = document.getElementById('settingsForm');
    if (!form) return null;

    // Get the current backend config, needed for fallback
    let rootConfig = {};
    try {
        const res = await fetch('/api/config');
        rootConfig = await res.json();
    } catch {
        rootConfig = {};
    }
    const prevConfig = rootConfig[moduleName] || {};

    const payload = {};
    for (const field of schema.fields) {
        let val;
        const el = form.querySelector(`[name="${field.key}"]`);

        // --- COMPLEX LIST HANDLING ---
        if (field.type === 'complex_list') {
            // Try UI getter first (for modals)
            let getterName = null, getterFn = null;
            switch (moduleName) {
                case 'sync_gdrive':
                    if (field.key === 'gdrive_list') getterFn = typeof getGdriveSyncData === 'function' ? getGdriveSyncData : null;
                    break;
                case 'labelarr':
                    if (field.key === 'mappings') getterFn = typeof getLabelarrData === 'function' ? getLabelarrData : null;
                    break;
                case 'upgradinatorr':
                    if (field.key === 'instances_list') getterFn = typeof getUpgradinatorrData === 'function' ? getUpgradinatorrData : null;
                    break;
                case 'border_replacerr':
                    if (field.key === 'holidays') getterFn = typeof getBorderReplacerrData === 'function' ? getBorderReplacerrData : null;
                    break;
            }
            if (!getterFn && typeof window === 'object') {
                getterName = 'get' + moduleName.replace(/(?:^|\_)(\w)/g, (_, c) => c.toUpperCase()) + 'Data';
                getterFn = window[getterName];
            }
            if (typeof getterFn === 'function') {
                val = getterFn();
            }
            // If still no value, fall back to previous config value!
            if (!val || (Array.isArray(val) && val.length === 0)) {
                val = prevConfig[field.key] || [];
            }
            payload[field.key] = val;
            continue;
        }

        // --- ALL OTHER FIELD TYPES ---
        if (field.type === 'slider') {
            val = el ? el.checked : false;
        } else if (field.type === 'number') {
            val = el ? parseInt(el.value, 10) : null;
            if (isNaN(val)) val = null;
        } else if (field.type === 'dropdown' || field.type === 'text') {
            val = el ? el.value : '';
        } else if (field.type === 'textarea') {
            val = el ? el.value.split('\n').map(v => v.trim()).filter(Boolean) : [];
        } else if (field.type === 'json') {
            if (el) {
                try {
                    val = JSON.parse(el.value);
                } catch {
                    val = el.value;
                }
            } else {
                val = '';
            }
        } else if (field.type === 'dir') {
            val = el ? el.value : '';
        } else if (field.type === 'dir_list' || field.type === 'dir_list_drag_drop') {
            const dirInputs = form.querySelectorAll(`[name="${field.key}"]`);
            val = Array.from(dirInputs).map(d => d.value.trim()).filter(Boolean);
        } else if (field.type === 'instances') {
            // For multi-select, collect checked/selected
            const instanceInputs = form.querySelectorAll(`[name="instances"]`);
            val = Array.from(instanceInputs).map(i => i.value).filter(Boolean);
        } else {
            val = el ? el.value : '';
        }

        // If value is undefined/null and exists in prevConfig, use previous
        if ((val === undefined || val === null || (Array.isArray(val) && val.length === 0)) && prevConfig[field.key] !== undefined) {
            val = prevConfig[field.key];
        }
        payload[field.key] = val;
    }

    // --- SPECIAL MODULE POST-PROCESSING ---
    if (moduleName === 'nohl') {
        // Build source_dirs as array of { path, mode }
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0) {
            payload.source_dirs = Array.from(sourceFields)
                .map(sub => {
                    const pathInput = sub.querySelector('input[name="source_dirs"]');
                    const select = sub.querySelector('select[name="mode"]');
                    const path = pathInput ? pathInput.value.trim() : '';
                    const mode = select && select.value ? select.value : 'scan';
                    if (!path) return null;
                    return { path, mode };
                })
                .filter(Boolean);
        } else if (prevConfig.source_dirs) {
            payload.source_dirs = prevConfig.source_dirs;
        } else {
            payload.source_dirs = [];
        }
    }

    return { [moduleName]: payload };
}