import { renderField } from './field_render.js';
import {
    modalHeaderHtml,
    modalFooterHtml,
    attachDynamicFieldConditions,
    setupModalCloseOnOutsideClick,
    validateModalFields,
} from './modal_helpers.js';

export function unsavedSettingsModal() {
    return new Promise((resolve) => {
        let modal;

        function handleChoice(choice) {
            if (modal && typeof modal._closeModal === 'function') modal._closeModal();
            resolve(choice);
        }

        modal = openModal({
            schema: [],
            entry: {},
            title: 'Unsaved Changes',
            footerButtons: [
                { id: 'unsaved-save-btn', label: 'Save', class: 'btn--success', type: 'button' },
                {
                    id: 'unsaved-discard-btn',
                    label: 'Discard',
                    class: 'btn--remove',
                    type: 'button',
                },
                { id: 'unsaved-cancel-btn', label: 'Cancel', class: 'btn--cancel', type: 'button' },
            ],
            onCancel: () => handleChoice('cancel'),
            // Do not use buttonHandler here (so we avoid validation trap)
        });

        // Custom content for body (not using schema fields)
        const contentDiv = modal.querySelector('.modal-content');
        if (contentDiv) {
            const custom = document.createElement('div');
            custom.style.margin = '1em 0';
            custom.innerHTML = `<p>You have unsaved changes. What would you like to do?</p>`;
            // Insert right after the modal header
            const header = contentDiv.querySelector('.modal-header');
            if (header) header.insertAdjacentElement('afterend', custom);
            else contentDiv.prepend(custom);
        }

        // Attach button handlers directly
        setTimeout(() => {
            const saveBtn = modal.querySelector('#unsaved-save-btn');
            const discardBtn = modal.querySelector('#unsaved-discard-btn');
            const cancelBtn = modal.querySelector('#unsaved-cancel-btn');
            if (saveBtn) {
                saveBtn.onclick = () => {
                    console.log('[unsavedSettingsModal] Save button clicked');
                    handleChoice('save');
                };
            }
            if (discardBtn) {
                discardBtn.onclick = () => {
                    console.log('[unsavedSettingsModal] Discard button clicked');
                    handleChoice('discard');
                };
            }
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    console.log('[unsavedSettingsModal] Cancel button clicked');
                    handleChoice('cancel');
                };
            }
        }, 0);
    });
}

