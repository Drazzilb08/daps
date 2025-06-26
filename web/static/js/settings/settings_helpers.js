import { directoryPickerModal } from './modals.js';
import {
    BOOL_FIELDS,
    TEXT_FIELDS,
    TEXTAREA_FIELDS,
    INT_FIELDS,
    DROP_DOWN_OPTIONS,
    DROP_DOWN_FIELDS,
    DIR_PICKER,
    ARR_AND_PLEX_INSTANCES,
    PLACEHOLDER_TEXT,
    DRAG_AND_DROP,
    LIST_FIELD,
} from './constants.js';
import { humanize, showToast } from '../common.js';

function createListField(name, list) {
    const label = humanize(name);
    const moduleName = window.currentModuleName;
    const placeholder = PLACEHOLDER_TEXT[moduleName]?.[name] ?? '';

    const field = document.createElement('div');
    field.className = 'field setting-field';
    field.innerHTML = `
            <label>${label}</label>
            <button type="button" class="btn add-control-btn">➕ Add ${label}</button>
            <div class="subfield-list"></div>
        `;
    const container = field.querySelector('.subfield-list');
    let data = Array.isArray(list) ? [...list] : [];
    const supportsMode = moduleName === 'nohl';
    data = data.map((entry) => {
        if (typeof entry === 'string') {
            return supportsMode
                ? {
                      path: entry,
                      mode: 'resolve',
                  }
                : {
                      path: entry,
                  };
        }
        return entry;
    });
    if (data.length === 0) {
        data = [
            supportsMode
                ? {
                      path: '',
                      mode: 'resolve',
                  }
                : {
                      path: '',
                  },
        ];
    }

    function renderSubfield(entry) {
        const sub = document.createElement('div');
        sub.className = 'subfield';
        sub.innerHTML = `
                <input type="text" class="input" name="${name}" value="${
            entry.path
        }" readonly placeholder="${placeholder}" />
                ${
                    supportsMode
                        ? `
                    <select class="select source-mode" name="mode">
                        <option value="resolve"${
                            entry.mode === 'resolve' ? ' selected' : ''
                        }>Resolve</option>
                        <option value="scan"${
                            entry.mode === 'scan' ? ' selected' : ''
                        }>Scan</option>
                    </select>`
                        : ''
                }
                <button type="button" class="btn--cancel remove-directory btn">−</button>
            `;
        const txt = sub.querySelector('input');
        txt.addEventListener('click', () => directoryPickerModal(txt));
        sub.querySelector('.remove-directory').onclick = () => {
            sub.remove();
            updateRemoveButtons();
        };
        return sub;
    }
    data.forEach((entry) => container.appendChild(renderSubfield(entry)));

    function updateRemoveButtons() {
        const subs = container.querySelectorAll('.subfield');
        subs.forEach((sub) => {
            const btn = sub.querySelector('.remove-directory');
            btn.disabled = subs.length <= 1;
            btn.style.opacity = btn.disabled ? '0.5' : '';
            btn.style.cursor = btn.disabled ? 'not-allowed' : '';
        });
    }
    updateRemoveButtons();
    field.querySelector('.add-control-btn').onclick = () => {
        container.appendChild(
            renderSubfield(
                supportsMode
                    ? {
                          path: '',
                          mode: 'resolve',
                      }
                    : {
                          path: '',
                      }
            )
        );
        updateRemoveButtons();
    };
    return field;
}

function createField(label, html) {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label>${label}</label>
      <div class="field-control">${html}</div>
    `;
    return div;
}

function boolDropdown(name, selected) {
    return `<select class="select" name="${name}">
        <option value="true"${selected ? ' selected' : ''}>True</option>
        <option value="false"${!selected ? ' selected' : ''}>False</option>
    </select>`;
}

export function renderTextField(name, value) {
    /**
     * Render a list-of-directories field (no drag handles, no drag logic).
     * @param {string} name
     * @param {string[]} list
     */

    const label = humanize(name);
    const isDir = DIR_PICKER.includes(name);
    const readonly = isDir ? 'readonly' : '';

    const moduleName = window.currentModuleName;
    const placeholder =
        PLACEHOLDER_TEXT[moduleName]?.[name] ?? (isDir ? 'Click to pick a directory' : '');
    const field = createField(
        label,
        `<input type="text" class="input" name="${name}" value="${
            value || ''
        }" ${readonly} placeholder="${placeholder}" />`
    );
    if (isDir) {
        const input = field.querySelector(`input[name="${name}"]`);
        input.addEventListener('click', () => directoryPickerModal(input));
    }
    return field;
}

