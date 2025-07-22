// /web/static/js/common/validation.js
// Modular validation logic for DAPS settings/modals

// Utility: get instance type from root config
function getInstanceType(instanceName, rootConfig) {
    if (!rootConfig || !rootConfig.instances) return null;
    for (const type of Object.keys(rootConfig.instances)) {
        if (rootConfig.instances[type] && rootConfig.instances[type][instanceName] !== undefined) {
            return type.toLowerCase();
        }
    }
    return null;
}

// Should we validate this field (e.g. show_if_instance_type logic)
function shouldValidateField(field, container, rootConfig) {
    if (!field.show_if_instance_type) return true;
    const instanceInput = container.querySelector('[name="instance"]');
    let selectedInstance = instanceInput ? instanceInput.value : null;
    let matchedType = null;
    if (selectedInstance && rootConfig && rootConfig.instances) {
        for (const type in rootConfig.instances) {
            if (rootConfig.instances[type][selectedInstance] !== undefined) {
                matchedType = type.toLowerCase();
                break;
            }
        }
    }
    return matchedType && matchedType === field.show_if_instance_type.toLowerCase();
}

// Plex/Radarr/Sonarr "instances" field validation
function validateInstancesField(field, container) {
    let foundValid = false;
    const errorFields = [];
    // Empty message (no instances present)
    const emptyMsg = container.querySelector('.instances-empty-message');
    if (emptyMsg) {
        emptyMsg.classList.add('field-error');
        if (!emptyMsg.querySelector('.field-error-text')) {
            const err = document.createElement('div');
            err.className = 'field-error-text';
            err.textContent = 'At least one instance must be configured to proceed.';
            emptyMsg.appendChild(err);
        }
        errorFields.push(field.key);
        return errorFields;
    }
    // Plex
    if (field.instance_types && field.instance_types.includes('plex')) {
        const plexBlocks = container.querySelectorAll('.plex-instance-card, .instance-block');
        let plexInstanceSelected = false;
        let plexMissingLibraries = false;

        plexBlocks.forEach((block) => {
            const chkLabel = block.querySelector('.instance-checkbox-container');
            const chk = chkLabel ? chkLabel.querySelector('input[type="checkbox"]') : null;
            if (chk && chk.checked) {
                plexInstanceSelected = true;
                const libraryChecks = block.querySelectorAll(
                    '.instance-library-list input[type="checkbox"]'
                );
                const anyLibChecked = Array.from(libraryChecks).some((l) => l.checked);
                const libList = block.querySelector('.instance-library-list');
                if (!anyLibChecked) {
                    plexMissingLibraries = true;
                    libraryChecks.forEach((libChk) => libChk.classList.add('input-error'));
                    if (libList && !libList.querySelector('.field-error-text')) {
                        const err = document.createElement('div');
                        err.className = 'field-error-text';
                        err.textContent = 'At least one library must be selected.';
                        libList.appendChild(err);
                    }
                } else {
                    libraryChecks.forEach((libChk) => libChk.classList.remove('input-error'));
                    if (libList) {
                        const err = libList.querySelector('.field-error-text');
                        if (err) err.remove();
                    }
                }
            } else if (chk) {
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
            plexBlocks.forEach((block) => {
                block.classList.add('field-error');
                const header = block.querySelector('.instance-header');
                if (header && !header.querySelector('.field-error-text')) {
                    const err = document.createElement('div');
                    err.className = 'field-error-text';
                    err.textContent = `${field.label} cannot be empty.`;
                    header.appendChild(err);
                }
            });
        } else {
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
    }
    // Radarr/Sonarr
    if (
        field.instance_types &&
        (field.instance_types.includes('radarr') || field.instance_types.includes('sonarr'))
    ) {
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
        }
    }
    return errorFields;
}

// Validate a generic required field
function validateRequiredField(field, container, { isModal = false } = {}) {
    const errorFields = [];
    const input = container.querySelector(`[name="${field.key}"]`);
    let isEmpty = false;
    if (input) {
        isEmpty = input.value === '' || input.value == null;
    } else if (field.type === 'color_list') {
        const colorInputs = container.querySelectorAll('.field-color-list input[type="color"]');
        isEmpty = Array.from(colorInputs).filter((i) => i.value).length === 0;
    } else if (field.type && field.type.startsWith('dir_')) {
        // Directory list type: at least one non-empty input
        const dirInputs = container.querySelectorAll(`input[name="${field.key}"]`);
        isEmpty = Array.from(dirInputs).every((inp) => !inp.value);
    } else if (isModal) {
        // In modals, skip if not present (for subfields only in modal cards)
        return [];
    } else {
        isEmpty = true;
    }
    const wrapper = input?.closest('.settings-field-inputwrap, .modal-field-inputwrap, div');
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
    return errorFields;
}

// The unified validation orchestrator:
export function validateFields(schema, container, { rootConfig = null, isModal = false } = {}) {
    const errorFields = [];
    schema.forEach((field) => {
        if (field.exclude_on_save) return;
        // Handle show_if_instance_type (skip if not visible for this type)
        if (!shouldValidateField(field, container, rootConfig)) return;
        if (field.type === 'instances' && field.required) {
            errorFields.push(...validateInstancesField(field, container));
            return;
        }
        if (field.required) {
            errorFields.push(...validateRequiredField(field, container, { isModal }));
        }
    });
    return errorFields;
}
