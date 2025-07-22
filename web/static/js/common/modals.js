import { renderField } from './field_render.js';
import {
    modalHeaderHtml,
    modalFooterHtml,
    attachDynamicFieldConditions,
    setupModalCloseOnOutsideClick,
} from './modal_helpers.js';
import { validateFields } from './validation.js';

/**
 * Unsaved Changes Modal (special, no schema)
 */
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
            // No buttonHandler—avoid validation trap
        });

        // Custom body content (not using schema fields)
        const contentDiv = modal.querySelector('.modal-content');
        if (contentDiv) {
            const custom = document.createElement('div');
            custom.style.margin = '1em 0';
            custom.innerHTML = `<p>You have unsaved changes. What would you like to do?</p>`;
            const header = contentDiv.querySelector('.modal-header');
            if (header) header.insertAdjacentElement('afterend', custom);
            else contentDiv.prepend(custom);
        }

        setTimeout(() => {
            const saveBtn = modal.querySelector('#unsaved-save-btn');
            const discardBtn = modal.querySelector('#unsaved-discard-btn');
            const cancelBtn = modal.querySelector('#unsaved-cancel-btn');
            if (saveBtn) saveBtn.onclick = () => handleChoice('save');
            if (discardBtn) discardBtn.onclick = () => handleChoice('discard');
            if (cancelBtn) cancelBtn.onclick = () => handleChoice('cancel');
        }, 0);
    });
}

/**
 * Directory Picker Modal (special schema)
 */
export function directoryPickerModal(initialPath = '/', nameValue = null) {
    return new Promise((resolve) => {
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
            title: nameValue ? `Select a location for ${nameValue}'s directory` : 'Select Directory',
            footerButtons: [
                { id: 'dir-create', label: 'New Folder', class: 'btn', type: 'button' },
                { id: 'dir-accept', label: 'Accept', class: 'btn--success', type: 'button' },
                { id: 'dir-cancel', label: 'Cancel', class: 'btn--cancel', type: 'button' },
            ],
            buttonHandler: {
                'dir-create': async ({ modal, entry, bodyDiv }) => {
                    const input = modal.querySelector('input.dir-picker-input');
                    const currPath = input && input.value ? input.value : entry.path || '/';
                    const name = prompt('New folder name:');
                    if (!name) return;

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

/**
 * Open a modal dialog for editing/adding an entry.
 * @param {Object} opts
 * @param {Array} opts.schema - Array of field objects to render
 * @param {Object} opts.entry - The object being edited (the editable entry)
 * @param {string} [opts.title]
 * @param {Array} [opts.footerButtons]
 * @param {Object} [opts.buttonHandler]
 * @param {Object} [opts.moduleConfig] - The parent config object (for advanced renders)
 * @param {Object} [opts.rootConfig] - The root config object if needed
 * @param {string} [opts.modalClass]
 */
export function openModal({
    schema = [],
    entry = {},
    title = 'Edit',
    footerButtons = [],
    buttonHandler = {},
    moduleConfig = null,
    rootConfig = null,
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
        // Always call field renders as: (field, immediateData, moduleConfig, rootConfig)
        const fieldNode = renderField(field, entry, moduleConfig, rootConfig);
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
                    const errorFields = validateFields(schema, bodyDiv, {
                        rootConfig,
                        isModal: true,
                    });
                    if (errorFields.length) {
                        const first = bodyDiv.querySelector('.input-error');
                        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        e.preventDefault();
                        // More descriptive output:
                        console.warn(
                            '[openModal] Validation failed for save/add. Invalid fields:',
                            errorFields
                        );
                        errorFields.forEach((fieldKey) => {
                            const fieldInput = bodyDiv.querySelector(`[name="${fieldKey}"]`);
                            if (fieldInput) {
                                const label =
                                    fieldInput
                                        .closest('.settings-field-row, .modal-field-inputwrap')
                                        ?.querySelector('label')?.innerText || '';
                                console.warn(
                                    `  - Field "${fieldKey}"${
                                        label ? ` (label: "${label}")` : ''
                                    } is invalid.`
                                );
                            } else {
                                console.warn(
                                    `  - Field "${fieldKey}" is invalid (input not found in modal DOM).`
                                );
                            }
                        });
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
