// ===== Payload Builders & Validation =====
window.DAPS = window.DAPS || {};

// Notifications
window.DAPS.buildNotificationPayload = async function() {
    const form = document.getElementById('notificationsForm');
    if (!form) return null;
    const DEFINITIONS = window.NOTIFICATION_DEFINITIONS || {};
    const result = {};
    const missing = [];
    document.querySelectorAll('.notification-card').forEach(card => {
        const module = card.querySelector('.notification-card-header')?.textContent
            ?.toLowerCase().replace(/\s+/g, '_');
        if (!module) return;
        const moduleObj = {};
        const toggles = Array.from(card.querySelectorAll('.toggle-switch input'));
        toggles.forEach(toggle => {
            const m = toggle.name.match(new RegExp(`^${module}_(.+)$`));
            if (!m) return;
            const type = m[1], def = DEFINITIONS[type], fields = {};
            if (def?.fields && toggle.checked) {
                def.fields.forEach(fd => {
                    const input = form.querySelector(`[name="${type}_${fd.key}_${module}"]`);
                    if (!input) return;
                    let val = input.type === 'checkbox' ? input.checked
                        : input.tagName === 'TEXTAREA' ? input.value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean)
                        : input.type === 'number' ? Number(input.value)
                        : input.value.trim();
                    if (fd.required && (val === "" || (Array.isArray(val)&&!val.length))) {
                        missing.push(`${module}: ${type} – ${fd.label}`);
                    }
                    if (fd.key === 'channel_id' && (isNaN(val) || !Number.isInteger(Number(val)))) {
                        missing.push(`${module}: ${type} – ${fd.label} must be integer`);
                    }
                    fields[fd.key] = val;
                });
                moduleObj[type] = fields;
            } else if (toggle.checked) {
                moduleObj[type] = {};
            }
        });
        result[module] = moduleObj;
    });
    if (missing.length) return null;
    return { notifications: result };
};

// Schedule validator + builder
window.DAPS.isValidSchedule = function(val) {
    if (!val) return true;
    if (/^hourly\(\d{2}\)$/i.test(val)) return true;
    if (/^daily\(\d{2}:\d{2}(?:\|\d{2}:\d{2})*\)$/i.test(val)) return true;
    if (/^weekly\([a-z]+@\d{2}:\d{2}(?:\|[a-z]+@\d{2}:\d{2})*\)$/i.test(val)) return true;
    if (/^monthly\(\d{1,2}@\d{2}:\d{2}(?:\|\d{1,2}@\d{2}:\d{2})*\)$/i.test(val)) return true;
    if (/^cron\([^\)]+\)$/i.test(val)) return true;
    return false;
};
window.DAPS.buildSchedulePayload = async function() {
    const form = document.getElementById('scheduleForm');
    if (!form) return null;
    const data = new FormData(form), out = {}, missing = [], firstEl = null;
    for (const [k,v] of data.entries()) {
        out[k] = v.trim()||null;
        if (v.trim() && !window.DAPS.isValidSchedule(v.trim())) {
            const inp = form.querySelector(`[name="${k}"]`);
            if (inp) {
                inp.classList.add('input-invalid');
                if (!firstEl) firstEl = inp;
                setTimeout(()=>inp.classList.remove('input-invalid'),2000);
            }
            missing.push(k);
        }
    }
    if (missing.length) return null;
    return { schedule: out };
};

// Instances builder
window.DAPS.buildInstancesPayload = async function() {
    const form = document.getElementById('instancesForm');
    if (!form) return null;
    const out = {};
    document.querySelectorAll('.category').forEach(sec => {
        const svc = sec.querySelector('h2')?.textContent.toLowerCase().replace(/ /g,'_');
        out[svc] = {};
        sec.querySelectorAll('.instance-entry').forEach(ent => {
            const name = ent.querySelector('input[name$="__name"]').value.trim();
            const url  = ent.querySelector('input[name$="__url"]').value.trim();
            const api  = ent.querySelector('input[name$="__api"]').value.trim();
            if (name) out[svc][name] = {url, api};
        });
    });
    if (!Object.values(out).some(o=>Object.keys(o).length)) return null;
    return { instances: out };
};

