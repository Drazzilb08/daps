let _gdrivePresetsCache = null;

export const holidayPresets = {
    "🎆 New Year's Day": {
        schedule: 'range(12/30-01/02)',
        colors: ['#00BFFF', '#FFD700'],
    },
    "💘 Valentine's Day": {
        schedule: 'range(02/05-02/15)',
        colors: ['#D41F3A', '#FFC0CB'],
    },
    '🐣 Easter': {
        schedule: 'range(03/31-04/02)',
        colors: ['#FFB6C1', '#87CEFA', '#98FB98'],
    },
    "🌸 Mother's Day": {
        schedule: 'range(05/10-05/15)',
        colors: ['#FF69B4', '#FFDAB9'],
    },
    "👨‍👧‍👦 Father's Day": {
        schedule: 'range(06/15-06/20)',
        colors: ['#1E90FF', '#4682B4'],
    },
    '🗽 Independence Day': {
        schedule: 'range(07/01-07/05)',
        colors: ['#FF0000', '#FFFFFF', '#0000FF'],
    },
    '🧹 Labor Day': {
        schedule: 'range(09/01-09/07)',
        colors: ['#FFD700', '#4682B4'],
    },
    '🎃 Halloween': {
        schedule: 'range(10/01-10/31)',
        colors: ['#FFA500', '#000000'],
    },
    '🦃 Thanksgiving': {
        schedule: 'range(11/01-11/30)',
        colors: ['#FFA500', '#8B4513'],
    },
    '🎄 Christmas': {
        schedule: 'range(12/01-12/31)',
        colors: ['#FF0000', '#00FF00'],
    },
};

const months = [
        { value: "01", label: "January", days: 31 },
        { value: "02", label: "February", days: 29 }, // Leap year safe
        { value: "03", label: "March", days: 31 },
        { value: "04", label: "April", days: 30 },
        { value: "05", label: "May", days: 31 },
        { value: "06", label: "June", days: 30 },
        { value: "07", label: "July", days: 31 },
        { value: "08", label: "August", days: 31 },
        { value: "09", label: "September", days: 30 },
        { value: "10", label: "October", days: 31 },
        { value: "11", label: "November", days: 30 },
        { value: "12", label: "December", days: 31 }
    ];

async function gdrivePresets() {
    if (_gdrivePresetsCache) return _gdrivePresetsCache; // use cache
    try {
        const response = await fetch(
            'https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/main/presets.json'
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


export function populateScheduleDropdowns(
    modalContent,
    field = null
)  {
    // Find the .modal-helper-hook in the "Schedule" field
    const scheduleHelperDiv = modalContent.querySelector('[data-key="schedule"] .modal-helper-hook');
    if (!scheduleHelperDiv) return;

    function createSelect(id, options) {
        const sel = document.createElement('select');
        sel.id = id;
        sel.className = 'select';
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label || opt.value;
            sel.appendChild(o);
        });
        return sel;
    }

    // Build month/day selects
    const fromMonth = createSelect('schedule-from-month', months);
    const fromDay = createSelect('schedule-from-day', Array.from({ length: 31 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: String(i + 1).padStart(2, '0')
    })));
    const toMonth = createSelect('schedule-to-month', months);
    const toDay = createSelect('schedule-to-day', Array.from({ length: 31 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: String(i + 1).padStart(2, '0')
    })));

    // Update day options based on month
    function updateDays(selMonth, selDay) {
        const monthObj = months.find(m => m.value === selMonth.value);
        const days = monthObj ? monthObj.days : 31;
        selDay.innerHTML = '';
        for (let d = 1; d <= days; d++) {
            const o = document.createElement('option');
            o.value = String(d).padStart(2, '0');
            o.textContent = String(d).padStart(2, '0');
            selDay.appendChild(o);
        }
    }
    fromMonth.addEventListener('change', () => updateDays(fromMonth, fromDay));
    toMonth.addEventListener('change', () => updateDays(toMonth, toDay));
    updateDays(fromMonth, fromDay);
    updateDays(toMonth, toDay);

    // Create modal/settings styled row for the dropdowns
    const row = document.createElement('div');
    row.className = 'settings-field-row modal-field-row';

    // Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol modal-field-labelcol';
    const label = document.createElement('label');
    label.setAttribute('for', 'schedule-from-month');
    label.textContent = field.label || 'Schedule';
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // Input column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap modal-field-inputwrap';

    // Range inner div (for selects)
    const rangeDiv = document.createElement('div');
    rangeDiv.className = 'schedule-range';
    rangeDiv.appendChild(fromMonth);
    rangeDiv.appendChild(fromDay);
    const toLabel = document.createElement('span');
    toLabel.className = 'schedule-to-label';
    toLabel.textContent = 'To';
    rangeDiv.appendChild(toLabel);
    rangeDiv.appendChild(toMonth);
    rangeDiv.appendChild(toDay);

    inputWrap.appendChild(rangeDiv);
    row.appendChild(inputWrap);

    // Replace the old helper div with our new, classed row
    scheduleHelperDiv.parentNode.replaceChild(row, scheduleHelperDiv);
}

