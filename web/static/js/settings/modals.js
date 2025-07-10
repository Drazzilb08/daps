import { SETTINGS_SCHEMA } from './settings_schema.js';
import {
    populateScheduleDropdowns,
    loadHolidayPresets,
    populateGDrivePresetsDropdown,
} from './modal_helpers.js';
import { humanize } from '../util.js';

export function setupModalCloseOnOutsideClick(modal) {
    function handler(e) {
        if (e.target === modal) {
            modal.remove();
            document.body.classList.remove('modal-open');
        }
    }
    modal.addEventListener('mousedown', handler);

    // Optional: remove handler if modal is removed
    modal.addEventListener('DOMNodeRemoved', function cleanup() {
        modal.removeEventListener('mousedown', handler);
    });
}

export function modalFooterHtml(buttons = [], leftBtnIds = ['delete-modal-btn']) {
    // Always supports one or more left-anchored button(s)
    const left = buttons.filter((b) => leftBtnIds.includes(b.id));
    const right = buttons.filter((b) => !leftBtnIds.includes(b.id));

    return `
        <div class="modal-footer">
            <div>
                ${left
                    .map(
                        (btn) => `
                    <button
                        class="btn ${btn.class || ''}"
                        type="${btn.type || 'button'}"
                        id="${btn.id || ''}"
                        ${btn.disabled ? 'disabled' : ''}
                    >${btn.label}</button>
                `
                    )
                    .join('')}
            </div>
            <div style="display: flex; gap: 0.7em;">
                ${right
                    .map(
                        (btn) => `
                    <button
                        class="btn ${btn.class || ''}"
                        type="${btn.type || 'button'}"
                        id="${btn.id || ''}"
                        ${btn.disabled ? 'disabled' : ''}
                    >${btn.label}</button>
                `
                    )
                    .join('')}
            </div>
        </div>
    `;
}
export function modalHeaderHtml({ title, closeId = 'modal-close-x', extra = '' } = {}) {
    return `
        <div class="modal-header">
            <h2>${title || ''}</h2>
            ${extra}
            <button class="modal-close-x" id="${closeId}" aria-label="Close">&times;</button>
        </div>
    `;
}

export function createModal(id, title, contentHtml, footerButtons = [], onClose = null) {
    let modal = document.getElementById(id);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            ${modalHeaderHtml({ title })}
            ${contentHtml}
            ${modalFooterHtml(footerButtons)}
        </div>
    `;
    document.body.appendChild(modal);

    // Helper to close modal and cleanup overlay state
    function closeModal() {
        modal.remove();
        document.body.classList.remove('modal-open');
        if (typeof onClose === 'function') onClose();
    }

    setupModalCloseOnOutsideClick(modal);

    // Replace default .show/class logic with safer approach
    requestAnimationFrame(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    });

    const closeBtn = modal.querySelector('.modal-close-x');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    // Patch all cancel/dismiss footer buttons to use closeModal
    footerButtons.forEach((btn) => {
        if (/cancel|close/i.test(btn.label || btn.id || '')) {
            const el = modal.querySelector(`#${btn.id}`);
            if (el) el.onclick = closeModal;
        }
    });

    // Expose for others if they want it
    modal._closeModal = closeModal;
    return modal;
}

