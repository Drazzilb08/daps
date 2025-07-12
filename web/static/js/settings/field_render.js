import { humanize } from '../util.js';
import { openModal } from './modals.js';
import * as Modals from './modals.js';
import { markDirty, showToast } from '../util.js';


function renderTextField(field, value, config) {
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

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.name = field.key;
    input.id = field.key;
    input.value = value ?? '';
    if (field.modal === 'directoryPickerModal') input.readOnly = true;
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value;
        });
    }
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

function renderNumberField(field, value, config) {
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

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input';
    input.name = field.key;
    input.id = field.key;
    input.value = value ?? '';
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value === '' ? null : parseInt(input.value, 10);
        });
    }
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

function renderDropdownField(field, value, config) {
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
    field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.selected = value === opt;
        option.textContent = opt;
        select.appendChild(option);
    });
    if (config) {
        select.addEventListener('change', () => {
            config[field.key] = select.value;
        });
    }
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

function renderDirField(field, value, config) {
    const div = document.createElement('div');
    div.className = 'settings-field-row field-dir';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input dir-input';
    input.name = field.key;
    input.value = value ?? '';
    input.readOnly = !!field.modal;
    
    if (field.modal && typeof Modals[field.modal] === 'function') {
        input.addEventListener('click', () => Modals[field.modal](input, config));
    }
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value;
        });
    }
    div.appendChild(input);

    return div;
}

function renderInstancesField(field, value = [], config, rootConfig) {
    const div = document.createElement('div');
    div.className = 'field field-instances';

    // 
    value = (
        Array.isArray(value) &&
        value.length &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        'instance' in value[0]
    )
        ? value.map(obj => ({
            [obj.instance]: { library_names: Array.isArray(obj.library_names) ? obj.library_names : [] }
        }))
        : value;
    // State
    const instanceTypes = field.instance_types && Array.isArray(field.instance_types)
        ? field.instance_types
        : ['radarr', 'sonarr', 'plex'];
    let selected = Array.isArray(value) ? value.slice() : [];

    function isSelected(type, name) {
        if (type === 'plex') {
            return selected.some(
                x => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
            );
        }
        return selected.includes(name);
    }

    function getPlexLibraries(name) {
        const entry = selected.find(
            x => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
        );
        return entry ? (entry[name].library_names || []) : [];
    }

    function setPlexLibraries(name, libs) {
        const idx = selected.findIndex(
            x => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
        );
        if (idx !== -1) {
            selected[idx][name].library_names = libs;
            config[field.key] = Array.isArray(value) ? selected.slice() : [];
        }
    }

    function renderPlexLibraries(name, container, checkedLibs) {
        container.innerHTML = 'Loading libraries...';
        fetch(`/api/plex/libraries?instance=${encodeURIComponent(name)}`)
            .then(async r => {
                let data;
                try {
                    data = await r.clone().json();
                } catch {
                    data = await r.text();
                }
                if (!r.ok) {
                    let errorMsg = r.statusText;
                    if (data && typeof data === 'object' && data.error) {
                        errorMsg = data.error;
                    } else if (typeof data === 'string') {
                        errorMsg = data;
                    }
                    throw new Error(errorMsg);
                }
                return data;
            })
            .then(libraries => {
                container.innerHTML = '';
                if (Array.isArray(libraries) && libraries.length) {
                    libraries.forEach(lib => {
                        const label = document.createElement('label');
                        
                        const input = document.createElement('input');
                        input.type = 'checkbox';
                        input.checked = checkedLibs.includes(lib);
                        input.onchange = () => {
                            let libs = getPlexLibraries(name).slice();
                            if (input.checked) {
                                if (!libs.includes(lib)) libs.push(lib);
                            } else {
                                libs = libs.filter(l => l !== lib);
                            }
                            setPlexLibraries(name, libs);
                        };
                        label.appendChild(input);
                        label.appendChild(document.createTextNode(' ' + lib));
                        container.appendChild(label);
                    });
                } else {
                    container.textContent = 'No libraries found for this instance.';
                }
            })
            .catch(e => {
                showToast('Error loading libraries: ' + e.message, 'error');
                console.error('Error fetching Plex libraries:', e);
            });
    }

    // -- THE KEY: FULL RE-RENDER LOGIC --
    function renderSelf() {
        div.innerHTML = ''; // clear previous content

        if (field.add_posters_option) {
            const postersDiv = document.createElement('div');
            postersDiv.className = 'field add-posters-toggle';

            const label = document.createElement('label');
            label.textContent = 'Add Posters';
            

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!config.add_posters;
            input.addEventListener('change', () => {
                config.add_posters = input.checked;
            });

            postersDiv.appendChild(label);
            postersDiv.appendChild(input);
            div.appendChild(postersDiv);
        }

        const label = document.createElement('label');
        label.textContent = field.label || 'Instances';
        div.appendChild(label);

        instanceTypes.forEach(type => {
            const all = rootConfig.instances && rootConfig.instances[type]
                ? Object.keys(rootConfig.instances[type])
                : [];
            if (!all.length) return;
            const typeDiv = document.createElement('div');
            typeDiv.className = 'instances-type-block';

            const typeLabel = document.createElement('div');
            typeLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            
            typeDiv.appendChild(typeLabel);

            all.forEach(instName => {
                const row = document.createElement('div');
                row.className = 'instance-row';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = isSelected(type, instName);
                chk.id = `${type}_${instName}_chk`;

                chk.addEventListener('change', () => {
                    // Update selected
                    if (chk.checked) {
                        if (type === 'plex') {
                            selected.push({ [instName]: { library_names: [] } });
                        } else {
                            selected.push(instName);
                        }
                    } else {
                        if (type === 'plex') {
                            const idx = selected.findIndex(
                                x => typeof x === 'object' && x !== null && Object.keys(x)[0] === instName
                            );
                            if (idx !== -1) selected.splice(idx, 1);
                        } else {
                            const idx = selected.indexOf(instName);
                            if (idx !== -1) selected.splice(idx, 1);
                        }
                    }
                    config[field.key] = Array.isArray(value) ? selected.slice() : [];
                    renderSelf(); // THIS triggers the re-render
                });

                const lbl = document.createElement('label');
                lbl.htmlFor = chk.id;
                lbl.textContent = " " + instName;
                row.appendChild(chk);
                row.appendChild(lbl);

                // For plex: libraries UI if selected
                if (type === 'plex' && chk.checked) {
                    const libList = document.createElement('div');
                    libList.className = 'plex-library-list';
                    // Pull current checked libraries
                    const libs = getPlexLibraries(instName);
                    renderPlexLibraries(instName, libList, libs);
                    row.appendChild(libList);
                }

                typeDiv.appendChild(row);
            });

            div.appendChild(typeDiv);
        });
    }
    

    // Initial render
    renderSelf();

    return div;
}