export function loadHolidayPresets(
    modalContent,
    field = null,
    holidaysInUse = [],
    editingIdx = null,
) {
    const presetHelperDiv = modalContent.querySelector('[data-key="preset"] .modal-helper-hook');
    if (!presetHelperDiv) return;

    // Current names in use, EXCLUDING the entry being edited
    const usedNames = Array.isArray(holidaysInUse)
        ? holidaysInUse.filter((entry, i) => i !== editingIdx).map(entry => entry.name)
        : [];

    // Build the row container
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

    // The select itself
    const select = document.createElement('select');
    select.id = 'holiday-preset';
    select.className = 'select';

    select.innerHTML =
        '<option value="">Select preset...</option>' +
        Object.keys(holidayPresets || {})
            .map((label) =>
                `<option value="${label}"${
                    usedNames.includes(label) ? ' disabled class="disabled-option"' : ''
                }>${label}${usedNames.includes(label) ? ' (Already Added)' : ''}</option>`
            )
            .join('');

    inputWrap.appendChild(select);
    row.appendChild(inputWrap);

    // Replace the old helper div with our new, classed row
    presetHelperDiv.parentNode.replaceChild(row, presetHelperDiv);

    // Set current value if editing
    const currentName = (editingIdx !== null && holidaysInUse[editingIdx] && holidaysInUse[editingIdx].name)
        ? holidaysInUse[editingIdx].name
        : null;
    if (currentName && holidayPresets[currentName]) {
        select.value = currentName;
    }

    select.onchange = function () {
        const label = select.value;
        const modal = select.closest('.modal-content');
        if (!label || !holidayPresets[label]) return;
        const preset = holidayPresets[label];
        // Fill in fields by id if present (these are created by helpers)
        if (modal.querySelector('#holiday-name'))
            modal.querySelector('#holiday-name').key = label;
        const nameInput = modal.querySelector('input[name="name"]');
        if (nameInput) {
            nameInput.value = label;
        }
        if (
            preset.schedule &&
            preset.schedule.startsWith('range(') &&
            preset.schedule.endsWith(')')
        ) {
            const range = preset.schedule.slice(6, -1);
            const [from, to] = range.split('-');
            if (from) {
                const [fromMonth, fromDay] = from.split('/');
                if (modal.querySelector('#schedule-from-month'))
                    modal.querySelector('#schedule-from-month').value = fromMonth || '';
                if (modal.querySelector('#schedule-from-day'))
                    modal.querySelector('#schedule-from-day').value = fromDay || '';
            }
            if (to) {
                const [toMonth, toDay] = to.split('/');
                if (modal.querySelector('#schedule-to-month'))
                    modal.querySelector('#schedule-to-month').value = toMonth || '';
                if (modal.querySelector('#schedule-to-day'))
                    modal.querySelector('#schedule-to-day').value = toDay || '';
            }
        }
        // Fill colors if color_list field present
        const colorContainer = modal.querySelector('.field-color-list .color-list-container');
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
}

export async function populateGDrivePresetsDropdown(
    modalContent,
    gdriveSyncData = [],
    editingIdx = null
) {
    // Find the hook div for the preset field
    const presetHelperDiv = modalContent.querySelector('[data-key="preset"] .modal-helper-hook');
    if (!presetHelperDiv) return;

    // Build row container (mimics settings-field-row, modal flavor)
    const row = document.createElement('div');
    row.className = 'settings-field-row modal-field-row';

    // Label col
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol modal-field-labelcol';
    labelCol.innerHTML = `<label for="gdrive-sync-preset">Gdrive Presets</label>`;
    row.appendChild(labelCol);

    // Input/Helper col
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap modal-field-inputwrap';

    // Select and details
    const select = document.createElement('select');
    select.id = 'gdrive-sync-preset';
    select.className = 'select gdrive-preset-select';

    const detailDiv = document.createElement('div');
    detailDiv.id = 'gdrive-preset-detail';
    detailDiv.className = 'gdrive-preset-detail';

    // Append select and detail to inputWrap
    inputWrap.appendChild(select);
    inputWrap.appendChild(detailDiv);
    row.appendChild(inputWrap);

    // Replace the hook with our new row
    presetHelperDiv.parentNode.replaceChild(row, presetHelperDiv);

    // Fetch preset options
    const entries = await gdrivePresets();
    const idsInUse = Array.isArray(gdriveSyncData)
        ? gdriveSyncData.filter((entry, i) => i !== editingIdx).map((entry) => String(entry.id))
        : [];

    select.innerHTML =
        '<option value="">— No Preset —</option>' +
        entries
            .map(
                (drive) =>
                    `<option value="${drive.id}" data-name="${drive.name}"${
                        idsInUse.includes(String(drive.id)) ? ' disabled class="disabled-option"' : ''
                    }>${drive.name}${idsInUse.includes(String(drive.id)) ? ' (Already Added)' : ''}</option>`
            )
            .join('');

    const currentId = (editingIdx !== null && gdriveSyncData[editingIdx] && gdriveSyncData[editingIdx].id)
        ? String(gdriveSyncData[editingIdx].id)
        : null;
    if (currentId) {
        select.value = currentId;
    }

    // Optional: initialize Select2 if available
    setTimeout(function () {
        if (typeof $ !== 'undefined' && $(select).data('select2')) {
            $(select).select2('destroy');
        }
        if (typeof $ !== 'undefined' && $(select).select2) {
            $(select).select2({
                placeholder: 'Select a GDrive preset',
                allowClear: false,
                width: '100%',
                dropdownParent: $(select).closest('.modal-content'),
                language: {
                    searching: () => 'Type to filter drives…',
                    noResults: () => 'No matching presets',
                    inputTooShort: () => 'Type to search…',
                },
            });
            $(select).on('select2:open', function () {
                setTimeout(() => {
                    $('.select2-search__field').attr('placeholder', 'Type to search presets…');
                }, 0);
            });
        }
    }, 0);

    // When the user selects a preset, populate the fields and show metadata
    function updatePresetDetail() {
        const id = select.value;
        const drive = entries.find((d) => String(d.id) === String(id));
        if (id && drive) {
            // Fill corresponding fields in the modal if present
            const idInput = modalContent.querySelector('input[name="id"]');
            if (idInput) {
                idInput.value = drive.id ?? '';
                // PATCH: update entry object if possible
                if (idInput.name && modalContent.entry) modalContent.entry[idInput.name] = drive.id ?? '';
                idInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const nameInput = modalContent.querySelector('input[name="name"]');
            if (nameInput) {
                nameInput.value = drive.name ?? '';
                if (nameInput.name && modalContent.entry) modalContent.entry[nameInput.name] = drive.name ?? '';
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const locInput = modalContent.querySelector('input[name="location"]');
            if (locInput && drive.location) {
                // Only update location if user selects a preset AND that preset has a location field!
                locInput.value = drive.location;
                if (locInput.name && modalContent.entry) modalContent.entry[locInput.name] = drive.location;
                locInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Build detail/meta panel
            if (detailDiv) {
                let metaLines = '';
                if ('type' in drive) {
                    metaLines += `<div class="preset-field"><span class="preset-label">Type:</span> <span class="preset-type">${drive.type}</span></div>`;
                }
                if ('content' in drive && drive.content) {
                    metaLines += `<div class="preset-field"><span class="preset-label">Content:</span></div>`;
                    if (Array.isArray(drive.content)) {
                        metaLines += `<div class="preset-content">${drive.content
                            .map((line) => `<div>${line}</div>`)
                            .join('')}</div>`;
                    } else {
                        metaLines += `<div class="preset-content">${drive.content}</div>`;
                    }
                }
                for (const key of Object.keys(drive)) {
                    if (['name', 'id', 'type', 'content'].includes(key)) continue;
                    metaLines += `<div class="preset-field"><span class="preset-label">${
                        key.charAt(0).toUpperCase() + key.slice(1)
                    }:</span> <span>${drive[key]}</span></div>`;
                }
                detailDiv.innerHTML = `<div class="preset-card">${
                    metaLines || '<i>No extra metadata</i>'
                }</div>`;
            }
        } else if (detailDiv) {
            detailDiv.innerHTML = '';
        }
    }
    select.onchange = updatePresetDetail;
    updatePresetDetail();
}