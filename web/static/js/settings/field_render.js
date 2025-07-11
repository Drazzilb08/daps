import { humanize } from '../util.js';
import { openModal } from './modals.js';
import * as Modals from './modals.js';
import { markDirty, showToast } from '../util.js';


function renderTextField(field, value, config) {
    const div = document.createElement('div');
    div.className = 'field';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.name = field.key;
    input.value = value ?? '';
    if (field.modal === 'directoryPickerModal') input.readOnly = true;

    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value;
            console.log(`[field "${field.key}"] input -> config:`, config);
        });
    }
    div.appendChild(input);
    return div;
}

function renderDropdownField(field, value, config) {
    const div = document.createElement('div');
    div.className = 'field';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const select = document.createElement('select');
    select.className = 'select';
    select.name = field.key;
    field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.selected = value === opt;
        option.textContent = humanize(opt);
        select.appendChild(option);
    });

    // ADD THIS:
    if (config) {
        select.addEventListener('change', () => {
            config[field.key] = select.value;
            console.log(`[field "${field.key}"] select -> config:`, select.value, config);
        });
    }

    div.appendChild(select);
    return div;
}

function renderNumberField(field, value, config) {
    const div = document.createElement('div');
    div.className = 'field';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input';
    input.name = field.key;
    input.value = value ?? '';

    // ADD THIS:
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value;
            console.log(`[field "${field.key}"] input -> config:`, input.value, config);
        });
    }

    div.appendChild(input);
    return div;
}

function renderDirField(field, value, config) {
    const div = document.createElement('div');
    div.className = 'field field-dir';

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
            console.log(`[field "${field.key}"] input -> config:`, config);
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

function renderDirListField(field, value = []) {
    const div = document.createElement('div');
    div.className = 'field field-dir-list';

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

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input dir-list-input';
            input.name = field.key;
            input.value = dir || '';
            input.readOnly = !!field.modal;
            if (field.modal && typeof Modals[field.modal] === 'function') {
                input.addEventListener('click', () => Modals[field.modal](input, config));
            }
            input.addEventListener('input', () => { value[idx] = input.value; });
            row.appendChild(input);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--cancel remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.disabled = value.length === 1;
            removeBtn.onclick = () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
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
    addBtn.onclick = () => { value.push(''); renderRows(); };

    renderRows();
    div.appendChild(list);
    div.appendChild(addBtn);

    return div;
}

function renderDirListDragDropField(field, value = []) {
    const div = document.createElement('div');
    div.className = 'field field-dir-list-drag';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const list = document.createElement('div');
    list.className = 'dir-list-area';

    if (!Array.isArray(value) || value.length === 0) value = [''];

    let dragSrcIdx = null;

    function renderRows() {
        list.innerHTML = '';
        value.forEach((dir, idx) => {
            const row = document.createElement('div');
            row.className = 'dir-list-row';
            row.setAttribute('draggable', 'true');

            // Drag events
            row.addEventListener('dragstart', (e) => {
                dragSrcIdx = idx;
                
                e.dataTransfer.effectAllowed = 'move';
            });

            row.addEventListener('dragend', () => {
                dragSrcIdx = null;
                
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragSrcIdx === null || dragSrcIdx === idx) return;
                const moved = value.splice(dragSrcIdx, 1)[0];
                value.splice(idx, 0, moved);
                renderRows();
                markDirty();
            });

            // Input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input dir-list-input';
            input.name = field.key;
            input.value = dir || '';
            input.readOnly = !!field.modal;
            if (field.modal && typeof Modals[field.modal] === 'function') {
                input.addEventListener('click', () => Modals[field.modal](input, config));
            }
            input.addEventListener('input', () => { value[idx] = input.value; });
            row.appendChild(input);

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--cancel remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.disabled = value.length === 1;
            removeBtn.onclick = () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    renderRows();
                }
            };
            row.appendChild(removeBtn);

            list.appendChild(row);
        });
    }

    // Add button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => { value.push(''); renderRows(); };

    renderRows();
    div.appendChild(list);
    div.appendChild(addBtn);

    return div;
}

// -------- FIELD RENDERERS ---------
function renderSliderField(field, value, config) {
    const div = document.createElement('div');
    div.className = 'field';

    const label = document.createElement('span');
    label.className = 'form-toggle-label';
    label.textContent = field.label;

    const container = document.createElement('label');
    container.className = 'toggle-switch-block';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'toggle-switch-input';
    input.name = field.key;
    input.checked = !!value;

    input.addEventListener('change', () => {
        if (config) {
            config[field.key] = input.checked;
            console.log(`[field "${field.key}"] toggle -> config:`, input.checked, config);
        }
    });

    const slider = document.createElement('span');
    slider.className = 'slider';

    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(slider);

    div.appendChild(container);
    return div;
}


function renderTextareaField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.name = field.key;
    textarea.rows = 6;
    textarea.placeholder = field.placeholder || '';
    textarea.value = Array.isArray(value) ? value.join('\n') : (value ?? '');

    setTimeout(() => {
        
        
        textarea.addEventListener('input', () => {
            
            
        });
    }, 0);

    div.appendChild(textarea);
    return div;
}

function renderJsonField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';

    const label = document.createElement('label');
    label.textContent = field.label;
    div.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.name = field.key;
    textarea.rows = 6;
    textarea.placeholder = field.placeholder || '';
    if (typeof value === 'object' && value !== null) {
        textarea.value = JSON.stringify(value, null, 2);
    } else if (typeof value === 'string') {
        textarea.value = value;
    } else {
        textarea.value = '';
    }

    setTimeout(() => {
        
        
        textarea.addEventListener('input', () => {
            
            
        });
    }, 0);

    div.appendChild(textarea);
    return div;
}


