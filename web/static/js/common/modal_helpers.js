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

function getInstanceTypeFromConfig(instanceName, rootConfig) {
    if (!rootConfig || !rootConfig.instances) return null;
    const { instances } = rootConfig;
    for (const type of Object.keys(instances)) {
        if (instances[type] && instances[type][instanceName] !== undefined) {
            return type.toLowerCase();
        }
    }
    return null;
}

export function attachDynamicFieldConditions({
    formDiv,
    schema,
    rootConfig,
    triggerFieldName = 'instance',
}) {
    function updateFields() {
        schema.forEach((field) => {
            if (field.show_if_instance_type) {
                // Find field row
                const rows = formDiv.querySelectorAll('.settings-field-row');
                let targetRow = null;
                rows.forEach((row) => {
                    const label = row.querySelector('label');
                    if (label && label.textContent.trim() === field.label.trim()) {
                        targetRow = row;
                    }
                });
                if (!targetRow) return;

                // Find the trigger field (usually a dropdown)
                const triggerSelect = formDiv.querySelector(`select[name="${triggerFieldName}"]`);
                if (!triggerSelect) return;

                const selectedValue = triggerSelect.value;
                const detectedType = getInstanceTypeFromConfig(selectedValue, rootConfig);

                if (
                    detectedType &&
                    detectedType.toLowerCase() === field.show_if_instance_type.toLowerCase()
                ) {
                    targetRow.style.display = '';
                } else {
                    targetRow.style.display = 'none';
                }
            }
        });
    }

    // Attach once (on load and on change)
    const triggerSelect = formDiv.querySelector(`select[name="${triggerFieldName}"]`);
    if (triggerSelect) {
        triggerSelect.addEventListener('change', updateFields);
    }
    updateFields();
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

export function validateModalFields(schema, container) {
    const errorFields = [];
    schema.forEach((field) => {
        // SPECIAL CASE: "instances" type (including nested library check for Plex)
        if (field.type === 'instances' && field.required) {
            let foundValid = false;

            // For each instance type, check if any is selected
            if (field.instance_types && field.instance_types.includes('plex')) {
                // Handle Plex instances: require at least one instance + at least one library per selected instance
                // Find all instance checkboxes
                const plexBlocks = container.querySelectorAll('.instance-block');
                let plexInstanceSelected = false;
                let plexMissingLibraries = false;

                plexBlocks.forEach((block) => {
                    // Instance checkbox is hidden, but SVG label container has .instance-checkbox-container
                    const chkLabel = block.querySelector('.instance-checkbox-container');
                    const chk = chkLabel ? chkLabel.querySelector('input[type="checkbox"]') : null;
                    const instanceName = block
                        .querySelector('.instance-label')
                        ?.textContent?.trim();

                    if (chk && chk.checked) {
                        plexInstanceSelected = true;
                        // Check at least one library checkbox in this block
                        const libraryChecks = block.querySelectorAll(
                            '.instance-library-list input[type="checkbox"]'
                        );
                        const anyLibChecked = Array.from(libraryChecks).some((l) => l.checked);
                        if (!anyLibChecked) {
                            plexMissingLibraries = true;
                            // Mark all library checkboxes in this block with error class
                            libraryChecks.forEach((libChk) => {
                                libChk.classList.add('input-error');
                                // Optionally add error text below libraries
                                const libList = block.querySelector('.instance-library-list');
                                if (libList && !libList.querySelector('.field-error-text')) {
                                    const err = document.createElement('div');
                                    err.className = 'field-error-text';
                                    err.textContent = 'At least one library must be selected.';
                                    libList.appendChild(err);
                                }
                            });
                        } else {
                            // Clean error states if valid
                            const libraryChecksArr = Array.from(libraryChecks);
                            libraryChecksArr.forEach((libChk) =>
                                libChk.classList.remove('input-error')
                            );
                            const libList = block.querySelector('.instance-library-list');
                            if (libList) {
                                const err = libList.querySelector('.field-error-text');
                                if (err) err.remove();
                            }
                        }
                    } else if (chk) {
                        // Remove old error if present
                        const libraryChecks = block.querySelectorAll(
                            '.instance-library-list input[type="checkbox"]'
                        );
                        libraryChecks.forEach((libChk) => libChk.classList.remove('input-error'));
                        const libList = block.querySelector('.instance-library-list');
                        if (libList) {
                            const err = libList.querySelector('.field-error-text');
                            if (err) err.remove();
                        }
                    }
                });

                if (!plexInstanceSelected) {
                    // Add error on the whole block if no instance is checked
                    plexBlocks.forEach((block) => {
                        block.classList.add('field-error');
                        // Error text under header if not present
                        const header = block.querySelector('.instance-header');
                        if (header && !header.querySelector('.field-error-text')) {
                            const err = document.createElement('div');
                            err.className = 'field-error-text';
                            err.textContent = `${field.label} cannot be empty.`;
                            header.appendChild(err);
                        }
                    });
                } else {
                    // Remove error if any Plex instance is checked
                    plexBlocks.forEach((block) => {
                        block.classList.remove('field-error');
                        const header = block.querySelector('.instance-header');
                        if (header) {
                            const err = header.querySelector('.field-error-text');
                            if (err) err.remove();
                        }
                    });
                }

                if (!plexInstanceSelected || plexMissingLibraries) {
                    errorFields.push(field.key);
                }
                if (plexInstanceSelected && !plexMissingLibraries) {
                    foundValid = true;
                }
            }

            // Non-Plex instance types (radarr/sonarr): require at least one checked
            if (
                field.instance_types &&
                (field.instance_types.includes('radarr') || field.instance_types.includes('sonarr'))
            ) {
                // Find checkboxes for radarr/sonarr
                const allCols = container.querySelectorAll('.instance-type-col');
                let anyChecked = false;
                allCols.forEach((col) => {
                    const chks = col.querySelectorAll('input[type="checkbox"]');
                    if (Array.from(chks).some((chk) => chk.checked)) {
                        anyChecked = true;
                    }
                });
                if (!anyChecked) {
                    allCols.forEach((col) => {
                        col.classList.add('field-error');
                        if (!col.querySelector('.field-error-text')) {
                            const err = document.createElement('div');
                            err.className = 'field-error-text';
                            err.textContent = `${field.label} cannot be empty.`;
                            col.appendChild(err);
                        }
                    });
                    errorFields.push(field.key);
                } else {
                    allCols.forEach((col) => {
                        col.classList.remove('field-error');
                        const err = col.querySelector('.field-error-text');
                        if (err) err.remove();
                    });
                    foundValid = true;
                }
            }

            // If only plex or only radarr/sonarr, allow foundValid to be enough to skip further checks

            return; // Skip default logic for this field
        }

        // ======== DEFAULT (existing) LOGIC for other field types ==============
        if (field.required) {
            const input = container.querySelector(`[name="${field.key}"]`);
            let isEmpty = false;
            if (input) {
                isEmpty = input.value === '' || input.value == null;
            } else if (field.type === 'color_list') {
                const colorInputs = container.querySelectorAll(
                    '.field-color-list input[type="color"]'
                );
                isEmpty = Array.from(colorInputs).filter((i) => i.value).length === 0;
            } else {
                isEmpty = true;
            }
            const wrapper = input?.closest(
                '.modal-field-inputwrap, .settings-field-inputwrap, .modal-content, div'
            );
            if (isEmpty) {
                errorFields.push(field.key);
                if (input) input.classList.add('input-error');
                if (wrapper && !wrapper.querySelector('.field-error-text')) {
                    const err = document.createElement('div');
                    err.className = 'field-error-text';
                    err.textContent = field.label
                        ? `${field.label} cannot be empty.`
                        : 'This field cannot be empty.';
                    wrapper && wrapper.appendChild(err);
                }
            } else {
                if (input) input.classList.remove('input-error');
                if (wrapper) {
                    const err = wrapper.querySelector('.field-error-text');
                    if (err) err.remove();
                }
            }
        }
    });
    return errorFields;
}
