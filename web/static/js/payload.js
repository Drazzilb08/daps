import { SETTINGS_SCHEMA } from './settings/settings_schema.js';
import { fetchConfig } from './api.js';

export async function buildNotificationPayload() {
    const form = document.getElementById('notification-modal-form');
    if (!form) return null;

    // 1. Get the latest notifications config block
    let notifications = {};
    const cfg = await fetchConfig();
    notifications =
        cfg.notifications && typeof cfg.notifications === 'object'
            ? JSON.parse(JSON.stringify(cfg.notifications))
            : {};

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
    const cfg = await fetchConfig();
    schedule =
        cfg.schedule && typeof cfg.schedule === 'object'
            ? JSON.parse(JSON.stringify(cfg.schedule))
            : {};

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

export async function buildSettingsPayload(moduleName, liveConfig = null) {
    const schema = SETTINGS_SCHEMA.find(s => s.key === moduleName);
    if (!schema) return null;
    const form = document.getElementById('settingsForm');
    if (!form) return null;

    // Get the current backend config for fallback
    const rootConfig = await fetchConfig();
    const prevConfig = rootConfig[moduleName] || {};

    const payload = {};
    for (const field of schema.fields) {
        let val;
        const el = form.querySelector(`[name="${field.key}"]`);

        // ----------- COMPLEX LIST LOGIC -----------
        if (field.type === 'complex_list') {
            // Get the source of truth: liveConfig (modal-edited), else prevConfig, else []
            let complexList = [];
            if (liveConfig && Array.isArray(liveConfig[field.key])) {
                complexList = liveConfig[field.key];
            } else if (prevConfig[field.key]) {
                complexList = prevConfig[field.key];
            }
            // Canonicalize: only keep keys in schema.fields, and in defined order
            const canonicalKeys = (field.fields || []).map(f => f.key);

            val = (complexList || []).map(item => {
                const out = {};
                // Special handling for upgradinatorr: do not emit season_monitored_threshold unless Sonarr instance
                const instanceValue = (item.instance || '').toLowerCase();
                for (const key of canonicalKeys) {
                    // Border replacerr holiday: color/colors migration (backcompat)
                    if (moduleName === 'border_replacerr' && field.key === 'holidays' && key === 'color' && 'colors' in item && !('color' in item)) {
                        out['color'] = item.colors;
                    }
                    // Upgradinatorr: Only keep season_monitored_threshold if instance is sonarr
                    else if (
                        moduleName === 'upgradinatorr' &&
                        field.key === 'instances_list' &&
                        key === 'season_monitored_threshold' &&
                        !instanceValue.includes('sonarr')
                    ) {
                        continue;
                    }
                    else {
                        out[key] = item[key];
                    }
                }
                return out;
            });
            payload[field.key] = val;
            continue;
        }

        // --- COLOR LIST FIELD (NEW HANDLING) ---
        if (field.type === 'color_list') {
            const colorInputs = form.querySelectorAll(
                `.field-color-list input[name="${field.key}"], .field-color-list input[type="color"]`
            );
            val = Array.from(colorInputs)
                .map(input => input.value)
                .filter(Boolean);
            if (!val.length) val = [];
            payload[field.key] = val;
            continue;
        }

        // --- ALL OTHER FIELD TYPES ---
        if (field.type === 'slider') {
            val = el ? el.checked : false;
        } else if  (field.type === 'check_box') {
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
            if (!val.length) val = [];
        } else if (field.type === 'instances') {
            const instanceInputs = form.querySelectorAll(`[name="instances"]`);
            val = Array.from(instanceInputs).map(i => i.value).filter(Boolean);
        } else {
            val = el ? el.value : '';
        }

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