window.DAPS.buildSettingsPayload = function(moduleName) 
{
    function fillPayloadFromFormData(data, payload, excludeKeys = [])
    {
        for (const [key, val] of data.entries())
        {
            if (excludeKeys.includes(key)) continue;
            if (BOOL_FIELDS.includes(key))
            {
                payload[key] = val === 'true';
            }
            else if (INT_FIELDS.includes(key))
            {
                payload[key] = parseInt(val, 10) || 0;
            }
            else if (TEXTAREA_FIELDS.includes(key))
            {
                payload[key] = val.split('\n').map(s => s.trim()).filter(Boolean);
            }
            else if (JSON_FIELDS.includes(key))
            {
                try
                {
                    payload[key] = JSON.parse(val);
                }
                catch
                {
                    payload[key] = val;
                }
            }
            else
            {
                payload[key] = val;
            }
        }
    }

    function normalizeJsonStringKeysAndValues(jsonStr)
    {
        try
        {
            // If it's already valid JSON, just normalize it and return
            const parsed = JSON.parse(jsonStr);
            return JSON.stringify(parsed);
        }
        catch
        {
            // Step 1: Convert single-quoted values to double-quoted
            let normalized = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');
            // Step 2: Wrap unquoted keys in double quotes
            normalized = normalized.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
            // Step 3: Wrap unquoted string values in double quotes
            normalized = normalized.replace(/:\s*([^"{\[\]\s,]+)(?=\s*[,}])/g, (match, val) =>
            {
                const trimmed = val.trim();
                if (
                    /^".*"$/.test(trimmed) || // already double-quoted
                    /^[\d.eE+-]+$/.test(trimmed) || // number
                    /^(true|false|null)$/.test(trimmed) // bool/null
                )
                {
                    return match;
                }
                return `: "${trimmed}"`;
            });
            return normalized;
        }
    }
    const form = document.getElementById('settings-form');
    if (!form) return null;
    const data = new FormData(form);
    const payload = {};
    const excludeKeys = [];
    if (moduleName === 'nohl')
    {
        excludeKeys.push('mode', 'source_dirs');
    }
    if (moduleName === 'sync_gdrive')
    {
        try
        {
            const raw = data.get('token') || '{}';
            const fixed = normalizeJsonStringKeysAndValues(raw);
            payload.token = JSON.parse(fixed);
        }
        catch
        {
            alert('Invalid token JSON');
            return null;
        }
        payload.gdrive_list = (window.gdriveSyncData || []).filter(
            e => e && Object.keys(e).length > 0
        );
        excludeKeys.push('token', 'gdrive_list');
    }
    if (moduleName === 'labelarr')
    {
        payload.mappings = window.labelarrData || [];
    }
    if (moduleName === 'upgradinatorr')
    {
        payload.instances_list = window.upgradinatorrData
    }
    if (moduleName === 'border_replacerr')
    {
        const holidayArray = window.borderReplacerrData || [];
        const holidaysObj = {};
        holidayArray.forEach(entry =>
        {
            holidaysObj[entry.holiday] = {
                schedule: entry.schedule,
                color: entry.color
            };
        });
        const globalColorContainer = document.querySelector('#border-colors-container');
        const globalColorInputs = Array.from(globalColorContainer.children || [])
            .filter(el => el.classList.contains('subfield') && el.querySelector('input[type="color"]'))
            .flatMap(el => Array.from(el.querySelectorAll('input[type="color"]')));
        payload.border_colors = globalColorInputs
            .map(i => i.value)
            .filter((val, idx, arr) => arr.indexOf(val) === idx); // remove duplicates
        payload.holidays = holidaysObj;
    }
    if (moduleName === 'nohl')
    {
        // Structured {path,mode} payload
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0)
        {
            payload.source_dirs = Array.from(sourceFields)
                .map(sub =>
                {
                    const path = sub.querySelector('input[name="source_dirs"]')?.value.trim();
                    const mode = sub.querySelector('select[name="mode"]')?.value || 'resolve';
                    return path ?
                    {
                        path,
                        mode
                    } : null;
                })
                .filter(Boolean);
        }
    }
    else if (moduleName === 'jduparr')
    {
        // Legacy simple array of strings
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0)
        {
            payload.source_dirs = Array.from(sourceFields)
                .map(sub => sub.querySelector('input[name="source_dirs"]')?.value.trim())
                .filter(Boolean);
        }
    }
    const scalarInstances = data.getAll('instances');
    const nestedInstances = {};
    for (const [key, val] of data.entries())
    {
        const match = key.match(/^instances\.(.+?)\.library_names$/);
        if (match)
        {
            const inst = match[1];
            nestedInstances[inst] = nestedInstances[inst] ||
            {
                library_names: []
            };
            nestedInstances[inst].library_names.push(val);
        }
    }
    const combinedInstances = [
        ...scalarInstances,
        ...Object.entries(nestedInstances).map(([k, v]) => (
        {
            [k]: v
        }))
    ];
    excludeKeys.push('instances', ...Array.from(data.keys ? data.keys() : []).filter(k => k.startsWith('instances.')));
    fillPayloadFromFormData(data, payload, excludeKeys);
    // Collect all source_dirs inputs into an array, overriding any single value
    if (data.has('source_dirs')) {
        payload.source_dirs = data.getAll('source_dirs')
            .map(v => v.trim())
            .filter(Boolean);
    }
    if (combinedInstances.length > 0)
    {
        payload.instances = combinedInstances;
    }
    return { [moduleName]: payload };
};