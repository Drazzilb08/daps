import { attachTooltip } from '../../util.js';
export const holidayPresetsList = [
    {
        name: "🎆 New Year's Day",
        schedule: 'range(12/30-01/02)',
        colors: ['#00BFFF', '#FFD700'],
    },
    {
        name: "💘 Valentine's Day",
        schedule: 'range(02/05-02/15)',
        colors: ['#D41F3A', '#FFC0CB'],
    },
    {
        name: '🐣 Easter',
        schedule: 'range(03/31-04/02)',
        colors: ['#FFB6C1', '#87CEFA', '#98FB98'],
    },
    {
        name: "🌸 Mother's Day",
        schedule: 'range(05/10-05/15)',
        colors: ['#FF69B4', '#FFDAB9'],
    },
    {
        name: "👨‍👧‍👦 Father's Day",
        schedule: 'range(06/15-06/20)',
        colors: ['#1E90FF', '#4682B4'],
    },
    {
        name: '🗽 Independence Day',
        schedule: 'range(07/01-07/05)',
        colors: ['#FF0000', '#FFFFFF', '#0000FF'],
    },
    {
        name: '🧹 Labor Day',
        schedule: 'range(09/01-09/07)',
        colors: ['#FFD700', '#4682B4'],
    },
    {
        name: '🎃 Halloween',
        schedule: 'range(10/01-10/31)',
        colors: ['#FFA500', '#000000'],
    },
    {
        name: '🦃 Thanksgiving',
        schedule: 'range(11/01-11/30)',
        colors: ['#FFA500', '#8B4513'],
    },
    {
        name: '🎄 Christmas',
        schedule: 'range(12/01-12/31)',
        colors: ['#FF0000', '#00FF00'],
    },
];

export function renderHolidayPresetsField(field, immediateData, moduleConfig) {
    // 1. Collect names already in moduleConfig.holidays (or whatever array key)
    const addedNames = Array.isArray(moduleConfig?.holidays)
        ? moduleConfig.holidays.map((entry) => entry?.name).filter(Boolean)
        : [];

    // 2. Build DOM: row > labelCol + inputWrap
    const row = document.createElement('div');
    row.className = 'settings-field-row modal-field-row';

    // Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol modal-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label || 'Preset';
    label.setAttribute('for', 'holiday-preset');
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // Input column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap modal-field-inputwrap';

    // Select
    const select = document.createElement('select');
    select.id = 'holiday-preset';
    select.className = 'select';

    select.innerHTML =
        '<option value="">Select preset...</option>' +
        holidayPresetsList
            .map((preset) => {
                const alreadyAdded = addedNames.includes(preset.name);
                const label = alreadyAdded ? `${preset.name} (Already Added)` : preset.name;
                return `<option value="${preset.name}"${
                    alreadyAdded ? ' disabled class="disabled-option"' : ''
                }>${label}</option>`;
            })
            .join('');

    inputWrap.appendChild(select);

    // Optional help text
    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);

    // Pre-select value if editing
    if (
        immediateData &&
        typeof immediateData === 'object' &&
        immediateData.name &&
        holidayPresetsList.some((p) => p.name === immediateData.name)
    ) {
        select.value = immediateData.name;
    }

    // Change logic: Populate modal fields when a preset is picked
    select.onchange = function () {
        const presetLabel = select.value;
        const modal = select.closest('.modal-content');
        if (!presetLabel) return;
        const preset = holidayPresetsList.find((p) => p.name === presetLabel);
        if (!preset) return;

        // Name input
        const nameInput = modal?.querySelector('input[name="name"]');
        if (nameInput) {
            nameInput.value = presetLabel;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Schedule range
        if (
            preset.schedule &&
            preset.schedule.startsWith('range(') &&
            preset.schedule.endsWith(')')
        ) {
            const range = preset.schedule.slice(6, -1);
            const [from, to] = range.split('-');
            if (from) {
                const [fromMonth, fromDay] = from.split('/');
                const fromMonthSel = modal.querySelector('#schedule-from-month');
                const fromDaySel = modal.querySelector('#schedule-from-day');
                if (fromMonthSel) fromMonthSel.value = fromMonth || '';
                if (fromDaySel) fromDaySel.value = fromDay || '';
            }
            if (to) {
                const [toMonth, toDay] = to.split('/');
                const toMonthSel = modal.querySelector('#schedule-to-month');
                const toDaySel = modal.querySelector('#schedule-to-day');
                if (toMonthSel) toMonthSel.value = toMonth || '';
                if (toDaySel) toDaySel.value = toDay || '';
            }
        }

        // Colors (populate color pickers)
        const colorContainer = modal?.querySelector('.field-color-list .color-list-container');
        if (colorContainer) {
            colorContainer.innerHTML = '';
            (preset.colors || []).forEach((color) => {
                const swatch = document.createElement('div');
                swatch.className = 'color-picker-swatch';
                swatch.innerHTML = `
                    <input type="color" value="${color}" />
                    <button type="button" class="btn btn--cancel btn--remove-item remove-btn">−</button>
                `;
                swatch.querySelector('.remove-btn').onclick = () => swatch.remove();
                colorContainer.appendChild(swatch);
            });
        }
    };

    return row;
}