function renderDirListDragDropField(field, value = [], config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir field-dragdrop';

    // --- LABEL COLUMN ---
    const labelCol = document.createElement('div');
    labelCol.className = 'dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    // Flex filler pushes button to bottom of label col
    const filler = document.createElement('div');
    filler.className = 'dirlist-label-filler';
    labelCol.appendChild(filler);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        value.push('');
        if (config) config[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

    // --- INPUT COLUMN ---
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';

    if (!Array.isArray(value) || value.length === 0) value = [''];
    let dragSrcIdx = null;

    function renderRows() {
        inputWrap.innerHTML = '';
        value.forEach((dir, idx) => {
            const item = document.createElement('div');
            item.className = 'field-dragdrop-row';
            item.setAttribute('draggable', 'true');

            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.innerText = '⋮⋮';
            item.appendChild(handle);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = dir || '';
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', () => Modals.directoryPickerModal(input, config));
            }
            input.addEventListener('input', () => {
                value[idx] = input.value;
                if (config) config[field.key] = [...value];
            });
            item.appendChild(input);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--cancel remove-btn';
            removeBtn.innerText = '−';
            removeBtn.disabled = value.length === 1;
            removeBtn.addEventListener('click', () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    if (config) config[field.key] = [...value];
                    renderRows();
                }
            });
            item.appendChild(removeBtn);

            // Drag events
            item.addEventListener('dragstart', () => {
                dragSrcIdx = idx;
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () => {
                dragSrcIdx = null;
                item.classList.remove('dragging');
            });
            item.addEventListener('dragover', e => e.preventDefault());
            item.addEventListener('drop', e => {
                e.preventDefault();
                if (dragSrcIdx === null || dragSrcIdx === idx) return;
                const moved = value.splice(dragSrcIdx, 1)[0];
                value.splice(idx, 0, moved);
                if (config) config[field.key] = [...value];
                renderRows();
                markDirty();
            });

            inputWrap.appendChild(item);
        });
    }

    renderRows();

    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}