export function renderBooleanField(name, value) {
    const label = humanize(name);
    return createField(label, boolDropdown(name, value === true || value === 'true'));
}

export function renderDropdownField(name, value, options) {
    const moduleName = window.currentModuleName;
    const placeholder = PLACEHOLDER_TEXT[moduleName]?.[name];

    let html = `<select class="select" name="${name}">`;
    if (placeholder) {
        html += `<option value="" disabled${
            value == null || value === '' ? ' selected' : ''
        }>${placeholder}</option>`;
    }
    html += options
        .map(
            (opt) =>
                `<option value="${opt}"${value === opt ? ' selected' : ''}>${humanize(
                    opt
                )}</option>`
        )
        .join('');
    html += `</select>`;
    return createField(humanize(name), html);
}

/**
 * Render a textarea for array or JSON input, auto-resizing to content.
 * @param {string} name - The field name (key).
 * @param {Array|Object|string} values - Array of lines or JSON object/string.
 * @returns {HTMLDivElement} The created field element.
 */
export function renderTextareaArrayField(name, values) {
    let content = '';
    let placeholder = '';
    if (name === 'token') {
        placeholder = PLACEHOLDER_TEXT?.[window.currentModuleName]?.token ?? '';
        content =
            values === null || values === 'null'
                ? ''
                : typeof values === 'object'
                ? JSON.stringify(values, null, 2)
                : values;
    } else {
        content = Array.isArray(values) ? values.join('\n') : '';
        placeholder = 'Enter items, one per line';
    }
    const moduleName = window.currentModuleName;
    placeholder = PLACEHOLDER_TEXT?.[moduleName]?.[name] ?? placeholder;

    const textarea = document.createElement('textarea');
    textarea.name = name;
    textarea.rows = 6;
    textarea.className = 'textarea';
    textarea.value = content;
    textarea.placeholder = placeholder;
    const field = createField(humanize(name), '');
    field.querySelector('.field-control').appendChild(textarea);
    setTimeout(() => {
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }
    }, 0);
    return field;
}

/**
 * Render a number input field.
 * @param {string} name - The field name.
 * @param {number} value - The current value.
 * @returns {HTMLDivElement} The created field element.
 */
export function renderNumberField(name, value) {
    const label = humanize(name);
    const html = `<input type="number" class="input number-field" name="${name}" value="${value}" min="0" step="1" />`;
    const div = createField(label, html);
    div.classList.add('show-field');
    return div;
}

export function renderRemoveBordersBooleanField(config) {
    const name = 'remove_borders';
    const label = humanize(name);
    const borderColors = Array.isArray(config.border_colors)
        ? config.border_colors.filter(Boolean)
        : [];
    let forcedValue,
        disabled,
        warning = '';
    if (borderColors.length === 0) {
        forcedValue = true;
        disabled = true;
        warning =
            'Borders will be removed because no border colors are set. Add a border color to disable this option.';
    } else {
        forcedValue = false;
        disabled = true;
        warning =
            'Cannot remove borders while custom border colors are set. Remove all border colors to enable this option.';
    }
    let html = `<select class="select" name="${name}"${disabled ? ' disabled' : ''}>
        <option value="true"${forcedValue ? ' selected' : ''}>True</option>
        <option value="false"${!forcedValue ? ' selected' : ''}>False</option>
    </select>`;
    html += `<div class="field-hint">
        <strong>Note:</strong> This setting is <b>automatically controlled</b>:
        <ul style="margin:0.25em 0 0.25em 1.5em;padding:0;">
            <li>If any border colors are set, borders will not be removed.</li>
            <li>If no border colors are set, borders will always be removed.</li>
        </ul>
        ${warning ? `<span class="field-hint-warning-text">${warning}</span>` : ''}
    </div>`;
    const div = createField(label, html);
    div.classList.add('show-field');
    return div;
}

