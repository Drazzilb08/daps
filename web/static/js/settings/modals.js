import { renderField } from './field_render.js';
import * as ModalHelpers from './modal_helpers.js';
const directoryCache = {};

export function setupModalCloseOnOutsideClick(modal) {
    function handler(e) {
        if (e.target === modal) {
            modal._closeModal();
        }
    }
    modal.addEventListener('mousedown', handler);
    // Clean up handler if modal is removed
    modal._outsideClickHandler = handler;
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

export function directoryPickerModal(inputElement, config) {
    let suggestionTimeout;
    let modal = document.getElementById('dir-modal');
    if (modal) modal.remove();

    // Build modal HTML
    const contentHtml = `
        <label>Directory Path</label>
        <input type="text" id="dir-path-input" class="input" placeholder="Type or paste a path…" />
        <ul id="dir-list" class="dir-list"></ul>
    `;

    modal = createModal('dir-modal', 'Select Directory', contentHtml, [
        { id: 'dir-create', label: 'New Folder', class: 'btn' },
        { id: 'dir-accept', label: 'Accept', class: 'btn--success' },
        { id: 'dir-cancel', label: 'Cancel', class: 'btn--cancel' },
    ]);

    const dirList = modal.querySelector('#dir-list');
    const pathInput = modal.querySelector('#dir-path-input');
    modal.currentInput = inputElement;
    modal.currentPath = inputElement.value.trim() || '/';
    pathInput.value = modal.currentPath;

    if (inputElement.placeholder) {
        pathInput.placeholder = inputElement.placeholder;
    }

    // List and update logic
    function updateDirList() {
        const current = modal.currentPath;
        dirList.innerHTML = '';

        // ".." for going up one directory
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
                modal.currentPath = current.endsWith('/') ? current + name : current + '/' + name;
                showPath(modal.currentPath);
            };
            li.ondblclick = () => {
                inputElement.value = modal.currentPath;
                modal._closeModal();
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

    // Modal button logic
    modal.querySelector('#dir-accept').onclick = () => {
        modal.currentInput.value = modal.currentPath;
        // PATCH: update config without window/global
        if (config && modal.currentInput.name) {
            config[modal.currentInput.name] = modal.currentPath;
        }
        modal._closeModal();
    };
    modal.querySelector('#dir-cancel').onclick = () => modal._closeModal();
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

    // Input change handler
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
                            modal._closeModal();
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

    // Initial list load
    if (!directoryCache[modal.currentPath]) {
        fetch(`/api/list?path=${encodeURIComponent(modal.currentPath)}`)
            .then((res) => res.json())
            .then((d) => {
                directoryCache[modal.currentPath] = d.directories;
                updateDirList();
            });
    } else {
        updateDirList();
    }

    // Show the modal
    modal.classList.add('show');
}

export function openModal({
    schema,
    entry,
    onSave,
    title = 'Edit',
    onCancel,
    context = {},
    footerButtons = null,
    isEdit = false,
}) {
    let modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = '';
    document.body.appendChild(modal);

    // Modal content wrapper
    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-content';

    // Insert modal header using modalHeaderHtml at the top of contentDiv
    contentDiv.insertAdjacentHTML('afterbegin', modalHeaderHtml({ title }));

    // Render fields (fields will *directly mutate* entry)
    schema.forEach((field) => {
        const fieldNode = renderField(field, entry[field.key], entry, context.rootConfig);
        // Mark required fields for validation
        if (field.required) fieldNode.dataset.required = "1";
        contentDiv.appendChild(fieldNode);
    });

    // Determine footer buttons
    const buttons = footerButtons || [
        ...(isEdit ? [{ id: 'delete-modal-btn', label: 'Delete', class: 'btn--remove' }] : []),
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel' },
        { id: 'save-modal-btn', label: 'Save', class: 'btn--success' },
    ];

    // Insert footer markup using modalFooterHtml
    const temp = document.createElement('div');
    temp.innerHTML = modalFooterHtml(buttons);
    contentDiv.appendChild(temp.firstElementChild);

    // Now append modal content BEFORE wiring up events
    modal.appendChild(contentDiv);

    // ---- VALIDATION LOGIC ----
    function validateFields() {
        let valid = true;
        schema.forEach(field => {
            if (field.required) {
                // Get input/select/textarea by name
                const el = contentDiv.querySelector(
                    `[name="${field.key}"], [name="${field.key}[]"]`
                );
                // Special handling for color_list/arrays if needed
                let value;
                if (!el) {
                    // Try for special fields (e.g. color_list)
                    if (field.type === "color_list") {
                        const colorInputs = contentDiv.querySelectorAll('.field-color-list input[type="color"]');
                        value = Array.from(colorInputs).map(i => i.value).filter(Boolean);
                        if (!value.length) valid = false;
                    } else {
                        valid = false;
                    }
                    return;
                }
                if (el.type === "checkbox") {
                    value = el.checked;
                } else {
                    value = el.value;
                }
                // Simple blank/null check
                if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) {
                    valid = false;
                }
            }
        });
        const saveBtn = contentDiv.querySelector('#save-modal-btn');
        return valid;
    }

    // ---- MOVE ALL EVENT WIRING BELOW THIS LINE ----
    function closeModal() {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
    modal._closeModal = closeModal;
    setupModalCloseOnOutsideClick(modal);

    // Wire up X button after DOM insert!
    const closeBtn = modal.querySelector('.modal-close-x');
    if (closeBtn) closeBtn.onclick = closeModal;

    // Wire up footer buttons after DOM insert!
    buttons.forEach((btn) => {
        const el = modal.querySelector(`#${btn.id}`);
        if (!el) return;
        if (/cancel|close/i.test(btn.label || btn.id)) {
            el.onclick = () => {
                if (typeof onCancel === 'function') onCancel();
                closeModal();
            };
        } else if (/delete/i.test(btn.label || btn.id)) {
            el.onclick = () => {
                if (context.onDelete) context.onDelete(entry);
                closeModal();
            };
        } else if (/save/i.test(btn.label || btn.id)) {
            el.onclick = (e) => {
                let errorFields = [];
                schema.forEach(field => {
                    if (field.required) {
                        const input = contentDiv.querySelector(`[name="${field.key}"]`);
                        // Also handle special field types (e.g. color_list)
                        let isEmpty = false;
                        if (input) {
                            isEmpty = (input.value === "" || input.value == null);
                        } else if (field.type === "color_list") {
                            const colorInputs = contentDiv.querySelectorAll('.field-color-list input[type="color"]');
                            isEmpty = Array.from(colorInputs).filter(i => i.value).length === 0;
                        } else {
                            isEmpty = true;
                        }
                        // Mark error and show message
                        const wrapper = input?.closest('.modal-field-inputwrap, .settings-field-inputwrap, .modal-content, div');
                        if (isEmpty) {
                            errorFields.push(field.key);
                            if (input) input.classList.add('input-error');
                            // Only add error message if not already present
                            if (wrapper && !wrapper.querySelector('.field-error-text')) {
                                const err = document.createElement('div');
                                err.className = 'field-error-text';
                                err.textContent = field.label
                                    ? `${field.label} cannot be empty.`
                                    : "This field cannot be empty.";
                                wrapper.appendChild(err);
                            }
                        } else {
                            if (input) input.classList.remove('input-error');
                            // Remove any error messages
                            if (wrapper) {
                                const err = wrapper.querySelector('.field-error-text');
                                if (err) err.remove();
                            }
                        }
                    }
                });
                if (errorFields.length) {
                    // Optionally, scroll to first error:
                    const first = contentDiv.querySelector('.input-error');
                    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
                    e.preventDefault();
                    return;
                }

                // --- your existing save logic below (unchanged) ---
                // PATCH: handle any special save logic (e.g. schedule/color helpers for holidays)
                if (Array.isArray(schema) && schema.some((f) => f.key === 'schedule')) {
                    const sched =
                        modal.querySelector('#schedule-from-month') &&
                        modal.querySelector('#schedule-to-month');
                    if (sched) {
                        const fromMonth = modal.querySelector('#schedule-from-month')?.value;
                        const fromDay = modal.querySelector('#schedule-from-day')?.value;
                        const toMonth = modal.querySelector('#schedule-to-month')?.value;
                        const toDay = modal.querySelector('#schedule-to-day')?.value;
                        if (fromMonth && fromDay && toMonth && toDay) {
                            entry.schedule = `range(${fromMonth}/${fromDay}-${toMonth}/${toDay})`;
                        }
                    }
                }
                // PATCH: handle color helpers for holidays
                if (Array.isArray(schema) && schema.some((f) => f.key === 'color')) {
                    const colorInputs = modal.querySelectorAll(
                        '.field-color-list input[type="color"]'
                    );
                    entry.color = Array.from(colorInputs).map((input) => input.value);
                }
                // Gather all form values into entry
                const inputs = modal.querySelectorAll('input, textarea, select');
                inputs.forEach((input) => {
                    if (!input.name) return;
                    if (input.type === 'checkbox') {
                        entry[input.name] = input.checked;
                    } else if (input.type === 'number' || input.getAttribute('type') === 'number') {
                        entry[input.name] = input.value === '' ? null : parseInt(input.value, 10);
                    } else {
                        entry[input.name] = input.value;
                    }
                });
                if (typeof onSave === 'function') onSave(entry);
                closeModal();
            };
        }
    });

    // Any extra field helpers (as before)
    Array.from(contentDiv.querySelectorAll('.field-modal-helper')).forEach((div) => {
        const helperName = div.dataset.helper;
        const key = div.dataset.key;
        // Find the corresponding field object from the schema by key
        const fieldObj = Array.isArray(schema) ? schema.find(f => f.key === key) : null;
        if (helperName && typeof ModalHelpers[helperName] === 'function') {
            ModalHelpers[helperName](
                div.closest('.modal-content'),
                fieldObj,
                context.listInUse,
                context.editingIdx,
            );
        }
    });

    // --- Attach input listeners for validation ---
    // Use input, change, or custom events
    contentDiv.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('input', validateFields);
        input.addEventListener('change', validateFields);
    });
    // Call once on open
    validateFields();

    requestAnimationFrame(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    });
}