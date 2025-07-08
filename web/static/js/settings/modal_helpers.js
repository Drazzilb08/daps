import { DROP_DOWN_OPTIONS } from './constants.js';
import { holidayPresets } from './presets.js';

export function populateScheduleDropdowns() {
    const months = DROP_DOWN_OPTIONS.month; // Array of { value, label, days }
    ['from', 'to'].forEach((type) => {
        const monthSel = document.getElementById(`schedule-${type}-month`);
        const daySel = document.getElementById(`schedule-${type}-day`);
        if (!monthSel || !daySel) return;

        monthSel.innerHTML = months
            .map((m) => `<option value="${m.value}">${m.label}</option>`)
            .join('');

        function updateDays() {
            const mIdx = months.findIndex((m) => m.value === monthSel.value);
            const days = mIdx >= 0 ? months[mIdx].days : 31;
            let opts = '';
            for (let d = 1; d <= days; d++) {
                const dd = String(d).padStart(2, '0');
                opts += `<option value="${dd}">${dd}</option>`;
            }
            daySel.innerHTML = opts;
        }
        monthSel.addEventListener('change', updateDays);
        updateDays();
    });
}

export function loadHolidayPresets() {
    const presetSelect = document.getElementById('holiday-preset');
    if (!presetSelect) return;
    presetSelect.innerHTML =
        '<option value="">Select preset...</option>' +
        Object.keys(holidayPresets || {})
            .map((label) => `<option value="${label}">${label}</option>`)
            .join('');
    presetSelect.onchange = function () {
        const label = presetSelect.value;
        const modal = presetSelect.closest('.modal-content');
        if (!label || !holidayPresets[label]) return;
        const preset = holidayPresets[label];
        modal.querySelector('#holiday-name').value = label;
        if (
            preset.schedule &&
            preset.schedule.startsWith('range(') &&
            preset.schedule.endsWith(')')
        ) {
            const range = preset.schedule.slice(6, -1);
            const [from, to] = range.split('-');
            if (from) {
                const [fromMonth, fromDay] = from.split('/');
                modal.querySelector('#schedule-from-month').value = fromMonth || '';
                modal.querySelector('#schedule-from-day').value = fromDay || '';
            }
            if (to) {
                const [toMonth, toDay] = to.split('/');
                modal.querySelector('#schedule-to-month').value = toMonth || '';
                modal.querySelector('#schedule-to-day').value = toDay || '';
            }
        }
        const colorContainer = modal.querySelector('#border-colors-container');
        colorContainer.innerHTML = '';
        (preset.colors || []).forEach((color) => {
            const swatch = document.createElement('div');
            swatch.className = 'subfield';
            swatch.innerHTML = `
        <input type="color" value="${color}" />
        <button type="button" class="btn--cancel remove-btn btn--remove-item btn">−</button>
        `;
            swatch.querySelector('.remove-btn').onclick = () => swatch.remove();
            colorContainer.appendChild(swatch);
        });
    };
}

export async function populateGDrivePresetsDropdown(gdriveSyncData, editingIdx = null) {
    const presetSelect = document.getElementById('gdrive-sync-preset');
    const presetDetail = document.getElementById('gdrive-preset-detail');
    const searchBox = document.getElementById('gdrive-preset-search');
    if (!presetSelect) return;

    const entries = await gdrivePresets();

    const idsInUse = gdriveSyncData
        .filter((entry, i) => i !== editingIdx)
        .map((entry) => String(entry.id));
    presetSelect.innerHTML =
        '<option value="">— No Preset —</option>' +
        entries
            .map(
                (drive) =>
                    `<option value="${drive.id}" data-name="${drive.name}"${
                        idsInUse.includes(String(drive.id)) ? ' disabled style="color:#aaa;"' : ''
                    }>${drive.name}${
                        idsInUse.includes(String(drive.id)) ? ' (Already Added)' : ''
                    }</option>`
            )
            .join('');

    setTimeout(function () {
        if ($('#gdrive-sync-preset').data('select2')) {
            $('#gdrive-sync-preset').select2('destroy');
        }
        $('#gdrive-sync-preset').select2({
            placeholder: 'Select a GDrive preset',
            allowClear: true,
            width: '100%',
            dropdownParent: $('#gdrive-sync-preset').closest('.modal-content'),
            language: {
                searching: () => 'Type to filter drives…',
                noResults: () => 'No matching presets',
                inputTooShort: () => 'Type to search…',
            },
        });
        $('#gdrive-sync-preset').on('select2:open', function () {
            setTimeout(() => {
                $('.select2-search__field').attr('placeholder', 'Type to search presets…');
            }, 0);
        });
    }, 0);

    function updatePresetDetail() {
        const id = presetSelect.value;
        const drive = entries.find((d) => String(d.id) === String(id));
        if (id && drive) {
            if (document.getElementById('gdrive-id'))
                document.getElementById('gdrive-id').value = drive.id ?? '';
            if (document.getElementById('gdrive-name'))
                document.getElementById('gdrive-name').value = drive.name ?? '';
            if (document.getElementById('gdrive-location'))
                document.getElementById('gdrive-location').value = drive.location ?? '';

            if (presetDetail) {
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
                presetDetail.innerHTML = `<div class="preset-card">${
                    metaLines || '<i>No extra metadata</i>'
                }</div>`;
            }
        } else if (presetDetail) {
            presetDetail.innerHTML = '';
        }
    }
    presetSelect.onchange = updatePresetDetail;
    updatePresetDetail();

    if (searchBox) {
        searchBox.addEventListener('input', () => {
            const filter = searchBox.value.toLowerCase();
            Array.from(presetSelect.options).forEach((opt) => {
                if (!opt.value) return;
                opt.style.display = opt.text.toLowerCase().includes(filter) ? '' : 'none';
            });
            let firstVisible = Array.from(presetSelect.options).find(
                (opt) => opt.style.display !== 'none' && opt.value
            );
            if (firstVisible) {
                presetSelect.value = firstVisible.value;
                updatePresetDetail();
            } else {
                presetSelect.value = '';
                updatePresetDetail();
            }
        });
    }
}

async function gdrivePresets() {
    if (window._gdrivePresetsCache) return window._gdrivePresetsCache; // use cache
    try {
        const response = await fetch(
            'https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/main/presets.json'
        );
        if (!response.ok) throw new Error('Failed to fetch GDrive presets');
        const data = await response.json();

        window._gdrivePresetsCache = Array.isArray(data)
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
        window._gdrivePresetsCache = [];
    }
    return window._gdrivePresetsCache;
}