function renderTextareaField(field, value) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.name = field.key;
    textarea.rows = 6;
    textarea.placeholder = field.placeholder || '';
    textarea.value = Array.isArray(value) ? value.join('\n') : (value ?? '');

    autoResizeTextarea(textarea);

    inputWrap.appendChild(textarea);

    row.appendChild(inputWrap);
    return row;
}

function renderJsonField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // LEFT COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    // RIGHT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.name = field.key;
    textarea.id = field.key;
    textarea.rows = 6;
    textarea.placeholder = field.placeholder || '';
    if (typeof value === 'object' && value !== null) {
        textarea.value = JSON.stringify(value, null, 2);
    } else if (typeof value === 'string') {
        textarea.value = value;
    } else {
        textarea.value = '';
    }

    autoResizeTextarea(textarea);

    // Save changes to config as you type, if config is provided
    if (config) {
        textarea.addEventListener('input', () => {
            try {
                config[field.key] = JSON.parse(textarea.value);
            } catch {
                // Not valid JSON: don't update config
            }
        });
    }

    inputWrap.appendChild(textarea);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderCheckBoxField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // Label on the left
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    row.appendChild(label);

    // Right side: input + help
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // The checkbox itself
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'settings-checkbox';
    input.name = field.key;
    input.id = field.key;
    input.checked = !!value;
    input.addEventListener('change', () => {
        if (config) config[field.key] = input.checked;
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


// -------- COMPLEX LIST FIELD -----------
// Replace the entire renderComplexListField function:
function renderComplexListField(field, value = [], rootConfig, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
    const div = document.createElement('div');
    if (field.key === "gdrive_list") {
        div.classList.add("field-gdrive-list");
    }
    div.className = 'field field-complex-list';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const listArea = document.createElement('div');
    // Safely get subfields array
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    function renderValue(val, fieldDef = null) {
        if (Array.isArray(val)) {
            // Array of objects (not scalars)
            if (val.length && typeof val[0] === 'object' && val[0] !== null) {
                return (
                    val.map(obj =>
                        '<div>' +
                        Object.entries(obj)
                            .map(([k, v]) =>
                                `<div><b>${k}:</b> ${renderValue(v)}</div>`
                            ).join('') +
                        '</div>'
                    ).join('')
                );
            }
            // Array of scalars
            return val.length ? val.join(', ') : '—';
        }
        if (val && typeof val === 'object') {
            // Nested object, pretty print key-values
            return (
                Object.entries(val)
                    .map(([k, v2]) => `<div><b>${k}:</b> ${renderValue(v2)}</div>`)
                    .join('')
            );
        }
        // String or primitive
        return val ?? '';
    }

    function renderList() {
        listArea.innerHTML = '';
        (value || []).forEach((item, idx) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'complex-list-row';

            subfields.forEach(subfield => {
                if (
                    subfield.type === 'modal_helper' ||
                    subfield.type === 'helper'
                ) return;
                // Only show fields for the correct instance type, if specified
                if (subfield.show_if_instance && rootConfig && rootConfig.instances) {
                    const instanceType = subfield.show_if_instance;
                    const instanceKey = item.instance;
                    if (!instanceKey) return; // No instance, can't match
                    // Check if the instance key is under the correct instance type in config
                    if (!rootConfig.instances[instanceType] || !(instanceKey in rootConfig.instances[instanceType])) {
                        return; // skip: not a matching instance type
                    }
                }
                const v = item[subfield.key];
                const fieldSpan = document.createElement('span');

                if (subfield.type === 'color_list' && Array.isArray(v)) {
                    fieldSpan.innerHTML = `<b>${subfield.label}:</b> `;
                    v.forEach(color => {
                        const swatch = document.createElement('span');
                        swatch.className = 'color-list-swatch';
                        swatch.style.background = color;
                        swatch.title = color;
                        fieldSpan.appendChild(swatch);
                    });
                } else {
                    fieldSpan.innerHTML = `<b>${subfield.label}:</b> ${renderValue(v, subfield)}`;
                }
                entryDiv.appendChild(fieldSpan);
            });

            // CLICK ON CARD TO EDIT
            entryDiv.tabIndex = 0;
            entryDiv.setAttribute('role', 'button');
            entryDiv.setAttribute('aria-label', 'Edit entry');
            entryDiv.addEventListener('click', () => openEditModal(idx));
            entryDiv.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx);
                }
            });

            listArea.appendChild(entryDiv);
        });
    }

    function openEditModal(idx) {
        const isEdit = typeof idx === 'number';
        const entry = isEdit ? { ...value[idx] } : {};

        const footerButtons = [
            ...(isEdit ? [{ id: 'delete-modal-btn', label: 'Delete', class: 'btn--remove' }] : []),
            { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel' },
            { id: 'save-modal-btn', label: 'Save', class: 'btn--success' },
        ];
        openModal({
            schema: subfields,
            entry,
            title: isEdit ? `Edit ${field.label.replace(/s$/, '')}` : `Add ${field.label.replace(/s$/, '')}`,
            onSave: (newEntry) => {
                if (isEdit) {
                    value[idx] = newEntry;
                } else {
                    value.push(newEntry);
                }
                config[field.key] = value.slice(); // Just mutate local config
                renderList();
                markDirty();
            },
            onDelete: isEdit ? () => {
                value.splice(idx, 1);
                config[field.key] = value.slice();
                renderList();
                markDirty();
            } : null,
            context: {
                listInUse: value,
                editingIdx: isEdit ? idx : null,
                rootConfig
            },
            footerButtons,
            isEdit
        });
    }

    div.appendChild(listArea);

    // Add button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = `Add ${field.label.replace(/s$/, '')}`;
    addBtn.onclick = () => openEditModal(null);
    div.appendChild(addBtn);

    renderList();
    return div;
}