export function renderDropdownField(field, immediateData) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const select = document.createElement('select');
    select.className = 'select';
    select.name = field.key;
    select.id = field.key;
    field.options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.selected = immediateData[field.key] === opt;
        option.textContent = opt;
        select.appendChild(option);
    });
    select.addEventListener('change', () => {
        immediateData[field.key] = select.value;
    });
    inputWrap.appendChild(select);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

export function renderCheckBoxField(field, immediateData) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // LABEL COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // INPUT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // The checkbox itself
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'settings-checkbox';
    input.name = field.key;
    input.id = field.key;
    input.checked = !!immediateData[field.key];
    input.addEventListener('change', () => {
        immediateData[field.key] = input.checked;
    });
    inputWrap.appendChild(input);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

export function renderInstanceDropdownField(field, immediateData, rootConfig) {
    // Row wrapper
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label || 'Instance';
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    // Input column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const select = document.createElement('select');
    select.className = 'select instance-dropdown-select';
    select.name = field.key;

    // Helper to humanize instance names
    function humanize(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Build option list
    function setOptions() {
        select.innerHTML = '';
        let types = [];

        if (Array.isArray(field.from)) {
            types = field.from;
        } else {
            types = Object.keys(rootConfig.instances || {});
        }

        let options = [];
        types.forEach((type) => {
            if (rootConfig.instances && rootConfig.instances[type]) {
                options.push(...Object.keys(rootConfig.instances[type]));
            }
        });

        options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = humanize(opt);
            select.appendChild(option);
        });

        // Auto-select value: prefer immediateData, else first option
        if (options.length > 0) {
            let selected = immediateData[field.key];
            if (!selected || !options.includes(selected)) {
                selected = options[0];
                immediateData[field.key] = selected;
            }
            select.value = selected;
        } else {
            immediateData[field.key] = '';
        }
    }

    setOptions();

    select.onchange = () => {
        immediateData[field.key] = select.value;
    };

    inputWrap.appendChild(select);
    row.appendChild(inputWrap);

    return row;
}

const months = [
    { value: '01', label: 'January', days: 31 },
    { value: '02', label: 'February', days: 29 }, // Leap year safe
    { value: '03', label: 'March', days: 31 },
    { value: '04', label: 'April', days: 30 },
    { value: '05', label: 'May', days: 31 },
    { value: '06', label: 'June', days: 30 },
    { value: '07', label: 'July', days: 31 },
    { value: '08', label: 'August', days: 31 },
    { value: '09', label: 'September', days: 30 },
    { value: '10', label: 'October', days: 31 },
    { value: '11', label: 'November', days: 30 },
    { value: '12', label: 'December', days: 31 },
];