export function gdriveSyncModal(editIdx, gdriveSyncData, updateGdriveList) {
    const moduleName = 'sync_gdrive';
    const isEdit = typeof editIdx === 'number';
    const entry = isEdit ? gdriveSyncData[editIdx] : { name: '', id: '', location: '' };

    // Get schema for placeholder support
    const schemaObj = SETTINGS_SCHEMA.find((s) => s.key === moduleName);
    const gdriveFieldSchema = schemaObj?.fields?.find((f) => f.key === 'gdrive_list');
    const placeholders = {};
    if (gdriveFieldSchema && Array.isArray(gdriveFieldSchema.fields)) {
        for (const f of gdriveFieldSchema.fields) {
            placeholders[f.key] = f.placeholder || '';
        }
    }

    const contentHtml = `
        <label>Preset (optional)</label>
        <select id="gdrive-sync-preset" class="select">
            <option value="">— No Preset —</option>
        </select>
        <div id="gdrive-preset-detail" style="margin-bottom: 0.75rem;"></div>
        <label>Name</label>
        <input type="text" id="gdrive-name" class="input" placeholder="${
            placeholders.name || ''
        }" />
        <label>GDrive ID</label>
        <input type="text" id="gdrive-id" class="input" placeholder="${placeholders.id || ''}" />
        <label>Location</label>
        <input type="text" id="gdrive-location" class="input" readonly placeholder="${
            placeholders.location || ''
        }" />
    `;

    const modal = createModal(
        'gdrive-sync-modal',
        `${isEdit ? 'Edit' : 'Add'} GDrive Sync`,
        contentHtml,
        [
            { id: 'gdrive-save-btn', label: isEdit ? 'Save' : 'Add', class: 'btn--success' },
            { id: 'gdrive-cancel-btn', label: 'Cancel', class: 'btn--cancel' },
        ]
    );

    // Set values if editing
    modal.querySelector('#gdrive-name').value = entry.name || '';
    modal.querySelector('#gdrive-id').value = entry.id || '';
    modal.querySelector('#gdrive-location').value = entry.location || '';

    // Directory picker
    modal.querySelector('#gdrive-location').addEventListener('click', () => {
        directoryPickerModal(modal.querySelector('#gdrive-location'));
    });

    // Save button
    modal.querySelector('#gdrive-save-btn').onclick = () => {
        const name = modal.querySelector('#gdrive-name').value.trim();
        const id = modal.querySelector('#gdrive-id').value.trim();
        const location = modal.querySelector('#gdrive-location').value.trim();
        if (!name || !id || !location) {
            alert('All fields must be filled.');
            return;
        }
        const newEntry = { id, location, name };
        if (isEdit) gdriveSyncData[editIdx] = newEntry;
        else gdriveSyncData.push(newEntry);
        if (typeof updateGdriveList === 'function') updateGdriveList();
        modal._closeModal();
    };

    // Cancel button
    modal.querySelector('#gdrive-cancel-btn').onclick = () => modal._closeModal();

    // Populate presets async
    setTimeout(() => populateGDrivePresetsDropdown(gdriveSyncData, isEdit ? editIdx : null), 0);
}

