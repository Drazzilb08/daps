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

    modal = createModal(
        'dir-modal',
        'Select Directory',
        contentHtml,
        [
            { id: 'dir-create', label: 'New Folder', class: 'btn' },
            { id: 'dir-accept', label: 'Accept', class: 'btn--success' },
            { id: 'dir-cancel', label: 'Cancel', class: 'btn--cancel' }
        ]
    );

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
                modal.currentPath = current.endsWith('/')
                    ? current + name
                    : current + '/' + name;
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
            // Optionally debug log:
            console.log(`[dirpicker] set config[${modal.currentInput.name}] =`, modal.currentPath);
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

    // Title
    const heading = document.createElement('h2');
    heading.textContent = title;
    
    contentDiv.appendChild(heading);

    // Render fields (fields will *directly mutate* entry)
    schema.forEach(field => {
        const fieldNode = renderField(field, entry[field.key], entry, context.rootConfig);
        contentDiv.appendChild(fieldNode);
        console.log('[modal field rendered]', field.key, '| entry now:', JSON.stringify(entry));

    });

    // Build buttons for footer
    const buttons = footerButtons || [
        ...(isEdit ? [{ id: 'delete-modal-btn', label: 'Delete', class: 'btn--remove' }] : []),
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel' },
        { id: 'save-modal-btn', label: 'Save', class: 'btn--success' },
    ];

    // Footer
    const footerDiv = document.createElement('div');
    footerDiv.className = 'modal-footer';

    // Left and right grouping (Delete on left, rest on right)
    const leftDiv = document.createElement('div');
    const rightDiv = document.createElement('div');
    rightDiv.style.display = 'flex';
    rightDiv.style.gap = '0.7em';

    buttons.forEach(btn => {
        const el = document.createElement('button');
        el.className = `btn ${btn.class || ''}`;
        el.type = btn.type || 'button';
        el.id = btn.id || '';
        el.disabled = !!btn.disabled;
        el.textContent = btn.label;

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
    el.onclick = () => {
        // PATCH: Grab schedule and color helper values for holidays
        if (Array.isArray(schema) && schema.some(f => f.key === 'schedule')) {
            const sched = modal.querySelector('#schedule-from-month') && modal.querySelector('#schedule-to-month');
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
        // PATCH: Grab color values
        if (Array.isArray(schema) && schema.some(f => f.key === 'color')) {
            const colorInputs = modal.querySelectorAll('.field-color-list input[type="color"]');
            entry.color = Array.from(colorInputs).map(input => input.value);
        }

        console.log('[modal save] entry:', JSON.stringify(entry));
        if (typeof onSave === 'function') onSave(entry);
        closeModal();
    };
} else if (/test/i.test(btn.label || btn.id) && context.onTest) {
            el.onclick = () => context.onTest(entry);
        }

        // Put Delete on left, rest on right
        if (btn.id === 'delete-modal-btn') {
            leftDiv.appendChild(el);
        } else {
            rightDiv.appendChild(el);
        }
    });

    footerDiv.appendChild(leftDiv);
    footerDiv.appendChild(rightDiv);
    contentDiv.appendChild(footerDiv);

    modal.appendChild(contentDiv);

    Array.from(contentDiv.querySelectorAll('.field-modal-helper')).forEach(div => {
        const helperName = div.dataset.helper;
        if (
            helperName &&
            typeof ModalHelpers[helperName] === 'function'
        ) {
            ModalHelpers[helperName](
                div.closest('.modal-content'),
                context.listInUse,
                context.editingIdx
            );
        }
    });

    // Modal close handler
    function closeModal() {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
    modal._closeModal = closeModal;
    setupModalCloseOnOutsideClick(modal);

    requestAnimationFrame(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    });
}