export function renderHolidayScheduleField(field, value) {
    let fromMonth = '01',
        fromDay = '01',
        toMonth = '01',
        toDay = '01';
    if (typeof value === 'string' && value.startsWith('range(')) {
        const m = value.match(/^range\((\d{2})\/(\d{2})-(\d{2})\/(\d{2})\)/);
        if (m) {
            [, fromMonth, fromDay, toMonth, toDay] = m;
        }
    }
    function createSelect(id, options, selected) {
        const sel = document.createElement('select');
        sel.id = id;
        sel.className = 'select';
        options.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label || opt.value;
            if (opt.value === selected) o.selected = true;
            sel.appendChild(o);
        });
        return sel;
    }
    const fromMonthSel = createSelect('schedule-from-month', months, fromMonth);
    const fromDaySel = createSelect(
        'schedule-from-day',
        Array.from({ length: 31 }, (_, i) => ({
            value: String(i + 1).padStart(2, '0'),
            label: String(i + 1).padStart(2, '0'),
        })),
        fromDay
    );
    const toMonthSel = createSelect('schedule-to-month', months, toMonth);
    const toDaySel = createSelect(
        'schedule-to-day',
        Array.from({ length: 31 }, (_, i) => ({
            value: String(i + 1).padStart(2, '0'),
            label: String(i + 1).padStart(2, '0'),
        })),
        toDay
    );

    // Update days in select based on month
    function updateDays(selMonth, selDay) {
        const monthObj = months.find((m) => m.value === selMonth.value);
        const days = monthObj ? monthObj.days : 31;
        selDay.innerHTML = '';
        for (let d = 1; d <= days; d++) {
            const o = document.createElement('option');
            o.value = String(d).padStart(2, '0');
            o.textContent = String(d).padStart(2, '0');
            selDay.appendChild(o);
        }
    }
    fromMonthSel.addEventListener('change', () => updateDays(fromMonthSel, fromDaySel));
    toMonthSel.addEventListener('change', () => updateDays(toMonthSel, toDaySel));
    updateDays(fromMonthSel, fromDaySel);
    updateDays(toMonthSel, toDaySel);

    // Row structure (to drop into a modal/settings)
    const row = document.createElement('div');
    row.className = 'settings-field-row modal-field-row';

    // Label col
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol modal-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label || 'Schedule';
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // Input col
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap modal-field-inputwrap';

    // Range inner div
    const rangeDiv = document.createElement('div');
    rangeDiv.className = 'schedule-range';
    rangeDiv.appendChild(fromMonthSel);
    rangeDiv.appendChild(fromDaySel);
    const toLabel = document.createElement('span');
    toLabel.className = 'schedule-to-label';
    toLabel.textContent = 'To';
    rangeDiv.appendChild(toLabel);
    rangeDiv.appendChild(toMonthSel);
    rangeDiv.appendChild(toDaySel);

    inputWrap.appendChild(rangeDiv);
    row.appendChild(inputWrap);

    return row;
}