export function borderReplacerrModal(editIdx, borderReplacerrData, onUpdate) {
    const moduleName = 'border_replacerr';
    const isEdit = typeof editIdx === 'number';
    const entry = isEdit ? borderReplacerrData[editIdx] : { name: '', schedule: '', color: [] };

    // Schema-based placeholders
    const schemaObj = SETTINGS_SCHEMA.find((s) => s.key === moduleName);
    const holidaysField = schemaObj?.fields?.find((f) => f.key === 'holidays');
    const subfields = holidaysField?.fields || [];
    const placeholders = {};
    for (const sf of subfields) {
        placeholders[sf.key] = sf.placeholder || '';
    }

    // Compose content HTML
    const contentHtml = `
        <label>Holiday Preset</label>
        <select id="holiday-preset" class="select">
            <option value="">Select preset...</option>
        </select>
        <label>Holiday Name</label>
        <input type="text" id="holiday-name" class="input" placeholder="${
            placeholders.name || ''
        }" />
        <label>Schedule</label>
        <div class="schedule-range">
            <select id="schedule-from-month" class="select"></select>
            <select id="schedule-from-day" class="select"></select>
            <span class="schedule-to-label">To</span>
            <select id="schedule-to-month" class="select"></select>
            <select id="schedule-to-day" class="select"></select>
        </div>
        <label>Colors</label>
        <div id="border-colors-container" class="border-colors-container"></div>
        <button type="button" id="addBorderColor" class="btn">➕ Add Color</button>
    `;

    // Footer buttons
    const footer = [
        { id: 'holiday-save-btn', label: isEdit ? 'Save' : 'Add', class: 'btn--success' },
        { id: 'holiday-cancel-btn', label: 'Cancel', class: 'btn--cancel' },
    ];

    // Create modal
    const modal = createModal(
        'border-replacerr-modal',
        `${isEdit ? 'Edit' : 'Add'} Holiday`,
        contentHtml,
        footer
    );

    // Setup dropdowns and presets
    loadHolidayPresets();
    populateScheduleDropdowns();

    // Set initial values
    modal.querySelector('#holiday-name').value = entry.name || '';
    // Parse schedule to fill from/to
    let from = '',
        to = '';
    if (entry.schedule && entry.schedule.startsWith('range(') && entry.schedule.endsWith(')')) {
        const range = entry.schedule.slice(6, -1);
        [from, to] = range.split('-');
    }
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

    // Color logic
    const colorContainer = modal.querySelector('#border-colors-container');
    colorContainer.innerHTML = '';
    function addBorderColor(color = '#ffffff') {
        const swatch = document.createElement('div');
        swatch.className = 'subfield';
        swatch.innerHTML = `
            <input type="color" value="${color}" />
            <button type="button" class="btn--cancel remove-btn btn--remove-item btn">−</button>
        `;
        swatch.querySelector('.remove-btn').onclick = () => swatch.remove();
        colorContainer.appendChild(swatch);
    }
    // Fill with initial colors (or one empty)
    if (Array.isArray(entry.color) && entry.color.length) {
        entry.color.forEach(addBorderColor);
    } else {
        addBorderColor();
    }
    modal.querySelector('#addBorderColor').onclick = () => addBorderColor();

    // Save handler
    modal.querySelector('#holiday-save-btn').onclick = () => {
        const name = modal.querySelector('#holiday-name').value.trim();
        // Validate duplicate name
        const existing = borderReplacerrData || [];
        const duplicate = existing.some(
            (entry, i) => entry.name === name && (!isEdit || i !== editIdx)
        );
        if (duplicate) {
            alert('A holiday with this name already exists.');
            return;
        }
        const scheduleFrom = `${modal.querySelector('#schedule-from-month').value}/${
            modal.querySelector('#schedule-from-day').value
        }`;
        const scheduleTo = `${modal.querySelector('#schedule-to-month').value}/${
            modal.querySelector('#schedule-to-day').value
        }`;
        const colors = Array.from(colorContainer.querySelectorAll('input[type="color"]')).map(
            (input) => input.value
        );

        if (!name || !scheduleFrom || !scheduleTo || !colors.length) {
            alert('All fields are required.');
            return;
        }
        const schedule = `range(${scheduleFrom}-${scheduleTo})`;
        const holidayEntry = { name, schedule, color: colors };
        if (isEdit) {
            borderReplacerrData[editIdx] = holidayEntry;
        } else {
            borderReplacerrData.push(holidayEntry);
        }
        if (typeof onUpdate === 'function') onUpdate();
        modal._closeModal();
    };

    // Cancel handler
    modal.querySelector('#holiday-cancel-btn').onclick = () => modal._closeModal();
}

