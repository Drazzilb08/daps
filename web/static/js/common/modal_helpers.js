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
