import React from 'react';

export function ModalHeader({ title, onClose, extra }) {
    return (
        <div className="modal-header">
            <h2>{title || ''}</h2>
            {extra}
            <button className="modal-close-x" type="button" aria-label="Close" onClick={onClose}>
                ×
            </button>
        </div>
    );
}

export function ModalFooter({
    buttons = [],
    leftBtnIds = ['delete-modal-btn'],
    onButtonClick = {},
}) {
    // Separate left and right buttons
    const leftButtons = buttons.filter(btn => leftBtnIds.includes(btn.id));
    const rightButtons = buttons.filter(btn => !leftBtnIds.includes(btn.id));

    return (
        <div className="modal-footer">
            <div className="modal-footer-left">
                {leftButtons.map(btn => (
                    <button
                        key={btn.id}
                        id={btn.id}
                        className={`btn ${btn.className || ''}`}
                        type={btn.type || 'button'}
                        disabled={btn.disabled}
                        onClick={e => {
                            e.preventDefault();
                            onButtonClick[btn.id]?.();
                        }}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
            <div className="modal-footer-right">
                {rightButtons.map(btn => (
                    <button
                        key={btn.id}
                        id={btn.id}
                        className={`btn ${btn.className || ''}`}
                        type={btn.type || 'button'}
                        disabled={btn.disabled}
                        onClick={e => {
                            e.preventDefault();
                            onButtonClick[btn.id]?.({ event: e });
                        }}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

import { useEffect } from 'react';

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

export function useDynamicFieldConditions(
    schema,
    rootConfig,
    formRef,
    triggerFieldName = 'instance'
) {
    useEffect(() => {
        function updateFields() {
            schema.forEach(field => {
                if (field.show_if_instance_type) {
                    const form = formRef.current;
                    const rows = form.querySelectorAll('.settings-field-row');
                    let targetRow = null;
                    rows.forEach(row => {
                        const label = row.querySelector('label');
                        if (label && label.textContent.trim() === field.label.trim()) {
                            targetRow = row;
                        }
                    });
                    if (!targetRow) return;
                    const triggerSelect = form.querySelector(`select[name="${triggerFieldName}"]`);
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
        const form = formRef.current;
        if (!form) return;
        const triggerSelect = form.querySelector(`select[name="${triggerFieldName}"]`);
        if (triggerSelect) {
            triggerSelect.addEventListener('change', updateFields);
        }
        updateFields();
        return () => {
            if (triggerSelect) triggerSelect.removeEventListener('change', updateFields);
        };
    }, [schema, rootConfig, formRef, triggerFieldName]);
}