export function labelarrModal(editIdx, labelarrData, rootConfig, updateLabelarrTable) {
    const moduleName = 'labelarr';
    const isEdit = typeof editIdx === 'number';
    let modal = document.getElementById('labelarr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'labelarr-modal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content">
            <h2 id="labelarr-modal-heading"></h2>
            <label>App Type</label>
            <select id="labelarr-app-type" class="select">
              <option value="radarr">Radarr</option>
              <option value="sonarr">Sonarr</option>
            </select>
            <label>App Instance</label>
            <select id="labelarr-app-instance" class="select"></select>
            <label>Labels</label>
            <input type="text" id="labelarr-labels" class="input" placeholder="${
                PLACEHOLDER_TEXT[moduleName]?.labels ?? ''
            }" />
            <div id="labelarr-plex-list" class="instances-list"></div>
            <div class="modal-footer">
              <button id="labelarr-save-btn" class="btn btn--success"></button>
              <button id="labelarr-cancel-btn" class="btn btn--cancel">Cancel</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const plexListDiv = modal.querySelector('#labelarr-plex-list');
        plexListDiv.innerHTML = '';
        const plexInstances = Object.keys(rootConfig.instances?.plex || {});
        if (plexInstances.length) {
            plexInstances.forEach((pi) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'card plex-instance-card';
                wrapper.innerHTML = `
                    <div class="plex-instance-header">
                        <h3>${humanize(pi)}</h3>
                    </div>
                    <div class="library-actions">
                        <div style="display: flex; gap: 0.5rem;">
                            <button type="button" class="btn select-all-libs" data-inst="${pi}">Select All</button>
                            <button type="button" class="btn deselect-all-libs" data-inst="${pi}">Deselect All</button>
                        </div>
                        <button type="button" class="btn load-libs-btn" data-inst="${pi}">Load Libraries</button>
                    </div>
                    <div id="labelarr-plex-libs-${pi}" class="plex-libraries" style="max-height: 0px;"></div>
                `;
                plexListDiv.appendChild(wrapper);

                const loadBtn = wrapper.querySelector('.load-libs-btn');
                const libsDiv = wrapper.querySelector(`#labelarr-plex-libs-${pi}`);
                loadBtn.addEventListener('click', async () => {
                    loadBtn.disabled = true;
                    try {
                        const res = await fetch(
                            `/api/plex/libraries?instance=${encodeURIComponent(pi)}`
                        );
                        if (!res.ok) throw new Error(await res.text());
                        const fetchedLibs = await res.json();
                        const checkedLibs = Array.from(
                            libsDiv.querySelectorAll('input[type="checkbox"]:checked')
                        ).map((cb) => cb.value);
                        libsDiv.innerHTML = fetchedLibs
                            .map(
                                (l) => `
                            <label class="library-pill">
                                <input type="checkbox" value="${l}" ${
                                    checkedLibs.includes(l) ? 'checked' : ''
                                }/>
                                ${l}
                            </label>
                        `
                            )
                            .join('');

                        requestAnimationFrame(() => {
                            libsDiv.classList.add('open');
                            libsDiv.style.maxHeight = libsDiv.scrollHeight + 'px';
                        });
                    } catch (err) {
                    } finally {
                        loadBtn.disabled = false;
                    }
                });

                wrapper.querySelector('.select-all-libs').addEventListener('click', () => {
                    libsDiv
                        .querySelectorAll('input[type="checkbox"]')
                        .forEach((cb) => (cb.checked = true));
                });
                wrapper.querySelector('.deselect-all-libs').addEventListener('click', () => {
                    libsDiv
                        .querySelectorAll('input[type="checkbox"]')
                        .forEach((cb) => (cb.checked = false));
                });
            });
        } else {
            plexListDiv.innerHTML = `<div class="card plex-instance-card">
                <div class="plex-instance-header"><h3>Plex</h3></div>
                <div class="plex-libraries"><p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No Plex instances configured.</p></div>
            </div>`;
        }

        modal.querySelector('#labelarr-cancel-btn').onclick = () => {
            modal.classList.remove('show');
        };

        modal.querySelector('#labelarr-app-type').onchange = () => {
            const type = modal.querySelector('#labelarr-app-type').value;
            const instSel = modal.querySelector('#labelarr-app-instance');
            instSel.innerHTML = '';
            Object.keys(rootConfig.instances?.[type] || {}).forEach((inst) => {
                const o = document.createElement('option');
                o.value = inst;
                o.textContent = humanize(inst);
                instSel.appendChild(o);
            });
        };
    }

    modal = document.getElementById('labelarr-modal');
    delete modal.dataset.editing;
    const heading = modal.querySelector('#labelarr-modal-heading');
    if (heading) heading.textContent = (isEdit ? 'Edit' : 'Add') + ' Mapping';
    const saveBtn = modal.querySelector('#labelarr-save-btn');
    if (saveBtn) saveBtn.textContent = isEdit ? 'Save' : 'Add';

    if (saveBtn) {
        saveBtn.onclick = null;
        saveBtn.onclick = () => {
            console.log('Save button clicked!');
            const appType = modal.querySelector('#labelarr-app-type').value;
            const appInstance = modal.querySelector('#labelarr-app-instance').value;
            const labels = modal
                .querySelector('#labelarr-labels')
                .value.split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const plex_instances = [];
            const plexListDiv = modal.querySelector('#labelarr-plex-list');
            plexListDiv.querySelectorAll('.card.plex-instance-card').forEach((card) => {
                const inst = card.querySelector('.load-libs-btn').dataset.inst;
                const libs = Array.from(
                    card.querySelectorAll('.plex-libraries input[type="checkbox"]:checked')
                ).map((cb) => cb.value);
                if (libs.length) {
                    plex_instances.push({ instance: inst, library_names: libs });
                }
            });
            if (!labels.length || (!appInstance && plex_instances.length === 0)) {
                alert('You must fill out labels and at least an App or Plex instance.');
                return;
            }
            const mapping = {
                app_type: appType,
                app_instance: appInstance,
                labels,
                plex_instances,
            };
            if (typeof modal.dataset.editing !== 'undefined') {
                labelarrData[modal.dataset.editing] = mapping;
            } else {
                labelarrData.push(mapping);
            }
            if (
                window.config &&
                Array.isArray(window.config.mappings) &&
                window.config.mappings !== labelarrData
            ) {
                window.config.mappings.length = 0;
                Array.prototype.push.apply(window.config.mappings, labelarrData);
            }
            console.log('labelarrData now:', JSON.stringify(labelarrData, null, 2));
            if (typeof updateLabelarrTable === 'function') updateLabelarrTable();
            modal.classList.remove('show');
        };
        console.log('Save handler attached to', saveBtn);
    }

    if (isEdit) {
        const entry = labelarrData[editIdx];
        modal.dataset.editing = editIdx;
        modal.querySelector('#labelarr-app-type').value = entry.app_type;
        modal.querySelector('#labelarr-app-type').dispatchEvent(new Event('change'));
        modal.querySelector('#labelarr-app-instance').value = entry.app_instance;
        modal.querySelector('#labelarr-labels').value = (entry.labels || []).join(', ');

        const plexInstObj = {};
        (entry.plex_instances || []).forEach((inst) => {
            if (typeof inst === 'object' && inst.instance) {
                plexInstObj[inst.instance] = { library_names: inst.library_names || [] };
            }
        });
        modal.querySelectorAll('.card.plex-instance-card').forEach((card) => {
            const inst = card.querySelector('.load-libs-btn').dataset.inst;
            const libsDiv = card.querySelector(`.plex-libraries`);
            const loadBtn = card.querySelector('.load-libs-btn');
            if (plexInstObj[inst]) {
                loadBtn.disabled = true;
                fetch(`/api/plex/libraries?instance=${encodeURIComponent(inst)}`)
                    .then((res) => res.json())
                    .then((allLibs) => {
                        libsDiv.innerHTML = allLibs
                            .map(
                                (l) => `
                        <label class="library-pill">
                            <input type="checkbox" value="${l}" ${
                                    plexInstObj[inst].library_names.includes(l) ? 'checked' : ''
                                }/>
                            ${l}
                        </label>
                    `
                            )
                            .join('');
                        requestAnimationFrame(() => {
                            libsDiv.classList.add('open');
                            libsDiv.style.maxHeight = libsDiv.scrollHeight + 'px';
                        });
                    })
                    .finally(() => {
                        loadBtn.disabled = false;
                    });
            } else {
                libsDiv.classList.remove('open');
                libsDiv.innerHTML = '';
                libsDiv.style.maxHeight = null;
            }
        });
    } else {
        modal.querySelector('#labelarr-app-type').value = 'radarr';
        modal.querySelector('#labelarr-app-type').dispatchEvent(new Event('change'));
        modal.querySelector('#labelarr-labels').value = '';
        modal.querySelectorAll('.plex-libraries').forEach((div) => {
            div.innerHTML = '';
            div.classList.remove('open');
            div.style.maxHeight = null;
        });
    }
    modal.classList.add('show');
}

