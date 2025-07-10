import { SETTINGS_SCHEMA } from './settings_schema.js';
import * as Modals from './modals.js';

// Utility: Humanize a field label (e.g. source_dir -> Source Dir)
function humanize(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// -------- FIELD RENDERERS ---------
function renderTextField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';
    const readonly = field.modal === 'directoryPickerModal' ? 'readonly' : '';
    div.innerHTML = `
      <label>${field.label}</label>
      <input type="text" class="input" name="${field.key}" value="${value ?? ''}" ${readonly}>
    `;
    return div;
}


function renderDropdownField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';
    let html = `<label>${field.label}</label><select class="select" name="${field.key}">`;
    html += field.options.map(opt =>
        `<option value="${opt}"${value === opt ? ' selected' : ''}>${humanize(opt)}</option>`
    ).join('');
    html += `</select>`;
    div.innerHTML = html;
    return div;
}

function renderSliderField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label class="toggle-switch-block">
        <span class="form-toggle-label">${field.label}</span>
        <input type="checkbox" class="toggle-switch-input" name="${field.key}" ${value ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    `;
    return div;
}

function renderNumberField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label>${field.label}</label>
      <input type="number" class="input" name="${field.key}" value="${value ?? ''}">
    `;
    return div;
}


function renderInstancesField(field, value, config, rootConfig) {
}


// -------- FIELD DISPATCHER ----------

function renderField(field, value, config, rootConfig) {
    switch (field.type) {
        case 'dropdown':return renderDropdownField(field, value);
        case 'slider':return renderSliderField(field, value);
        case 'textarea': return renderTextareaField(field, value);
        case 'json': return renderJsonField(field, value);
        case 'number':return renderNumberField(field, value);
        case 'dir':return renderDirField(field, value);
        case 'dir_list': return renderDirListField(field, value);
        case 'dir_list_drag_drop': return renderDirListDragDropField(field, value);
        case 'complex_list': return renderComplexListField(field, value, config, rootConfig);
        case 'instances': return renderInstancesField(field, value, config, rootConfig);
        default: return renderTextField(field, value);
    }
}

// -------- MAIN FORM RENDERER -------------
export function renderSettingsForm(formFields, moduleName, config, rootConfig) {
    const schema = SETTINGS_SCHEMA.find(s => s.key === moduleName);
    if (!schema) return;

    formFields.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-wrapper';

    schema.fields.forEach(field => {
        const fieldNode = renderField(field, config[field.key], config, rootConfig);
        if (fieldNode) wrapper.appendChild(fieldNode);
    });

    formFields.appendChild(wrapper);
}
function renderComplexListField(field, value = [], config, rootConfig) {
    const div = document.createElement('div');
    div.className = 'field field-complex-list';
    div.innerHTML = `<label>${field.label}</label>`;
    const listArea = document.createElement('div');
    listArea.className = 'complex-list-area';

    // Safely get subfields array
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    function renderValue(val) {
        if (Array.isArray(val)) {
            if (val.length && typeof val[0] === 'object') {
                return val.map(v => renderValue(v)).join(', ');
            }
            return `[${val.join(', ')}]`;
        }
        if (val && typeof val === 'object') {
            return `{ ${Object.entries(val)
                .map(([k, v]) => `${k}: ${renderValue(v)}`)
                .join(', ')} }`;
        }
        return val ?? '';
    }

    function renderList() {
        listArea.innerHTML = '';
        (value || []).forEach((item, idx) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'complex-list-item';

            entryDiv.innerHTML = subfields
                .map(subfield => {
                    const v = item[subfield.key];
                    return `<span><b>${subfield.label}:</b> ${renderValue(v)}</span>`;
                })
                .join(' | ');

            if (field.modal && typeof Modals[field.modal] === 'function') {
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'btn edit-btn';
                editBtn.textContent = 'Edit';
                editBtn.onclick = () => openEditModal(idx);
                entryDiv.appendChild(editBtn);
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn--cancel remove-btn';
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => {
                value.splice(idx, 1);
                renderList();
            };
            entryDiv.appendChild(delBtn);

            listArea.appendChild(entryDiv);
        });
    }

    function openEditModal(idx) {
        Modals[field.modal](idx, value, renderList, config, rootConfig);
    }

    div.appendChild(listArea);

    if (field.modal && typeof Modals[field.modal] === 'function') {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn add-btn';
        addBtn.textContent = `Add ${field.label.replace(/s$/, '')}`;
        addBtn.onclick = () => openEditModal(null);
        div.appendChild(addBtn);
    }

    renderList();
    return div;
}

function renderDirField(field, value) {
    const div = document.createElement('div');
    div.className = 'field field-dir';
    div.innerHTML = `
        <label>${field.label}</label>
        <input type="text" class="input dir-input" name="${field.key}" value="${value ?? ''}" readonly>
    `;
    const input = div.querySelector('input');
    if (field.modal && typeof Modals[field.modal] === 'function') {
        input.addEventListener('click', () => Modals[field.modal](input));
    }
    return div;
}

function renderDirListField(field, value = []) {
    const div = document.createElement('div');
    div.className = 'field field-dir-list';
    div.innerHTML = `<label>${field.label}</label>`;
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
                input.addEventListener('click', () => Modals[field.modal](input));
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
    div.innerHTML = `<label>${field.label}</label>`;
    const list = document.createElement('div');
    list.className = 'dir-list-area drag-enabled';

    if (!Array.isArray(value) || value.length === 0) value = [''];

    function renderRows() {
        list.innerHTML = '';
        value.forEach((dir, idx) => {
            const row = document.createElement('div');
            row.className = 'dir-list-row draggable';
            row.draggable = true;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input dir-list-input';
            input.name = field.key;
            input.value = dir || '';
            input.readOnly = !!field.modal;
            if (field.modal && typeof Modals[field.modal] === 'function') {
                input.addEventListener('click', () => Modals[field.modal](input));
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

            // Basic drag events (can be enhanced with a sortable library)
            row.addEventListener('dragstart', (e) => {
                row.classList.add('dragging');
                e.dataTransfer.setData('text/plain', idx);
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                if (fromIdx !== idx) {
                    const moved = value.splice(fromIdx, 1)[0];
                    value.splice(idx, 0, moved);
                    renderRows();
                }
            });
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

function renderTextareaField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';

    const placeholder = field.placeholder || '';
    let content = Array.isArray(value) ? value.join('\n') : (value ?? '');

    div.innerHTML = `
      <label>${field.label}</label>
      <textarea class="textarea" name="${field.key}" placeholder="${placeholder}"></textarea>
    `;

    const textarea = div.querySelector('textarea');
    if (textarea) {
        textarea.value = content;
        textarea.rows = 6;
        textarea.setAttribute('placeholder', placeholder);

        setTimeout(() => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }, 0);
    }
    return div;
}

function renderJsonField(field, value) {
    const div = document.createElement('div');
    div.className = 'field';

    // Always prefer schema placeholder, which should be multi-line template literal!
    const placeholder = field.placeholder || '';
    let content = '';
    if (typeof value === 'object' && value !== null) {
        content = JSON.stringify(value, null, 2);
    } else if (typeof value === 'string') {
        content = value;
    }

    div.innerHTML = `
      <label>${field.label}</label>
      <textarea class="textarea" name="${field.key}" placeholder="${placeholder}"></textarea>
    `;

    const textarea = div.querySelector('textarea');
    if (textarea) {
        textarea.value = content;
        textarea.rows = 6;
        textarea.setAttribute('placeholder', placeholder);

        setTimeout(() => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }, 0);
    }
    return div;
}