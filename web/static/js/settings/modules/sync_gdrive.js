import { gdriveSyncModal } from '../modals.js';
import { renderHelp } from '../../helper.js';
import { renderField, renderTextareaArrayField } from '../settings_helpers.js';

let gdriveSyncData = [];

export function renderGdriveSettings(formFields, config) {
    const wrapper = document.createElement('div');
    const help = renderHelp('gdrive_sync');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper';
    Object.entries(config).forEach(([key, value]) => {
        if (key === 'token') {
            wrapper.appendChild(renderTextareaArrayField(key, value));
        } else if (key === 'gdrive_list') {
            const field = document.createElement('div');
            field.className = 'field setting-field';
            field.innerHTML = `
                <label>GDrive Sync</label>
                <button type="button" id="add-gdrive-sync" class="btn add-control-btn">➕ Add gDrive</button>
                <div id="gdrive-sync-list" class="sync-list-container"></div>
            `;
            wrapper.appendChild(field);
            const syncList = field.querySelector('#gdrive-sync-list');
            gdriveSyncData = Array.isArray(value) ? [...value] : [];

            function updateList() {
                if (!Array.isArray(gdriveSyncData) || gdriveSyncData.length === 0) {
                    syncList.innerHTML = `
                        <div class="no-entries">
                          <p>🚫 No drives to list.</p>
                          <p>Click <strong>"Add gDrive"</strong> to configure one.</p>
                        </div>
                    `;
                } else {
                    const validEntries = gdriveSyncData.filter((e) => e && e.id && e.location);
                    if (validEntries.length === 0) {
                        syncList.innerHTML = `
                            <div class="no-entries">
                              <p>🚫 No valid drives to list.</p>
                              <p>Click <strong>"Add gDrive"</strong> to configure one.</p>
                            </div>
                        `;
                        return;
                    }
                    syncList.innerHTML = validEntries
                        .map(
                            (entry, i) => `
                      <div class="card setting-entry show-card">
                        <div class="setting-entry-content">
                          <strong>${entry.name || entry.id}</strong> → <em class="path-text">${
                                entry.location
                            }</em>
                        </div>
                        <div class="setting-entry-actions">
                          <button type="button" data-idx="${i}" class="edit-btn btn">Edit</button>
                          <button type="button" data-idx="${i}" class="remove-btn btn--cancel btn--remove-item btn">-</button>
                        </div>
                      </div>
                    `
                        )
                        .join('');
                }
                syncList.querySelectorAll('.remove-btn').forEach((btn) => {
                    btn.onclick = () => {
                        const confirmed = confirm('Are you sure you want to remove this sync?');
                        if (confirmed) {
                            gdriveSyncData.splice(parseInt(btn.dataset.idx), 1);
                            updateList();
                        }
                    };
                });
                syncList.querySelectorAll('.edit-btn').forEach((btn) => {
                    btn.onclick = () => {
                        const idx = parseInt(btn.dataset.idx, 10);
                        gdriveSyncModal(idx, gdriveSyncData, updateList);
                    };
                });
            }
            field.querySelector('#add-gdrive-sync').onclick = () =>
                gdriveSyncModal(undefined, gdriveSyncData, updateList);
            updateList();
        } else {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}

export function getGdriveSyncData() {
    return gdriveSyncData;
}