export function upgradinatorrModal(editIdx, data, rootConfig, onUpdate) {
    const isEdit = typeof editIdx === 'number';
    const entry = isEdit ? data[editIdx] : {};
    const moduleName = 'upgradinatorr';

    const contentHtml = `
        <label>Instance</label>
        <select id="upgradinatorr-instance" class="select">
            ${[
                ...Object.keys(rootConfig.instances.radarr || {}),
                ...Object.keys(rootConfig.instances.sonarr || {}),
            ]
                .map((inst) => `<option value="${inst}">${humanize(inst)}</option>`)
                .join('')}
        </select>
        <label>Count</label>
        <input type="number" id="upgradinatorr-count" class="input" />
        <label>Tag Name</label>
        <input type="text" id="upgradinatorr-tag-name" class="input" />
        <label>Ignore Tag</label>
        <input type="text" id="upgradinatorr-ignore-tag" class="input" />
        <label>Unattended</label>
        <select id="upgradinatorr-unattended" class="select">
            <option value="true">True</option>
            <option value="false">False</option>
        </select>
        <div id="season-threshold-container" style="display:none;">
            <label>Season Monitored Threshold</label>
            <input type="number" id="upgradinatorr-season-threshold" class="input" />
        </div>
    `;

    const modal = createModal(
        'upgradinatorr-modal',
        `${isEdit ? 'Edit' : 'Add'} Instance`,
        contentHtml,
        [
            { id: 'upgradinatorr-save-btn', label: isEdit ? 'Save' : 'Add', class: 'btn--success' },
            { id: 'upgradinatorr-cancel-btn', label: 'Cancel', class: 'btn--cancel' },
        ]
    );

    const instSelect = modal.querySelector('#upgradinatorr-instance');
    const thresholdField = modal.querySelector('#season-threshold-container');
    instSelect.onchange = () => {
        const isSonarr = Object.keys(rootConfig.instances.sonarr || {}).includes(instSelect.value);
        thresholdField.style.display = isSonarr ? '' : 'none';
    };
    instSelect.dispatchEvent(new Event('change'));

    if (isEdit) {
        modal.querySelector('#upgradinatorr-instance').value = entry.instance;
        modal.querySelector('#upgradinatorr-count').value = entry.count || '';
        modal.querySelector('#upgradinatorr-tag-name').value = entry.tag_name || '';
        modal.querySelector('#upgradinatorr-ignore-tag').value = entry.ignore_tag || '';
        modal.querySelector('#upgradinatorr-unattended').value = String(entry.unattended);
        modal.querySelector('#upgradinatorr-season-threshold').value =
            entry.season_monitored_threshold ?? '';
    }

    modal.querySelector('#upgradinatorr-cancel-btn').onclick = () => modal.remove();

    modal.querySelector('#upgradinatorr-save-btn').onclick = () => {
        const instance = modal.querySelector('#upgradinatorr-instance').value;
        const count = parseInt(modal.querySelector('#upgradinatorr-count').value, 10) || 0;
        const tag_name = modal.querySelector('#upgradinatorr-tag-name').value.trim();
        const ignore_tag = modal.querySelector('#upgradinatorr-ignore-tag').value.trim();
        const unattended = modal.querySelector('#upgradinatorr-unattended').value === 'true';
        const isSonarr = Object.keys(rootConfig.instances.sonarr || {}).includes(instance);
        const season_monitored_threshold = isSonarr
            ? parseInt(modal.querySelector('#upgradinatorr-season-threshold').value, 10) || 0
            : undefined;

        const newEntry = {
            instance,
            count,
            tag_name,
            ignore_tag,
            unattended,
        };
        if (isSonarr) newEntry.season_monitored_threshold = season_monitored_threshold;

        if (isEdit) data[editIdx] = newEntry;
        else data.push(newEntry);

        if (typeof onUpdate === 'function') onUpdate();
        modal.remove();
    };
}

export function unsavedSettingsModal() {
    return new Promise((resolve) => {
        let modal = document.getElementById('unsavedSettingsModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'unsavedSettingsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                ${modalHeaderHtml({ title: 'Unsaved Changes' })}
                <div>
                    <p>You have unsaved changes. What would you like to do?</p>
                </div>
                ${modalFooterHtml([
                    { id: 'unsaved-save-btn', label: 'Save', class: 'btn--success' },
                    { id: 'unsaved-discard-btn', label: 'Discard', class: 'btn--remove' },
                    { id: 'unsaved-cancel-btn', label: 'Cancel', class: 'btn--cancel' },
                ])}
            </div>
        `;
        document.body.appendChild(modal);

        // Use your close helper
        setupModalCloseOnOutsideClick(modal);

        modal.classList.add('show');
        document.body.classList.add('modal-open');

        function cleanup(choice) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            setTimeout(() => modal.remove(), 250);
            resolve(choice);
        }
        modal.querySelector('#unsaved-save-btn').onclick = () => cleanup('save');
        modal.querySelector('#unsaved-discard-btn').onclick = () => cleanup('discard');
        modal.querySelector('#unsaved-cancel-btn').onclick = () => cleanup('cancel');
    });
}
