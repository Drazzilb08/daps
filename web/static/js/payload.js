import { BOOL_FIELDS, INT_FIELDS, TEXTAREA_FIELDS, JSON_FIELDS } from './settings/constants.js';
import { getBorderReplacerrData } from './settings/modules/border_replacerr.js';
import { getLabelarrData } from './settings/modules/labelarr.js';
import { getGdriveSyncData } from './settings/modules/sync_gdrive.js';
import { getUpgradinatorrData } from './settings/modules/upgradinatorr.js';

export async function buildNotificationPayload() {
    const form = document.getElementById('notification-modal-form');
    if (!form) return null;

    // 1. Get the latest notifications config block
    let notifications = {};
    try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        notifications = (cfg.notifications && typeof cfg.notifications === 'object')
            ? JSON.parse(JSON.stringify(cfg.notifications))
            : {};
    } catch {
        notifications = {};
    }

    // 2. Detect type/module
    let type = null, module = null;
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
    form.querySelectorAll('input, select').forEach(input => {
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
        schedule = (cfg.schedule && typeof cfg.schedule === 'object')
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
    function fillPayloadFromFormData(data, payload, excludeKeys = []) {
        for (const [key, val] of data.entries()) {
            if (excludeKeys.includes(key)) continue;
            if (BOOL_FIELDS.includes(key)) {
                payload[key] = val === 'true';
            } else if (INT_FIELDS.includes(key)) {
                payload[key] = parseInt(val, 10) || 0;
            } else if (TEXTAREA_FIELDS.includes(key)) {
                payload[key] = val
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean);
            } else if (JSON_FIELDS.includes(key)) {
                try {
                    payload[key] = JSON.parse(val);
                } catch {
                    payload[key] = val;
                }
            } else {
                payload[key] = val;
            }
        }
    }

    function normalizeJsonStringKeysAndValues(jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            return JSON.stringify(parsed);
        } catch {
            let normalized = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');

            normalized = normalized.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

            normalized = normalized.replace(/:\s*([^"{\[\]\s,]+)(?=\s*[,}])/g, (match, val) => {
                const trimmed = val.trim();
                if (
                    /^".*"$/.test(trimmed) || // already double-quoted
                    /^[\d.eE+-]+$/.test(trimmed) || // number
                    /^(true|false|null)$/.test(trimmed) // bool/null
                ) {
                    return match;
                }
                return `: "${trimmed}"`;
            });
            return normalized;
        }
    }
    const form = document.getElementById('settingsForm');
    if (!form) return null;
    const data = new FormData(form);
    const payload = {};
    const excludeKeys = [];
    if (moduleName === 'nohl') {
        excludeKeys.push('mode', 'source_dirs');
    }
    if (moduleName === 'sync_gdrive') {
        try {
            const raw = data.get('token') || '{}';
            const fixed = normalizeJsonStringKeysAndValues(raw);
            payload.token = JSON.parse(fixed);
        } catch {
            alert('Invalid token JSON');
            return null;
        }
        payload.gdrive_list = (getGdriveSyncData() || []).filter(
            (e) => e && Object.keys(e).length > 0
        );
        excludeKeys.push('token', 'gdrive_list');
    }
    if (moduleName === 'labelarr') {
        payload.mappings = getLabelarrData() || [];
    }
    if (moduleName === 'upgradinatorr') {
        payload.instances_list = getUpgradinatorrData();
    }
    if (moduleName === 'border_replacerr') {
        const holidayArray = getBorderReplacerrData() || [];
        const holidaysObj = {};
        holidayArray.forEach((entry) => {
            holidaysObj[entry.holiday] = {
                schedule: entry.schedule,
                color: entry.color,
            };
        });
        const globalColorContainer = document.querySelector('#border-colors-container');
        const globalColorInputs = Array.from(globalColorContainer.children || [])
            .filter(
                (el) => el.classList.contains('subfield') && el.querySelector('input[type="color"]')
            )
            .flatMap((el) => Array.from(el.querySelectorAll('input[type="color"]')));
        payload.border_colors = globalColorInputs
            .map((i) => i.value)
            .filter((val, idx, arr) => arr.indexOf(val) === idx); // remove duplicates
        payload.holidays = holidaysObj;
    }
    if (moduleName === 'nohl') {
        // Always output source_dirs as array of {path, mode} for nohl, matching fields order
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0) {
            payload.source_dirs = Array.from(sourceFields)
                .map((sub) => {
                    const pathInput = sub.querySelector('input[name="source_dirs"]');
                    const select = sub.querySelector('select[name="mode"]');
                    const path = pathInput ? pathInput.value.trim() : '';
                    // Always default mode to 'scan' if not set
                    const mode = select && select.value ? select.value : 'scan';
                    if (!path) return null;
                    return { path, mode };
                })
                .filter(Boolean);
        } else {
            payload.source_dirs = [];
        }
    } else if (moduleName === 'jduparr') {
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0) {
            payload.source_dirs = Array.from(sourceFields)
                .map((sub) => sub.querySelector('input[name="source_dirs"]')?.value.trim())
                .filter(Boolean);
        }
    }
    const scalarInstances = data.getAll('instances');
    const nestedInstances = {};
    for (const [key, val] of data.entries()) {
        const match = key.match(/^instances\.(.+?)\.library_names$/);
        if (match) {
            const inst = match[1];
            nestedInstances[inst] = nestedInstances[inst] || {
                library_names: [],
            };
            nestedInstances[inst].library_names.push(val);
        }
    }
    if (moduleName === 'poster_renamerr') {
        // Find all keys like add_posters_{plexname} in form data
        const allPlex = Object.keys(nestedInstances);
        allPlex.forEach((plex) => {
            // For each plex instance, set add_posters to true/false
            // If checkbox is not present (not checked), default to false
            const checked = data.get(`add_posters_${plex}`) === 'on';
            nestedInstances[plex].add_posters = checked;
        });
        // Exclude all add_posters_* keys from payload to avoid flat fields like add_posters_plex_1: 'on'
        for (const key of data.keys()) {
            if (key.startsWith('add_posters_')) {
                excludeKeys.push(key);
            }
        }
    }
    const combinedInstances = [
        ...scalarInstances,
        ...Object.entries(nestedInstances).map(([k, v]) => {
            // Build new obj with desired key order
            const o = {};
            if (typeof v.add_posters !== 'undefined') o.add_posters = v.add_posters;
            if (Array.isArray(v.library_names)) o.library_names = v.library_names;
            return { [k]: o };
        }),
    ];
    excludeKeys.push(
        'instances',
        ...Array.from(data.keys ? data.keys() : []).filter((k) => k.startsWith('instances.'))
    );
    fillPayloadFromFormData(data, payload, excludeKeys);

    // For nohl, do not apply legacy fallback for source_dirs (handled above).
    if (moduleName !== 'nohl' && data.has('source_dirs')) {
        payload.source_dirs = data
            .getAll('source_dirs')
            .map((v) => v.trim())
            .filter(Boolean);
    }
    if (combinedInstances.length > 0) {
        payload.instances = combinedInstances;
    }
    return {
        [moduleName]: payload,
    };
}