export function directoryPickerModal(initialPath = '/') {
    return new Promise((resolve) => {
        let lastCreatedFolder = null;
        const entry = { path: initialPath || '/' };

        openModal({
            schema: [
                {
                    key: 'path',
                    label: 'Directory Path',
                    type: 'dir_picker',
                    required: true,
                    placeholder: 'Type or select a directory…',
                },
            ],
            entry,
            title: 'Select Directory',
            footerButtons: [
                { id: 'dir-create', label: 'New Folder', class: 'btn', type: 'button' },
                { id: 'dir-accept', label: 'Accept', class: 'btn--success', type: 'button' },
                { id: 'dir-cancel', label: 'Cancel', class: 'btn--cancel', type: 'button' },
            ],
            buttonHandler: {
                'dir-create': async ({ modal, entry, bodyDiv }) => {
                    // Use the visible input value, not just entry.path
                    const input = modal.querySelector('input.dir-picker-input');
                    const currPath = input && input.value ? input.value : entry.path || '/';
                    const name = prompt('New folder name:');
                    if (!name) return;

                    // Optional: prevent creation at root
                    if (currPath === '/' || currPath === '') {
                        alert('Please navigate to a directory before creating a subfolder.');
                        return;
                    }

                    const newPath = currPath.endsWith('/')
                        ? currPath + name
                        : currPath + '/' + name;

                    try {
                        const resp = await fetch(
                            `/api/create-folder?path=${encodeURIComponent(newPath)}`,
                            { method: 'POST' }
                        );
                        if (!resp.ok) {
                            const errData = await resp.json().catch(() => ({}));
                            alert('Create failed: ' + (errData.error || resp.statusText));
                            return;
                        }
                        lastCreatedFolder = name;
                        entry.path = newPath;
                        if (input) {
                            input.value = newPath;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    } catch (e) {
                        alert('Create failed: ' + (e?.message || e));
                    }
                },
                'dir-accept': ({ modal, entry, schema, bodyDiv, closeModal, event }) => {
                    // Validate path (required)
                    const errorFields = window.validateModalFields
                        ? window.validateModalFields(schema, bodyDiv)
                        : [];
                    if (errorFields.length) {
                        const first = bodyDiv.querySelector('.input-error');
                        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        event.preventDefault();
                        return;
                    }
                    // --- PATCH: ensure we grab the input value for path ---
                    const input = modal.querySelector('input.dir-picker-input');
                    if (input) entry.path = input.value;
                    closeModal();
                    resolve(entry.path);
                },
                'dir-cancel': ({ closeModal }) => {
                    closeModal();
                    resolve(null);
                },
            },
        });
    });
}

export function openModal({
    schema = [],
    entry = {},
    title = 'Edit',
    footerButtons = [],
    buttonHandler = {},
    value,
    rootConfig,
    modalClass = 'modal-content',
}) {
    // Create modal root
    let modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = '';
    document.body.appendChild(modal);

    // Modal content wrapper
    const contentDiv = document.createElement('div');
    contentDiv.className = modalClass || 'modal-content';

    // HEADER
    contentDiv.insertAdjacentHTML('beforeend', modalHeaderHtml({ title }));

    // BODY
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'modal-body';
    schema.forEach((field) => {
        const fieldNode = renderField(field, entry[field.key], value, rootConfig);
        if (!fieldNode || typeof fieldNode !== 'object' || !('nodeType' in fieldNode)) {
            console.error(
                '[MODAL FIELD ERROR]',
                field,
                fieldNode,
                'renderField did not return a Node'
            );
            return; // Skip this field, don't crash
        }
        if (field.required) fieldNode.dataset.required = '1';
        bodyDiv.appendChild(fieldNode);
    });

    // FOOTER (caller must always provide all needed buttons)
    const temp = document.createElement('div');
    temp.innerHTML = modalFooterHtml(footerButtons);
    const footerDiv = temp.firstElementChild;

    // Assemble: HEADER, BODY, FOOTER
    contentDiv.appendChild(bodyDiv);
    contentDiv.appendChild(footerDiv);
    modal.appendChild(contentDiv);

    // DYNAMIC FIELD CONDITIONS
    if (schema.some((f) => f.show_if_instance_type)) {
        attachDynamicFieldConditions({
            formDiv: bodyDiv,
            schema,
            rootConfig: rootConfig,
            triggerFieldName: 'instance',
        });
    }

    // CLOSE MODAL
    function closeModal() {
        modal.remove();
        document.body.classList.remove('modal-open');
    }
    modal._closeModal = closeModal;
    setupModalCloseOnOutsideClick(modal);

    // X BUTTON
    const closeBtn = modal.querySelector('.modal-close-x');
    if (closeBtn) closeBtn.onclick = closeModal;

    // --- BUTTON HANDLING: Only attach what caller provides ---
    footerButtons.forEach((btn) => {
        const el = modal.querySelector(`#${btn.id}`);
        if (!el) return;

        // Only handle if provided by caller
        if (buttonHandler && typeof buttonHandler[btn.id] === 'function') {
            el.onclick = (e) => {
                // Global: always run validation for save/add
                if (/save|add/i.test(btn.label || btn.id)) {
                    const errorFields = validateModalFields(schema, bodyDiv);
                    if (errorFields.length) {
                        const first = bodyDiv.querySelector('.input-error');
                        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        e.preventDefault();
                        console.warn('[openModal] Validation failed for save/add.');
                        console.groupEnd();
                        return;
                    }
                }
                // User handler does the rest (including markDirty/closeModal)
                try {
                    buttonHandler[btn.id]({
                        event: e,
                        modal,
                        entry,
                        schema,
                        bodyDiv,
                        closeModal,
                    });
                } catch (err) {
                    console.error('[openModal] Button handler error:', err);
                }
            };
        }
    });

    // --- PATCH: Default close for "Cancel" buttons if no handler provided ---
    footerButtons.forEach((btn) => {
        const el = modal.querySelector(`#${btn.id}`);
        if (!el) return;
        const isCancel = /cancel/i.test(btn.label) || /cancel/i.test(btn.id);
        // Only attach if not already handled above
        if (isCancel && (!buttonHandler || typeof buttonHandler[btn.id] !== 'function')) {
            el.onclick = (e) => {
                e.preventDefault();
                closeModal();
            };
        }
    });

    requestAnimationFrame(() => {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    });

    return modal;
}