function renderDirListOptionsField(field, value = [], config) {
    const div = document.createElement('div');
    div.className = 'settings-field-row field-dir';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const list = document.createElement('div');
    list.className = 'dir-list-area';

    if (!Array.isArray(value) || value.length === 0) value = [''];

    function renderRows() {
        list.innerHTML = '';
        value.forEach((dir, idx) => {
            const row = document.createElement('div');
            row.className = 'dir-list-row';

            // Directory input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input dir-list-input';
            input.name = field.key;
            input.value = dir.path || dir || '';
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', () => Modals.directoryPickerModal(input, config));
            }
            input.addEventListener('input', () => {
                if (typeof dir === 'object' && dir !== null) {
                    dir.path = input.value;
                } else {
                    value[idx] = input.value;
                }
                if (config) config[field.key] = value.slice();
            });
            row.appendChild(input);

            // Mode select (for options)
            if (field.options && Array.isArray(field.options)) {
                const select = document.createElement('select');
                select.className = 'select dir-list-mode';
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.selected = (dir.mode || (typeof dir === 'object' && dir.mode) || field.options[0]) === opt;
                    option.textContent = humanize(opt);
                    select.appendChild(option);
                });
                select.addEventListener('change', () => {
                    if (typeof dir === 'object' && dir !== null) {
                        dir.mode = select.value;
                    } else {
                        value[idx] = { path: input.value, mode: select.value };
                    }
                    if (config) config[field.key] = value.slice();
                });
                row.appendChild(select);
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--cancel remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.disabled = value.length === 1;
            removeBtn.onclick = () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    if (config) config[field.key] = value.slice();
                    renderRows();
                }
            };
            row.appendChild(removeBtn);

            list.appendChild(row);
        });
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        value.push(field.options && field.options.length ? { path: '', mode: field.options[0] } : '');
        if (config) config[field.key] = value.slice();
        renderRows();
    };

    renderRows();
    div.appendChild(list);
    div.appendChild(addBtn);

    return div;
}