export function renderPlexSonarrRadarrInstancesField(
    formFields,
    instanceList,
    rootConfig,
    moduleName
) {
    const allInstancesEmpty =
        !rootConfig.instances ||
        !Object.values(rootConfig.instances).some(
            (group) => group && typeof group === 'object' && Object.keys(group).length > 0
        );
    if (allInstancesEmpty) {
        const field = document.createElement('div');
        field.className = `field instances-field ${moduleName}`;
        field.innerHTML = `<label>Instances</label><div class="instances-list"></div>`;
        formFields.appendChild(field);

        const listDiv = field.querySelector('.instances-list');
        const noCard = document.createElement('div');
        noCard.className = 'card plex-instance-card';
        noCard.innerHTML = `

          <div class="plex-libraries">
            <p class="no-entries" style="margin: 0.5em 0 0 1em;">
              🚫 No instances configured for ${humanize(moduleName)}.
            </p>
          </div>
        `;
        listDiv.appendChild(noCard);
        return;
    }
    const field = document.createElement('div');
    field.className = 'field instances-field poster-cleanarr';
    field.innerHTML = `<label>Instances</label><div class="instances-list"></div>`;
    formFields.appendChild(field);
    const listDiv = field.querySelector('.instances-list');
    const scalarInst = [];
    const plexData = {};
    (instanceList || []).forEach((item) => {
        if (typeof item === 'string') scalarInst.push(item);
        else if (typeof item === 'object') {
            const inst = Object.keys(item)[0];
            plexData[inst] = item[inst];
        }
    });

    function renderARRGroupCard(instType, instances) {
        const card = document.createElement('div');
        card.className = `card plex-instance-card`;
        card.innerHTML = `
          <div class="plex-instance-header">
            <h3>${humanize(instType)}</h3>
          </div>
          <div class="plex-libraries open"></div>
        `;
        const groupDiv = card.querySelector('.plex-libraries.open');
        instances.forEach((instanceName) => {
            const label = document.createElement('label');
            label.className = 'library-pill';
            label.innerHTML = `
                <input type="checkbox" name="instances" value="${instanceName}" ${
                scalarInst.includes(instanceName) ? 'checked' : ''
            }/>
                ${humanize(instanceName)}
            `;
            groupDiv.appendChild(label);
        });
        return card;
    }

    const radarrDefs = rootConfig.instances.radarr || {};
    const radarrInstances = Object.keys(rootConfig.instances.radarr || {});
    if (radarrInstances.length) {
        listDiv.appendChild(renderARRGroupCard('radarr', radarrInstances));
    } else {
        const noRadarrCard = document.createElement('div');
        noRadarrCard.className = 'card plex-instance-card';
        noRadarrCard.innerHTML = `
          <div class="plex-instance-header">
            <h3>${humanize('radarr')}</h3>
          </div>
          <div class="plex-libraries">
            <p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No instances configured for ${humanize(
                'radarr'
            )}.</p>
          </div>
        `;
        listDiv.appendChild(noRadarrCard);
    }
    const sonarrDefs = rootConfig.instances.sonarr || {};
    const sonarrInstances = Object.keys(rootConfig.instances.sonarr || {});
    if (sonarrInstances.length) {
        listDiv.appendChild(renderARRGroupCard('sonarr', sonarrInstances));
    } else {
        const noSonarrCard = document.createElement('div');
        noSonarrCard.className = 'card plex-instance-card';
        noSonarrCard.innerHTML = `
          <div class="plex-instance-header">
            <h3>${humanize('sonarr')}</h3>
          </div>
          <div class="plex-libraries">
            <p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No instances configured for ${humanize(
                'sonarr'
            )}.</p>
          </div>
        `;
        listDiv.appendChild(noSonarrCard);
    }
    if (ARR_AND_PLEX_INSTANCES.includes(moduleName)) {
        const plexInstances = Object.keys(rootConfig.instances.plex || {});
        if (plexInstances.length) {
            const plexWrapper = document.createElement('div');
            plexWrapper.className = 'card';
            plexWrapper.innerHTML = '<h3>Plex</h3>';
            listDiv.appendChild(plexWrapper);
            plexInstances.forEach((pi) => {
                const libs = plexData[pi]?.library_names || [];
                const wrapper = document.createElement('div');
                wrapper.innerHTML = `
            <div class="plex-instance-header">
                <h3>${humanize(pi)}</h3>
            </div>
            <div class="library-actions">
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn select-all-libs" data-inst="${pi}">Select All</button>
                    <button type="button" class="btn deselect-all-libs" data-inst="${pi}">Deselect All</button>
                </div>
                <button type="button" class="btn load-libs-btn plex-instance-header" data-inst="${pi}">Load Libraries</button>
            </div>
            <div id="plex-libs-${pi}" class="plex-libraries" style="max-height: 0px;"></div>
            `;
                plexWrapper.appendChild(wrapper);
                const loadBtn = wrapper.querySelector('.load-libs-btn');
                const libsDiv = wrapper.querySelector(`#plex-libs-${pi}`);
                loadBtn.addEventListener('click', async () => {
                    try {
                        const res = await fetch(
                            `/api/plex/libraries?instance=${encodeURIComponent(pi)}`
                        );
                        if (!res.ok) throw new Error(await res.text());
                        const fetchedLibs = await res.json();
                        const existing = plexData[pi]?.library_names || [];
                        libsDiv.innerHTML = fetchedLibs
                            .map(
                                (l) => `
            <label class="library-pill">
                <input type="checkbox" name="instances.${pi}.library_names" value="${l}" ${
                                    existing.includes(l) ? 'checked' : ''
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
                        showToast?.(`✅ Loaded libraries for ${humanize(pi)}`, 'success');
                    } catch (err) {
                        showToast?.(
                            `❌ Failed to load libraries for ${humanize(pi)}: ${err.message}`,
                            'error'
                        );
                    }
                });
                wrapper.querySelector('.select-all-libs')?.addEventListener('click', () => {
                    libsDiv
                        .querySelectorAll('input[type="checkbox"]')
                        .forEach((cb) => (cb.checked = true));
                });
                wrapper.querySelector('.deselect-all-libs')?.addEventListener('click', () => {
                    libsDiv
                        .querySelectorAll('input[type="checkbox"]')
                        .forEach((cb) => (cb.checked = false));
                });

                if (libs.length) {
                    libsDiv.innerHTML = libs
                        .map(
                            (l) => `
                        <label class="library-pill">
                            <input type="checkbox" name="instances.${pi}.library_names" value="${l}" checked/>
                            ${l}
                        </label>
                    `
                        )
                        .join('');

                    requestAnimationFrame(() => {
                        libsDiv.classList.add('open');
                        libsDiv.style.maxHeight = libsDiv.scrollHeight + 'px';
                    });
                }
            });
        } else {
            const noPlexCard = document.createElement('div');
            noPlexCard.className = 'card plex-instance-card';
            noPlexCard.innerHTML = `
              <div class="plex-instance-header">
                <h3>${humanize('plex')}</h3>
              </div>
              <div class="plex-libraries">
                <p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No instances configured for ${humanize(
                    'plex'
                )}.</p>
              </div>
            `;
            listDiv.appendChild(noPlexCard);
        }
    }
}

export function createDragDropField(name, list) {
    const field = document.createElement('div');

    const moduleName = window.currentModuleName;
    const placeholder = PLACEHOLDER_TEXT[moduleName]?.[name] || '';
    field.className = 'field setting-field';
    field.innerHTML = `
      <label>${humanize(name)}</label>
      <button type="button" class="btn add-control-btn">➕ Add Directory</button>
      <div class="subfield-list"></div>
    `;
    const container = field.querySelector('.subfield-list');
    (Array.isArray(list) ? list : [list]).forEach((dir, idx) => {
        const sub = document.createElement('div');
        sub.className = 'subfield';
        sub.innerHTML = `
         <span class="drag-handle" style="cursor: grab;">⋮⋮</span>
         <input type="text" class="input" name="${name}" value="${dir}" readonly placeholder="${placeholder}"/>
         <button type="button" class="btn--cancel remove-directory btn">−</button>
       `;
        const txt = sub.querySelector('input[type="text"]');
        txt.addEventListener('click', () => directoryPickerModal(txt));
        sub.querySelector('.remove-directory').onclick = () => {
            sub.remove();
            updateRemoveButtons();
        };
        container.appendChild(sub);
    });
    const updateRemoveButtons = () => {
        const subs = container.querySelectorAll('.subfield');
        subs.forEach((sub) => {
            const btn = sub.querySelector('.remove-directory');
            if (subs.length <= 1) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.cursor = '';
            }
        });
    };
    updateRemoveButtons();
    const addBtn = field.querySelector('.add-control-btn');
    addBtn.onclick = () => {
        const sub = document.createElement('div');
        sub.className = 'subfield';
        sub.innerHTML = `
         <span class="drag-handle" style="cursor: grab;">⋮⋮</span>
         <input type="text" class="input" name="${name}" readonly placeholder="${placeholder}"/>
         <button type="button" class="remove-directory">−</button>
       `;
        const txt = sub.querySelector('input[type="text"]');
        txt.addEventListener('click', () => directoryPickerModal(txt));
        sub.querySelector('.remove-directory').onclick = () => {
            sub.remove();
            updateRemoveButtons();
        };
        container.appendChild(sub);
        updateRemoveButtons();
        makeDraggable(container);
    };

    function makeDraggable(list) {
        let dragged;
        list.querySelectorAll('.subfield').forEach((item) => {
            item.setAttribute('draggable', true);
            item.classList.add('draggable');
            item.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            item.addEventListener('dragstart', (e) => {
                dragged = item;
                item.classList.add('dragging');
                item.style.opacity = '0.5';
                item.style.transform = 'scale(1.05)';
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const bounding = item.getBoundingClientRect();
                const offset = e.clientY - bounding.top + bounding.height / 2;
                if (offset > bounding.height) {
                    list.insertBefore(dragged, item.nextSibling);
                } else {
                    list.insertBefore(dragged, item);
                }
            });
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
            });
            item.addEventListener('dragend', () => {
                dragged.classList.remove('dragging');
                dragged.style.opacity = '';
                dragged.style.transform = '';
                list.querySelectorAll('.subfield').forEach((sub) =>
                    sub.classList.remove('drag-over')
                );
            });
        });
    }
    makeDraggable(container);
    return field;
}

export function renderField(formFields, key, value) {
    const moduleName = window.currentModuleName;
    if (LIST_FIELD[moduleName] && LIST_FIELD[moduleName].includes(key)) {
        formFields.appendChild(createListField(key, value));
        return;
    } else if (DRAG_AND_DROP[moduleName] && DRAG_AND_DROP[moduleName].includes(key)) {
        formFields.appendChild(createDragDropField(key, value));
        return;
    } else if (DROP_DOWN_FIELDS.includes(key)) {
        const opts = DROP_DOWN_OPTIONS[key] || [];
        formFields.appendChild(renderDropdownField(key, value, opts));
    } else if (BOOL_FIELDS.includes(key)) {
        formFields.appendChild(renderBooleanField(key, value));
    } else if (INT_FIELDS.includes(key)) {
        formFields.appendChild(renderNumberField(key, value));
    } else if (TEXTAREA_FIELDS.includes(key)) {
        formFields.appendChild(renderTextareaArrayField(key, value));
    } else if (TEXT_FIELDS.includes(key)) {
        formFields.appendChild(renderTextField(key, value));
    } else if (DIR_PICKER.includes(key)) {
        formFields.appendChild(renderTextField(key, value));
    } else {
        formFields.appendChild(renderTextField(key, value));
    }
}
