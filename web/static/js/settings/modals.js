import { PLACEHOLDER_TEXT } from './constants.js';
import { buildSchedulePayload, buildInstancesPayload } from '../payload.js';
import { moduleList } from '../helper.js';
import {
    populateScheduleDropdowns,
    loadHolidayPresets,
    populateGDrivePresetsDropdown,
    isValidSchedule,
} from './modal_helpers.js';
import { DAPS } from '../common.js';
const { markDirty, humanize, showToast } = DAPS;

const directoryCache = {};

export function setupModalCloseOnOutsideClick(modal) {
    function handler(e) {
        // If click is directly on .modal (the overlay), not the inner .modal-content
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

// buttons: array of button descriptors {id, label, class, type, disabled}
// leftBtnId: string or array of string ids for leftmost button(s) (e.g., "delete-modal-btn")
export function modalFooterHtml(buttons = [], leftBtnIds = ['delete-modal-btn']) {
    // Always supports one or more left-anchored button(s)
    const left = buttons.filter(b => leftBtnIds.includes(b.id));
    const right = buttons.filter(b => !leftBtnIds.includes(b.id));

    return `
        <div class="modal-footer">
            <div>
                ${left.map(btn => `
                    <button
                        class="btn ${btn.class || ''}"
                        type="${btn.type || 'button'}"
                        id="${btn.id || ''}"
                        ${btn.disabled ? 'disabled' : ''}
                    >${btn.label}</button>
                `).join('')}
            </div>
            <div style="display: flex; gap: 0.7em;">
                ${right.map(btn => `
                    <button
                        class="btn ${btn.class || ''}"
                        type="${btn.type || 'button'}"
                        id="${btn.id || ''}"
                        ${btn.disabled ? 'disabled' : ''}
                    >${btn.label}</button>
                `).join('')}
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

function attachModalSaveCancel(modal, saveSelector, cancelSelector, onSave) {
    const saveBtn = modal.querySelector(saveSelector);
    const cancelBtn = modal.querySelector(cancelSelector);
    if (saveBtn) saveBtn.onclick = onSave;
    if (cancelBtn) cancelBtn.onclick = () => modal.classList.remove('show');
}

export function gdriveSyncModal(editIdx, gdriveSyncData, updateGdriveList) {
    const moduleName = 'sync_gdrive';
    const isEdit = typeof editIdx === 'number';
    let modal = document.getElementById('gdrive-sync-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gdrive-sync-modal';
        modal.className = 'modal';
        modal.innerHTML = `
        <div class="modal-content">
        <label>Preset (optional)</label>
        <select id="gdrive-sync-preset" class="select"> 
            <option value="">— No Preset —</option>
        </select>
        <div id="gdrive-preset-detail" style="margin-bottom: 0.75rem;"></div>
        <label>Name</label><input type="text" id="gdrive-name" class="input" placeholder="${
            PLACEHOLDER_TEXT[moduleName]?.name ?? ''
        }" />
        <label>GDrive ID</label><input type="text" id="gdrive-id" class="input" placeholder="${
            PLACEHOLDER_TEXT[moduleName]?.id ?? ''
        }" />
        <label>Location</label><input type="text" id="gdrive-location" class="input" readonly placeholder="${
            PLACEHOLDER_TEXT[moduleName]?.location ?? ''
        }" />
        ${modalFooterHtml('gdrive-save-btn', 'gdrive-cancel-btn', isEdit ? 'Save' : 'Add')}
        </div>
    `;
        document.body.appendChild(modal);
        modal
            .querySelector('#gdrive-location')
            .addEventListener('click', () =>
                directoryPickerModal(modal.querySelector('#gdrive-location'))
            );
        setTimeout(() => populateGDrivePresetsDropdown(gdriveSyncData, modal.editingIdx), 0);
    }
    modal.editingIdx = isEdit ? editIdx : null;
    const presetSelect = modal.querySelector('#gdrive-sync-preset');
    const presetDetail = modal.querySelector('#gdrive-preset-detail');
    if (presetSelect) {
        if ($(presetSelect).data('select2')) {
            $(presetSelect).val('').trigger('change');
        } else {
            presetSelect.value = '';
        }
    }
    if (presetDetail) presetDetail.innerHTML = '';
    const nameInput = modal.querySelector('#gdrive-name');
    const idInput = modal.querySelector('#gdrive-id');
    const locInput = modal.querySelector('#gdrive-location');
    if (isEdit) {
        const entry = gdriveSyncData[editIdx];
        nameInput.value = entry.name || '';
        idInput.value = entry.id || '';
        locInput.value = entry.location || '';
    } else {
        nameInput.value = '';
        idInput.value = '';
        locInput.value = '';
    }
    const heading = modal.querySelector('h2');
    if (heading) {
        heading.textContent = (isEdit ? 'Edit' : 'Add') + ' GDrive Sync';
    }

    function handleGDriveSave() {
        const name = modal.querySelector('#gdrive-name').value.trim();
        const id = modal.querySelector('#gdrive-id').value.trim();
        const loc = modal.querySelector('#gdrive-location').value.trim();
        if (!name || !id || !loc) {
            return alert('All fields must be filled.');
        }
        const entry = { id, location: loc, name };
        if (typeof editIdx === 'number') {
            gdriveSyncData[editIdx] = entry;
        } else {
            gdriveSyncData.push(entry);
        }
        if (typeof updateGdriveList === 'function') updateGdriveList();
        markDirty();
        populateGDrivePresetsDropdown(gdriveSyncData, modal.editingIdx);
        modal.classList.remove('show');
    }
    attachModalSaveCancel(modal, '#gdrive-save-btn', '#gdrive-cancel-btn', handleGDriveSave);
    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

export function borderReplacerrModal(editIdx, borderReplacerrData, onUpdate) {
    const moduleName = 'border_replacerr';
    const isEdit = typeof editIdx === 'number';
    let modal = document.getElementById('border-replacerr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'border-replacerr-modal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content">
          <h2 id="border-replacerr-modal-heading"></h2>
            <label>Holiday Preset</label>
            <select id="holiday-preset" class="select">
              <option value="">Select preset...</option>
            </select>
            
            <label>Holiday Name</label>
            <input type="text" id="holiday-name" class="input" placeholder="${
                PLACEHOLDER_TEXT[moduleName]?.holiday_name ?? ''
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
            
            <div class="modal-footer">
              <button type="button" id="holiday-save-btn" class="btn btn--success"></button>
              <button type="button" id="holiday-cancel-btn" class="btn btn--cancel">Cancel</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
    }
    loadHolidayPresets();
    populateScheduleDropdowns();
    const heading = modal.querySelector('h2');
    if (heading) {
        heading.textContent = (isEdit ? 'Edit' : 'Add') + ' Holiday';
    }
    const saveBtn = modal.querySelector('#holiday-save-btn');
    if (saveBtn) {
        saveBtn.textContent = isEdit ? 'Save' : 'Add';
    }
    const colorContainer = modal.querySelector('#border-colors-container');
    const addColorBtn = modal.querySelector('#addBorderColor');

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
    addColorBtn.onclick = () => addBorderColor();
    modal.querySelector('#holiday-cancel-btn').onclick = () => {
        modal.classList.remove('show');
    };
    modal.querySelector('#holiday-save-btn').onclick = () => {
        const name = modal.querySelector('#holiday-name').value.trim();
        const existing = borderReplacerrData || [];
        const duplicate = existing.some(
            (entry, i) => entry.holiday === name && (!isEdit || i !== editIdx)
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
        const colors = Array.from(
            modal.querySelectorAll('#border-colors-container input[type="color"]')
        ).map((input) => input.value);
        if (!name || !scheduleFrom || !scheduleTo || !colors.length) {
            alert('All fields are required.');
            return;
        }
        const schedule = `range(${scheduleFrom}-${scheduleTo})`;
        const holidayEntry = {
            holiday: name,
            schedule,
            color: colors,
        };
        if (isEdit) {
            borderReplacerrData[editIdx] = holidayEntry;
        } else {
            borderReplacerrData.push(holidayEntry);
        }
        modal.classList.remove('show');
        if (typeof onUpdate === 'function') onUpdate();
        markDirty();
    };
    colorContainer.innerHTML = '';
    if (isEdit) {
        const entry = borderReplacerrData[editIdx];
        modal.querySelector('#holiday-name').value = entry.holiday || '';
        let from = '',
            to = '';
        if (entry.schedule && entry.schedule.startsWith('range(') && entry.schedule.endsWith(')')) {
            const range = entry.schedule.slice(6, -1);
            const [f, t] = range.split('-');
            from = f || '';
            to = t || '';
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
        (entry.color || []).forEach(addBorderColor);
    } else {
        modal.querySelector('#holiday-name').value = '';
        modal.querySelector('#schedule-from-month').selectedIndex = 0;
        modal.querySelector('#schedule-from-day').selectedIndex = 0;
        modal.querySelector('#schedule-to-month').selectedIndex = 0;
        modal.querySelector('#schedule-to-day').selectedIndex = 0;
        addBorderColor();
    }
    modal.classList.add('show');
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
            markDirty();
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

export function upgradinatorrModal(editIdx, upgradinatorrData, rootConfig, updateTable) {
    const moduleName = 'upgradinatorr';
    const isEdit = typeof editIdx === 'number';
    let modal = document.getElementById('upgradinatorr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'upgradinatorr-modal';
        modal.className = 'modal';
        modal.innerHTML = `
                  <div class="modal-content">
                    <h2>${isEdit ? 'Edit' : 'Add'} Instance</h2>
                    <label>Instance</label>
                    <select id="upgradinatorr-instance" class="select">
                    <option value="" disabled selected>
                        ${PLACEHOLDER_TEXT[moduleName]?.instance ?? 'Select an instance'}
                    </option>
                    </select>
                    <label>Count</label>
                    <input type="number" id="upgradinatorr-count" class="input" placeholder="${
                        PLACEHOLDER_TEXT[moduleName]?.count ?? ''
                    }"/>
                    <label>Tag Name</label>
                    <input type="text" id="upgradinatorr-tag-name" class="input" placeholder="${
                        PLACEHOLDER_TEXT[moduleName]?.tag_name ?? ''
                    }" />
                    <label>Ignore Tag</label>
                    <input type="text" id="upgradinatorr-ignore-tag" class="input" placeholder="${
                        PLACEHOLDER_TEXT[moduleName]?.ignore_tag ?? ''
                    }" />
                    <label>Unattended</label>
                    <select id="upgradinatorr-unattended" class="select">
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                    <div id="season-threshold-container" style="display:none;">
                      <label>Season Monitored Threshold</label>
                      <input type="number" id="upgradinatorr-season-threshold" class="input" min="0" step="1" />
                    </div>
                    <div class="modal-footer">
                      <button id="upgradinatorr-save-btn" class="btn btn--success">${
                          isEdit ? 'Save' : 'Add'
                      }</button>
                      <button id="upgradinatorr-cancel-btn" class="btn btn--cancel">Cancel</button>
                    </div>
                  </div>
                `;
        document.body.appendChild(modal);
        const instSelect = modal.querySelector('#upgradinatorr-instance');
        const instList = [
            ...Object.keys(rootConfig.instances.radarr || {}),
            ...Object.keys(rootConfig.instances.sonarr || {}),
        ];
        instList.forEach((inst) => {
            const opt = document.createElement('option');
            opt.value = inst;
            opt.textContent = humanize(inst);
            instSelect.appendChild(opt);
        });
        modal.querySelector('#upgradinatorr-cancel-btn').onclick = () => {
            modal.classList.remove('show');
        };

        const thresholdField = modal.querySelector('#season-threshold-container');
        instSelect.addEventListener('change', () => {
            const selected = instSelect.value;
            const isSonarr = Object.keys(rootConfig.instances.sonarr || {}).includes(selected);
            thresholdField.style.display = isSonarr ? '' : 'none';
        });

        instSelect.dispatchEvent(new Event('change'));
        modal.querySelector('#upgradinatorr-save-btn').onclick = () => {
            const inst = modal.querySelector('#upgradinatorr-instance').value;
            const count = parseInt(modal.querySelector('#upgradinatorr-count').value, 10) || 0;
            const tag_name = modal.querySelector('#upgradinatorr-tag-name').value.trim();
            const ignore_tag = modal.querySelector('#upgradinatorr-ignore-tag').value.trim();
            const unattended = modal.querySelector('#upgradinatorr-unattended').value === 'true';
            const isSonarr = Object.keys(rootConfig.instances.sonarr || {}).includes(inst);
            const season_threshold = isSonarr
                ? parseInt(modal.querySelector('#upgradinatorr-season-threshold').value, 10) || 0
                : undefined;
            const entry = {
                instance: inst,
                count,
                tag_name,
                ignore_tag,
                unattended,
            };
            if (isSonarr) entry.season_monitored_threshold = season_threshold;

            const existingIdx = upgradinatorrData.findIndex((e) => e.instance === inst);
            if (existingIdx !== -1) {
                upgradinatorrData[existingIdx] = entry;
            } else {
                upgradinatorrData.push(entry);
            }
            if (typeof updateTable === 'function') updateTable();
            markDirty();
            modal.classList.remove('show');
        };
    }
    modal.querySelector('#upgradinatorr-instance').value = isEdit
        ? upgradinatorrData[editIdx].instance
        : '';
    modal.querySelector('#upgradinatorr-count').value = isEdit
        ? upgradinatorrData[editIdx].count
        : '';
    modal.querySelector('#upgradinatorr-tag-name').value = isEdit
        ? upgradinatorrData[editIdx].tag_name
        : '';
    modal.querySelector('#upgradinatorr-ignore-tag').value = isEdit
        ? upgradinatorrData[editIdx].ignore_tag
        : '';
    modal.querySelector('#upgradinatorr-unattended').value = isEdit
        ? String(upgradinatorrData[editIdx].unattended)
        : 'false';

    const seasonThresholdInput = modal.querySelector('#upgradinatorr-season-threshold');
    if (seasonThresholdInput) {
        seasonThresholdInput.value = isEdit
            ? typeof upgradinatorrData[editIdx].season_monitored_threshold !== 'undefined'
                ? upgradinatorrData[editIdx].season_monitored_threshold
                : ''
            : '99';
    }

    const instSelect = modal.querySelector('#upgradinatorr-instance');
    const thresholdField = modal.querySelector('#season-threshold-container');
    if (instSelect && thresholdField) {
        instSelect.dispatchEvent(new Event('change'));
    }
    const heading = modal.querySelector('h2');
    if (heading) {
        heading.textContent = (isEdit ? 'Edit' : 'Add') + ' Upgradinatorr Instance List';
    }
    const saveBtn = modal.querySelector('#upgradinatorr-save-btn');
    if (saveBtn) {
        saveBtn.textContent = isEdit ? 'Save' : 'Add';
    }
    modal.classList.add('show');
}

export function directoryPickerModal(inputElement) {
    let suggestionTimeout;
    let modal = document.getElementById('dir-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dir-modal';
        modal.className = 'modal';
        modal.classList.remove('show');
        modal.innerHTML = `