export function renderGdrivePresetsField(field, immediateData, moduleConfig) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // LABEL COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label || 'Gdrive Presets';
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // INPUT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // DROPDOWN
    const select = document.createElement('select');
    select.className = 'select gdrive-preset-select';
    select.name = field.key;
    select.id = field.key;
    select.innerHTML = '<option value="">— No Preset —</option>';

    // Only look at gdrive_list for already added
    const addedIds = Array.isArray(moduleConfig?.gdrive_list)
        ? moduleConfig.gdrive_list.map((entry) => entry.id)
        : [];

    // Container for the preset card
    const cardContainer = document.createElement('div');
    cardContainer.className = 'gdrive-preset-card-container';
    cardContainer.style.marginTop = '0.4em';

    // Helper: Render the preset card HTML
    function renderPresetCard(preset) {
        if (!preset) return '';
        // Don't show name or id
        const fields = Object.entries(preset).filter(([k]) => k !== 'name' && k !== 'id');
        if (fields.length === 0) return '';
        // Build the card HTML
        let html = '<div class="gdrive-preset-card">';
        for (const [key, value] of fields) {
            // Format key label (capitalize first letter)
            let label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
            // Format value
            let valHTML = '';
            if (Array.isArray(value)) {
                valHTML =
                    '<div class="gdrive-preset-card-content"><ul>' +
                    value.map((v) => `<li>${v}</li>`).join('') +
                    '</ul></div>';
            } else if (typeof value === 'object' && value !== null) {
                valHTML =
                    '<div class="gdrive-preset-card-content">' +
                    JSON.stringify(value, null, 2) +
                    '</div>';
            } else {
                valHTML = `<div class="gdrive-preset-card-value">${value}</div>`;
            }
            html += `
                <div class="gdrive-preset-card-row">
                    <div class="gdrive-preset-card-label">${label}:</div>
                    ${valHTML}
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    // Render options and set up select
    fetchGdrivePresets().then((entries) => {
        select.innerHTML =
            '<option value="">— No Preset —</option>' +
            entries
                .map((drive) => {
                    const alreadyAdded = addedIds.includes(drive.id);
                    const optionLabel = alreadyAdded ? `${drive.name} (Already Added)` : drive.name;
                    return `<option value="${drive.id}"${
                        alreadyAdded ? ' disabled' : ''
                    }>${optionLabel}</option>`;
                })
                .join('');
        select.value = immediateData[field.key] || '';
        select._presets = entries;

        // On load: render the card if there is a selected preset
        const preset = entries.find((d) => d.id === select.value);
        cardContainer.innerHTML = preset ? renderPresetCard(preset) : '';
    });

    select.addEventListener('change', function () {
        const selectedId = select.value;
        const presets = select._presets || [];
        const preset = presets.find((drive) => drive.id === selectedId);

        immediateData[field.key] = selectedId;

        // Update card
        cardContainer.innerHTML = preset ? renderPresetCard(preset) : '';

        // Autofill name/id if present in modal
        if (preset) {
            const modal = document.querySelector('.modal.show');
            if (modal) {
                const nameInput = modal.querySelector('input[name="name"]');
                const idInput = modal.querySelector('input[name="id"]');
                if (nameInput) {
                    nameInput.value = preset.name;
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (idInput) {
                    idInput.value = preset.id;
                    idInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    });

    inputWrap.appendChild(select);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    // Insert card below select
    inputWrap.appendChild(cardContainer);

    row.appendChild(inputWrap);
    return row;
}

let _gdrivePresetsCache = null;
async function fetchGdrivePresets() {
    if (_gdrivePresetsCache) return _gdrivePresetsCache; // use cache
    try {
        const response = await fetch(
            'https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/CL2K/presets.json'
        );
        if (!response.ok) throw new Error('Failed to fetch GDrive presets');
        const data = await response.json();

        _gdrivePresetsCache = Array.isArray(data)
            ? data
            : Object.entries(data).map(([name, value]) =>
                  typeof value === 'object'
                      ? {
                            name,
                            ...value,
                        }
                      : {
                            name,
                            id: value,
                        }
              );
    } catch (err) {
        console.error('Error loading GDrive presets:', err);
        _gdrivePresetsCache = [];
    }
    return _gdrivePresetsCache;
}

export function renderScheduleField(field, immediateData) {
    // Use immediateData as the working object (represents the config or entry being edited)
    let value = immediateData[field.key];
    let initialType = 'daily';
    let parsed = {};

    if (typeof value === 'string') {
        let match;
        if ((match = value.match(/^hourly\((\d{2})\)$/))) {
            initialType = 'hourly';
            parsed.minute = match[1];
        } else if ((match = value.match(/^daily\(([\d:|]+)\)$/))) {
            initialType = 'daily';
            parsed.times = match[1].split('|');
        } else if ((match = value.match(/^weekly\(([\w@|]+)\)$/))) {
            initialType = 'weekly';
            parsed.weekly = match[1];
        } else if ((match = value.match(/^monthly\(([\w@|]+)\)$/))) {
            initialType = 'monthly';
            parsed.monthly = match[1];
        } else if ((match = value.match(/^cron\(([^)]+)\)$/))) {
            initialType = 'cron';
            parsed.expr = match[1];
        }
    }

    const row = document.createElement('div');
    row.className = 'settings-field-row field-schedule';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';
    if (field.label) {
        const label = document.createElement('label');
        label.textContent = field.label;
        labelCol.appendChild(label);
    }
    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    const pills = [
        { type: 'hourly', label: 'Hourly' },
        { type: 'daily', label: 'Daily' },
        { type: 'weekly', label: 'Weekly' },
        { type: 'monthly', label: 'Monthly' },
        { type: 'cron', label: 'Cron' },
    ];
    const pillGroup = document.createElement('div');
    pillGroup.className = 'pill-group';
    pills.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pill' + (p.type === initialType ? ' active' : '');
        btn.dataset.type = p.type;
        btn.textContent = p.label;
        pillGroup.appendChild(btn);
    });
    inputWrap.appendChild(pillGroup);

    const fieldsDiv = document.createElement('div');
    fieldsDiv.className = 'schedule-fields';
    inputWrap.appendChild(fieldsDiv);

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'schedule-summary';
    inputWrap.appendChild(summaryDiv);

    row.appendChild(inputWrap);

    let selectedType = initialType;

    function updateSummary() {
        let summary = '';
        if (selectedType === 'hourly') {
            const m = fieldsDiv.querySelector('#hourly-minute')?.value || '0';
            summary = `Will run at minute ${m} of every hour.`;
        } else if (selectedType === 'daily') {
            const times = Array.from(fieldsDiv.querySelectorAll('.daily-times input[type="time"]'))
                .map((inp) => inp.value.trim())
                .filter(Boolean);
            summary = `Will run daily at ${times.join(', ') || '[no times set]'}`;
        } else if (selectedType === 'weekly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.weekday-pill.active')).map(
                (btn) => btn.textContent
            );
            const time = fieldsDiv.querySelector('#weekly-time')?.value || '';
            summary = days.length
                ? `Will run every ${days.join(', ')} at ${time || '[time]'}`
                : 'Pick at least one day of the week.';
        } else if (selectedType === 'monthly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.monthday-pill.active')).map(
                (btn) => btn.textContent
            );
            const time = fieldsDiv.querySelector('#monthly-time')?.value || '';
            summary = days.length
                ? `Will run on day(s) ${days.join(', ')} of the month at ${time || '[time]'}`
                : 'Pick at least one day of the month.';
        } else if (selectedType === 'cron') {
            const expr = fieldsDiv.querySelector('#cron-expr')?.value.trim();
            summary = expr ? `Custom cron: ${expr}` : 'Enter a cron expression.';
        }
        summaryDiv.textContent = summary;
        immediateData[field.key] = getCurrentValue();
    }

    function getCurrentValue() {
        let schedString = '';
        if (selectedType === 'hourly') {
            const min = parseInt(fieldsDiv.querySelector('#hourly-minute').value, 10);
            schedString = `hourly(${String(isNaN(min) ? 0 : min).padStart(2, '0')})`;
        } else if (selectedType === 'daily') {
            const times = Array.from(fieldsDiv.querySelectorAll('.daily-times input[type="time"]'))
                .map((inp) => inp.value.trim())
                .filter(Boolean);
            schedString = `daily(${times.join('|')})`;
        } else if (selectedType === 'weekly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.weekday-pill.active')).map((btn) =>
                btn.textContent.toLowerCase()
            );
            const time = fieldsDiv.querySelector('#weekly-time')?.value || '';
            schedString = `weekly(${days.map((d) => `${d}@${time}`).join('|')})`;
        } else if (selectedType === 'monthly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.monthday-pill.active'))
                .map((btn) => btn.textContent)
                .filter(Boolean);
            const time = fieldsDiv.querySelector('#monthly-time')?.value || '';
            schedString = `monthly(${days.map((d) => `${d}@${time}`).join('|')})`;
        } else if (selectedType === 'cron') {
            const expr = fieldsDiv.querySelector('#cron-expr')?.value.trim();
            schedString = `cron(${expr || ''})`;
        }
        return schedString;
    }

    function renderFields(type) {
        fieldsDiv.innerHTML = '';
        if (type === 'hourly') {
            const label = document.createElement('label');
            label.textContent = 'At minute:';
            fieldsDiv.appendChild(label);

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = '59';
            input.className = 'input schedule-hourly-minute';
            input.id = 'hourly-minute';
            input.value = parsed.minute || '0';
            // input.style.width = '90px';  // REMOVED inline style
            input.addEventListener('input', updateSummary);
            fieldsDiv.appendChild(input);

            const hint = document.createElement('span');
            hint.className = 'schedule-hourly-hint'; // Add a CSS class instead of inline style
            hint.textContent = ' (0 = top of hour)';
            fieldsDiv.appendChild(hint);
        } else if (type === 'daily') {
            const label = document.createElement('label');
            label.textContent = 'Time(s):';
            fieldsDiv.appendChild(label);

            const timesDiv = document.createElement('div');
            timesDiv.className = 'daily-times';
            fieldsDiv.appendChild(timesDiv);

            function addTimeRow(val = '') {
                const row = document.createElement('div');
                row.className = 'daily-times-row';

                const input = document.createElement('input');
                input.type = 'time';
                input.className = 'input';
                input.value = val;
                input.addEventListener('input', updateSummary);

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn--remove-item remove-btn';
                btn.title = 'Remove';
                btn.innerHTML = '&minus;';
                btn.onclick = () => {
                    row.remove();
                    updateSummary();
                };

                row.appendChild(input);
                row.appendChild(btn);
                timesDiv.appendChild(row);
            }

            (parsed.times && parsed.times.length ? parsed.times : ['12:00']).forEach((t) =>
                addTimeRow(t)
            );

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.id = 'add-daily-time';
            addBtn.className = 'add-time-btn btn';
            addBtn.textContent = '+ Add time';
            addBtn.onclick = () => {
                addTimeRow('');
                updateSummary();
            };
            fieldsDiv.appendChild(addBtn);
        } else if (type === 'weekly') {
            const labelDays = document.createElement('label');
            labelDays.textContent = 'Day(s):';
            fieldsDiv.appendChild(labelDays);

            const weekdayPills = document.createElement('div');
            weekdayPills.className = 'weekday-pills';
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'weekday-pill';
                btn.dataset.day = i;
                btn.textContent = d;
                if (parsed.weekly && parsed.weekly.includes(`${d.toLowerCase()}@`))
                    btn.classList.add('active');
                btn.onclick = () => {
                    btn.classList.toggle('active');
                    updateSummary();
                };
                weekdayPills.appendChild(btn);
            });
            fieldsDiv.appendChild(weekdayPills);

            const labelTime = document.createElement('label');
            labelTime.textContent = 'At:';
            fieldsDiv.appendChild(labelTime);

            const input = document.createElement('input');
            input.type = 'time';
            input.className = 'input';
            input.id = 'weekly-time';
            // Find the first time if present in the parsed string, else default
            let t = '12:00';
            if (parsed.weekly) {
                const first = parsed.weekly.split('|')[0];
                if (first && first.includes('@')) t = first.split('@')[1];
            }
            input.value = t;
            input.addEventListener('input', updateSummary);
            fieldsDiv.appendChild(input);
        } else if (type === 'monthly') {
            const labelDays = document.createElement('label');
            labelDays.textContent = 'Day(s) of month:';
            fieldsDiv.appendChild(labelDays);

            const monthdayPills = document.createElement('div');
            monthdayPills.className = 'monthday-pills';

            let selectedDays = [];
            if (parsed.monthly) {
                selectedDays = parsed.monthly.split('|').map((d) => parseInt(d.split('@')[0], 10));
            }

            Array.from({ length: 31 }).forEach((_, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'monthday-pill';
                btn.dataset.day = i + 1;
                btn.textContent = (i + 1).toString();
                if (selectedDays.includes(i + 1)) btn.classList.add('active');
                btn.onclick = () => {
                    btn.classList.toggle('active');
                    updateSummary();
                };
                monthdayPills.appendChild(btn);
            });
            fieldsDiv.appendChild(monthdayPills);

            const labelTime = document.createElement('label');
            labelTime.textContent = 'At:';
            fieldsDiv.appendChild(labelTime);

            const input = document.createElement('input');
            input.type = 'time';
            input.className = 'input';
            input.id = 'monthly-time';
            // Find the first time if present in the parsed string, else default
            let t = '12:00';
            if (parsed.monthly) {
                const first = parsed.monthly.split('|')[0];
                if (first && first.includes('@')) t = first.split('@')[1];
            }
            input.value = t;
            input.addEventListener('input', updateSummary);
            fieldsDiv.appendChild(input);
        } else if (type === 'cron') {
            const label = document.createElement('label');
            label.textContent = 'Cron Expression';
            fieldsDiv.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input';
            input.id = 'cron-expr';
            input.placeholder = 'e.g. 0 0 * * *';
            input.value = parsed.expr || '';
            input.addEventListener('input', updateSummary);
            fieldsDiv.appendChild(input);

            const linkDiv = document.createElement('div');
            linkDiv.className = 'cron-link-hint';
            linkDiv.innerHTML = `<a href="https://crontab.guru/" target="_blank">What is cron?</a>`;
            fieldsDiv.appendChild(linkDiv);
        }
        updateSummary();
    }

    function setActivePill(type) {
        selectedType = type;
        parsed = {}; // Reset parsed on pill switch
        pillGroup.querySelectorAll('.pill').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        renderFields(type);
        updateSummary();
    }

    pillGroup.querySelectorAll('.pill').forEach((btn) => {
        btn.onclick = () => setActivePill(btn.dataset.type);
    });

    renderFields(selectedType);
    updateSummary();

    return row;
}