// -------- COMPLEX LIST FIELD -----------
function renderComplexListField(field, value = [], rootConfig, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
    const div = document.createElement('div');
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
                                `<div><b>${humanize(k)}:</b> ${renderValue(v)}</div>`
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
                    .map(([k, v2]) => `<div><b>${humanize(k)}:</b> ${renderValue(v2)}</div>`)
                    .join('')
            );
        }
        // String or primitive
        return val ?? '';
    }

    function renderList() {
        listArea.innerHTML = '';
        (value || []).forEach((item, idx) => {
            console.log('[renderList] item:', item);
            const entryDiv = document.createElement('div');
            entryDiv.className = 'complex-list-row';

            subfields.forEach(subfield => {
                const v = item[subfield.key];
                const fieldSpan = document.createElement('span');
                fieldSpan.innerHTML = `<b>${subfield.label}:</b> ${renderValue(v, subfield)}`;
                entryDiv.appendChild(fieldSpan);
            });

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btn edit-btn';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => openEditModal(idx);
            entryDiv.appendChild(editBtn);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'btn delete-btn';
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => {
                value.splice(idx, 1);
                config[field.key] = value.slice();
                renderList();
                markDirty();
            };
            entryDiv.appendChild(delBtn);

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
                console.log('[complex list onSave] newEntry:', JSON.stringify(newEntry));
                if (isEdit) value[idx] = newEntry;
                else value.push(newEntry);
                config[field.key] = value.slice();
                renderList();
                markDirty();
            },
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

function renderDirListOptionsField(field, value = []) {
    const div = document.createElement('div');
    div.className = 'field field-dir-list-options';

    const label = document.createElement('label');
    label.textContent = field.label || 'Source Directories';
    div.appendChild(label);

    const list = document.createElement('div');
    list.className = 'dir-list-area';

    // Accept only array of objects with .path and .mode
    if (!Array.isArray(value) || value.length === 0) value = [{ path: '', mode: 'scan' }];

    const options = field.options;

    let dragSrcIdx = null;

    function renderRows() {
        list.innerHTML = '';
        value.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'dir-list-row';
            row.setAttribute('draggable', 'true');

            // Drag logic
            row.addEventListener('dragstart', (e) => {
                dragSrcIdx = idx;
                //  // REMOVE
                e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragend', () => {
                dragSrcIdx = null;
                //  // REMOVE
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragSrcIdx === null || dragSrcIdx === idx) return;
                const moved = value.splice(dragSrcIdx, 1)[0];
                value.splice(idx, 0, moved);
                renderRows();
            });

            // Directory input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input dir-list-input';
            input.name = field.key + '_path';
            input.value = item.path || '';
            input.readOnly = !!field.modal;
            if (field.modal && typeof Modals[field.modal] === 'function') {
                input.addEventListener('click', () => Modals[field.modal](input, config));
            }
            input.addEventListener('input', () => { value[idx].path = input.value; });
            row.appendChild(input);

            // Mode dropdown
            const select = document.createElement('select');
            select.className = 'select dir-mode-select';
            select.name = field.key + '_mode';
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                option.selected = item.mode === opt;
                select.appendChild(option);
            });
            select.addEventListener('change', () => { value[idx].mode = select.value; });
            row.appendChild(select);

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--cancel remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.disabled = value.length === 1;
            removeBtn.onclick = () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    renderRows();
                }
            };
            row.appendChild(removeBtn);

            list.appendChild(row);
        });
    }

    // Add button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => { value.push({ path: '', mode: options[0] }); renderRows(); };

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

    // Helper to set options, select first by default if none selected
    function setOptions(selectedType) {
        select.innerHTML = '';
        let options = [];
        if (rootConfig.instances && selectedType && rootConfig.instances[selectedType]) {
            options = Object.keys(rootConfig.instances[selectedType]);
        }
        options.forEach((opt, idx) => {
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

    // Determine parent field key
    const parentKey = field.from || 'app_type';
    // Determine initial selectedType (from config or default to first type)
    let selectedType = config[parentKey];
    // If not set, try to default to first type available
    if (!selectedType && rootConfig.instances) {
        const types = Object.keys(rootConfig.instances);
        if (types.length > 0) {
            selectedType = types[0];
            config[parentKey] = selectedType;
            // If parent select exists, set its value too (in modal)
            setTimeout(() => {
                const modalDiv = div.closest('.modal-content');
                if (modalDiv) {
                    const parentSelect = modalDiv.querySelector(`[name="${parentKey}"]`);
                    if (parentSelect) parentSelect.value = selectedType;
                }
            }, 0);
        }
    }
    setOptions(selectedType);

    select.onchange = () => {
        config[field.key] = select.value;
    };
    div.appendChild(select);

    // If inside a modal, listen for changes to parent dropdown
    setTimeout(() => {
        const modalDiv = div.closest('.modal-content');
        if (modalDiv) {
            const parentSelect = modalDiv.querySelector(`[name="${parentKey}"]`);
            if (parentSelect) {
                parentSelect.addEventListener('change', () => {
                    selectedType = parentSelect.value;
                    setOptions(selectedType);
                });
            }
        }
    }, 0);

    return div;
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
        case 'instance_dropdown': return renderInstanceDropdownField(field, value, config, rootConfig);
        default: return renderTextField(field, value, config);
    }
}