<div class="modal-content">
<h2>Select Directory</h2>
<input type="text" id="dir-path-input" class="input" placeholder="Type or paste a path…" />
<ul id="dir-list" class="dir-list"></ul>
<div class="modal-footer">
    <button type="button" id="dir-create" class="btn">New Folder</button>
    <button type="button" id="dir-accept" class="btn btn--success">Accept</button>
    <button type="button" id="dir-cancel" class="btn btn--cancel">Cancel</button>
</div>
</div>`;
        document.body.appendChild(modal);
        const dirList = modal.querySelector('#dir-list');
        const pathInput = modal.querySelector('#dir-path-input');
        async function updateDirList() {
            const current = modal.currentPath;
            const list = directoryCache[current] || [];
            dirList.innerHTML = '';

            const up = document.createElement('li');
            up.textContent = '..';
            up.onclick = () => {
                if (current !== '/') {
                    modal.currentPath = current.split('/').slice(0, -1).join('/') || '/';
                    showPath(modal.currentPath);
                }
            };
            dirList.appendChild(up);

            (directoryCache[current] || []).sort().forEach((name) => {
                const li = document.createElement('li');
                li.textContent = name;
                li.onclick = () => {
                    modal.currentPath = current.endsWith('/')
                        ? current + name
                        : current + '/' + name;
                    showPath(modal.currentPath);
                };
                li.ondblclick = () => {
                    inputElement.value = modal.currentPath;
                    closeModal();
                };
                dirList.appendChild(li);
            });
        }

        function showPath(val) {
            modal.currentPath = val;
            pathInput.value = val;
            if (!directoryCache[val]) {
                fetch(`/api/list?path=${encodeURIComponent(val)}`)
                    .then((res) => res.json())
                    .then((d) => {
                        directoryCache[val] = d.directories;
                        updateDirList();
                    })
                    .catch((e) => {
                        console.error('List error:', e);
                    });
            } else {
                updateDirList();
            }
        }

        function closeModal() {
            modal.classList.remove('show');
            window.currentInput = null;
        }
        pathInput.addEventListener('input', () => {
            const val = pathInput.value.trim() || '/';
            modal.currentPath = val;
            clearTimeout(suggestionTimeout);
            suggestionTimeout = setTimeout(() => {
                const parent = val === '/' ? '/' : val.replace(/\/?[^/]+$/, '') || '/';
                const partial = val.slice(parent.length).replace(/^\/+/, '').toLowerCase();
                const entries = directoryCache[parent] || [];
                if (entries.length) {
                    dirList.innerHTML = '';

                    const up = document.createElement('li');
                    up.textContent = '..';
                    up.onclick = () => {
                        if (parent !== '/') {
                            modal.currentPath = parent.split('/').slice(0, -1).join('/') || '/';
                            showPath(modal.currentPath);
                        }
                    };
                    dirList.appendChild(up);

                    entries
                        .filter((name) => name.toLowerCase().startsWith(partial))
                        .sort()
                        .forEach((name) => {
                            const li = document.createElement('li');
                            li.textContent = name;
                            li.onclick = () => {
                                modal.currentPath = parent.endsWith('/')
                                    ? parent + name
                                    : parent + '/' + name;
                                showPath(modal.currentPath);
                            };
                            li.ondblclick = () => {
                                inputElement.value = modal.currentPath;
                                closeModal();
                            };
                            dirList.appendChild(li);
                        });
                }

                const entry = val.slice(parent.length).replace(/^\/+/, '');
                if (directoryCache[parent]?.includes(entry)) {
                    showPath(val);
                }
            }, 200);
        });
        pathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                showPath(pathInput.value.trim() || '/');
            }
        });
        modal.querySelector('#dir-create').onclick = async () => {
            const name = prompt('New folder name:');
            if (!name) return;
            const newPath = modal.currentPath.endsWith('/')
                ? modal.currentPath + name
                : modal.currentPath + '/' + name;
            try {
                await fetch(`/api/create-folder?path=${encodeURIComponent(newPath)}`, {
                    method: 'POST',
                });
                if (!directoryCache[modal.currentPath]) directoryCache[modal.currentPath] = [];
                directoryCache[modal.currentPath].push(name);
                showPath(newPath);
            } catch (e) {
                alert('Create failed: ' + e.message);
            }
        };
        modal.querySelector('#dir-cancel').onclick = closeModal;

        modal.updateDirList = updateDirList;
        modal.showPath = showPath;
        modal.closeModal = closeModal;
    }

    modal.currentInput = inputElement;

    const acceptBtn = modal.querySelector('#dir-accept');
    acceptBtn.onclick = () => {
        modal.currentInput.value = modal.currentPath;
        modal.closeModal();
    };
    modal.currentPath = inputElement.value.trim() || '/';
    const pathInput = modal.querySelector('#dir-path-input');
    pathInput.value = modal.currentPath;

    if (inputElement.placeholder) {
        pathInput.placeholder = inputElement.placeholder;
    }

    if (!directoryCache[modal.currentPath]) {
        fetch(`/api/list?path=${encodeURIComponent(modal.currentPath)}`)
            .then((res) => res.json())
            .then((d) => {
                directoryCache[modal.currentPath] = d.directories;
                modal.updateDirList();
            });
    } else {
        modal.updateDirList();
    }
    modal.classList.add('show');
}