function renderColorListField(field, value = []) {
    const div = document.createElement('div');
    div.className = 'field field-color-list';

    const label = document.createElement('label');
    label.textContent = field.label || 'Colors';
    div.appendChild(label);

    const colorsDiv = document.createElement('div');
    colorsDiv.className = 'color-list-container';
    div.appendChild(colorsDiv);

    // Ensure value is always an array
    value = Array.isArray(value) ? value : [];

    function renderColors() {
        colorsDiv.innerHTML = '';
        value.forEach((color, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-list-swatch';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = color || '#ffffff';
            input.addEventListener('input', () => {
                value[idx] = input.value;
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--cancel btn--remove-item remove-btn';
            removeBtn.textContent = '−';
            removeBtn.onclick = () => {
                value.splice(idx, 1);
                renderColors();
            };

            swatch.appendChild(input);
            swatch.appendChild(removeBtn);
            colorsDiv.appendChild(swatch);
        });
    }

    // Add color button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Color';
    addBtn.onclick = () => {
        value.push('#ffffff');
        renderColors();
    };

    div.appendChild(addBtn);

    renderColors();
    return div;
}

function renderModalHelperField(field, value, config, rootConfig) {
    const div = document.createElement('div');
    div.className = 'field field-modal-helper';
    div.dataset.helper = field.helper || '';
    div.dataset.key = field.key || '';
    if (field.label) {
        const label = document.createElement('label');
        label.textContent = field.label;
        div.appendChild(label);
    }
    // Make sure the helper has a real div to hook into!
    const hookDiv = document.createElement('div');
    hookDiv.className = 'modal-helper-hook';
    div.appendChild(hookDiv);
    return div;
}

function renderInstanceDropdownField(field, value, config, rootConfig) {
    const div = document.createElement('div');
    div.className = 'field field-instance-dropdown';

    const label = document.createElement('label');
    label.textContent = field.label || 'Instance';
    div.appendChild(label);

    const select = document.createElement('select');
    select.className = 'select instance-dropdown-select';
    select.name = field.key;

    // Helper to humanize instance names
    function humanize(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Helper to set options
    function setOptions(selectedType) {
        select.innerHTML = '';
        let types = [];

        // Support "from" as array (static allowed types) or string (dynamic parent)
        if (Array.isArray(field.from)) {
            types = field.from;
        } else if (typeof field.from === 'string') {
            // Look up parent field value (app_type or other)
            const parentVal = config[field.from];
            if (parentVal) types = [parentVal];
            // Try to get from modal if config doesn't have it
            if (!parentVal) {
                const modalDiv = div.closest('.modal-content');
                if (modalDiv) {
                    const parentSelect = modalDiv.querySelector(`[name="${field.from}"]`);
                    if (parentSelect && parentSelect.value) types = [parentSelect.value];
                }
            }
        } else {
            // fallback: show all
            types = Object.keys(rootConfig.instances || {});
        }

        // Build option list (all instance names for allowed types)
        let options = [];
        types.forEach(type => {
            if (rootConfig.instances && rootConfig.instances[type]) {
                options.push(...Object.keys(rootConfig.instances[type]));
            }
        });

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = humanize(opt);
            select.appendChild(option);
        });

        // Auto-select value: prefer config, else first option
        if (options.length > 0) {
            let selected = value || config[field.key];
            if (!selected || !options.includes(selected)) {
                selected = options[0];
                config[field.key] = selected; // auto-set
            }
            select.value = selected;
        } else {
            config[field.key] = '';
        }
    }

    // Listen for parent field changes if from is a string
    if (typeof field.from === 'string') {
        setTimeout(() => {
            const modalDiv = div.closest('.modal-content');
            if (modalDiv) {
                const parentSelect = modalDiv.querySelector(`[name="${field.from}"]`);
                if (parentSelect) {
                    parentSelect.addEventListener('change', () => {
                        config[field.from] = parentSelect.value;
                        setOptions(parentSelect.value);
                    });
                }
            }
        }, 0);
    }

    setOptions();

    select.onchange = () => {
        config[field.key] = select.value;
    };

    div.appendChild(select);
    return div;
}

function renderGDriveCustomField(field, value = [], rootConfig, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    // --- Outer container: settings field row
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // --- Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // --- Main content column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    if (field.description) {
        const desc = document.createElement('div');
        desc.className = 'field-help-text';
        desc.textContent = field.description;
        inputWrap.appendChild(desc);
    }

    // --- GDrive card-list (flex row of cards)
    const listArea = document.createElement('div');
    listArea.className = 'gdrive-card-list';
    inputWrap.appendChild(listArea);

    function renderList() {
        listArea.innerHTML = '';

        if (!Array.isArray(value) || !value.length) {
            // Show add button only if empty
            listArea.appendChild(createAddCard());
            return;
        }

        // Render each GDrive entry as a fat card
        value.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'card gdrive-entry-card';

            // ID row
            const idRow = document.createElement('div');
            idRow.className = 'gdrive-entry-field gdrive-entry-id';
            const idLabel = document.createElement('span');
            idLabel.className = 'gdrive-entry-label';
            idLabel.textContent = 'ID:';
            const idValue = document.createElement('span');
            idValue.className = 'gdrive-entry-value';
            idValue.textContent = item.id || '';
            idRow.appendChild(idLabel);
            idRow.appendChild(idValue);
            card.appendChild(idRow);

            // Name row
            const nameRow = document.createElement('div');
            nameRow.className = 'gdrive-entry-field gdrive-entry-name';
            const nameLabel = document.createElement('span');
            nameLabel.className = 'gdrive-entry-label';
            nameLabel.textContent = 'Name:';
            const nameValue = document.createElement('span');
            nameValue.className = 'gdrive-entry-value';
            nameValue.textContent = item.name || '';
            nameRow.appendChild(nameLabel);
            nameRow.appendChild(nameValue);
            card.appendChild(nameRow);

            // Location row
            const locRow = document.createElement('div');
            locRow.className = 'gdrive-entry-field gdrive-entry-path';
            const locLabel = document.createElement('span');
            locLabel.className = 'gdrive-entry-label';
            locLabel.textContent = 'Location:';
            const locValue = document.createElement('span');
            locValue.className = 'gdrive-entry-value';
            locValue.textContent = item.location || '';
            locRow.appendChild(locLabel);
            locRow.appendChild(locValue);
            card.appendChild(locRow);

            // Make card clickable for editing
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Google Drive Entry');
            card.addEventListener('click', () =>
                openEditModal(idx, { value, field, config, renderList, subfields, rootConfig })
            );
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, { value, field, config, renderList, subfields, rootConfig });
                }
            });

            listArea.appendChild(card);
        });

        // Add "fat plus" card at the end
        listArea.appendChild(createAddCard());
    }

    // Add card helper
    function createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'card card-add gdrive-add-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
        addCard.addEventListener('click', () => openEditModal(null, { value, field, config, renderList, subfields, rootConfig }));
        addCard.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, { value, field, config, renderList, subfields, rootConfig });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}


// -------- FIELD DISPATCHER ----------

export function renderField(field, value, config, rootConfig) {
    switch (field.type) {
        case 'dropdown': return renderDropdownField(field, value, config);
        case 'slider': return renderSliderField(field, value, config);
        case 'textarea': return renderTextareaField(field, value, config);
        case 'json': return renderJsonField(field, value, config);
        case 'number': return renderNumberField(field, value, config);
        case 'dir': return renderDirField(field, value, config);
        case 'dir_list': return renderDirListField(field, value, config);
        case 'dir_list_drag_drop': return renderDirListDragDropField(field, value, config);
        case 'dir_list_options': return renderDirListOptionsField(field, value, config);
        case 'complex_list': return renderComplexListField(field, value = [], rootConfig, config);
        case 'color_list': return renderColorListField(field, value, config);
        case 'instances': return renderInstancesField(field, value, config, rootConfig);
        case 'modal_helper': return renderModalHelperField(field, value, config, rootConfig);
        case "check_box": return renderCheckBoxField(field, value, config);
        case 'instance_dropdown': return renderInstanceDropdownField(field, value, config, rootConfig);
        case 'gdrive_custom': return renderGDriveCustomField(field, value, rootConfig, config);

        default: return renderTextField(field, value, config);
    }
}


// ---------- HELPER FUNCTIONS -----------

function autoResizeTextarea(textarea) {
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
}

function openEditModal(idx, { value, field, config, renderList, subfields, rootConfig }) {
    const isEdit = typeof idx === 'number';
    const entry = isEdit ? { ...value[idx] } : {};
    const footerButtons = [
        ...(isEdit ? [{ id: 'delete-modal-btn', label: 'Delete', class: 'btn--remove' }] : []),
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel' },
        { id: 'save-modal-btn', label: 'Save', class: 'btn--success' },
    ];
    openModal({
        schema: subfields || field.fields,
        entry,
        title: isEdit 
            ? `Edit ${field.label.replace(/s$/, '')}` 
            : `Add ${field.label.replace(/s$/, '')}`,
        onSave: (newEntry) => {
            if (isEdit) value[idx] = newEntry;
            else value.push(newEntry);
            config[field.key] = value.slice();
            renderList();
            markDirty();
        },
        onDelete: isEdit ? () => {
            value.splice(idx, 1);
            config[field.key] = value.slice();
            renderList();
            markDirty();
        } : null,
        context: {
            listInUse: value,
            editingIdx: isEdit ? idx : null,
            rootConfig
        },
        footerButtons,
        isEdit
    });
}