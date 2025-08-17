import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ModalHeader, ModalFooter, useDynamicFieldConditions } from './helpers/ModalHelpers';
import { useFocusTrap, useModalCloseOnOutsideClick } from './helpers/useModalHelpers';
import { renderField } from '../fields/RenderFields';
import { validateFields } from '../validation';
import SmallModalFactory from './SmallModalFactory';

export default function ModalFactory({
    title,
    schema = [],
    entry = {},
    footerButtons = [],
    moduleConfig = null,
    rootConfig = null,
    modalClass = 'modal-content',
    layout = null,
    onClose,
    onButtonClick = {},
    fieldRefs = {},
    children,
    isSmallModal = false,
}) {
    const modalRef = useRef();
    const formRef = useRef();
    const [formData, setFormData] = useState({ ...entry });
    const [invalidFields, setInvalidFields] = useState({});

    useFocusTrap(modalRef);
    useModalCloseOnOutsideClick(modalRef, onClose);
    useDynamicFieldConditions(schema, rootConfig, formRef);

    // If small modal, use SmallModalFactory
    if (isSmallModal) {
        return (
            <SmallModalFactory
                title={title}
                onClose={onClose}
                actions={footerButtons.map(btn => ({
                    id: btn.id,
                    label: btn.label,
                    className: btn.className || 'btn',
                    onClick: () => onButtonClick[btn.id]?.({}),
                    disabled: btn.disabled,
                }))}
            >
                {children}
            </SmallModalFactory>
        );
    }

    function handleFieldChange(fieldKey, newValue) {
        setFormData(prev => {
            // Clear error for this field as user edits it
            if (invalidFields[fieldKey]) {
                setInvalidFields(prevInvalid => {
                    const updated = { ...prevInvalid };
                    delete updated[fieldKey];
                    return updated;
                });
            }
            return { ...prev, [fieldKey]: newValue };
        });
    }

    function handlePresetApply(data) {
        setFormData(prev => {
            const allowedKeys = schema.map(f => f.key);
            const filteredData = Object.fromEntries(
                Object.entries(data).filter(([k]) => allowedKeys.includes(k))
            );

            // Clear errors for all keys updated by the preset
            setInvalidFields(prevInvalid => {
                const updated = { ...prevInvalid };
                Object.keys(filteredData).forEach(key => {
                    if (updated[key]) delete updated[key];
                });
                return updated;
            });

            return {
                ...prev,
                ...filteredData,
            };
        });
    }

    function closeModal() {
        if (onClose) onClose();
    }

    const wrappedButtonHandler = {};
    footerButtons.forEach(btn => {
        const handler = onButtonClick[btn.id];
        if (typeof handler === 'function') {
            wrappedButtonHandler[btn.id] = args => {
                if (btn.id === 'save-modal-btn') {
                    const errors = validateFields(schema, formData, { rootConfig, isModal: true });
                    setInvalidFields(errors);

                    if (Object.keys(errors).length > 0) {
                        // Optionally scroll to first error field
                        setTimeout(() => {
                            const firstError = formRef.current?.querySelector(
                                '.field-error, .input-error'
                            );
                            if (firstError)
                                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 0);
                        return; // Don't proceed, errors present
                    }
                }
                handler({ ...args, btnId: btn.id, formData, closeModal });
            };
        }
    });

    // Determine extra props for fields with presetHandler: true in schema
    function getExtraPropsForField(field) {
        if (field.presetHandler === true) {
            return { onPresetSelected: handlePresetApply };
        }
        return {};
    }

    // Render a single field with all necessary props
    function renderSingleField(field, index) {
        return (
            <React.Fragment key={field.key || index}>
                {renderField(field, formData, moduleConfig, rootConfig, {
                    onChange: (key, val) => handleFieldChange(key, val),
                    index,
                    ref: fieldRefs?.[field.key],
                    highlightInvalid: !!invalidFields[field.key],
                    errorMessage: invalidFields[field.key] || null,
                    ...getExtraPropsForField(field),
                })}
            </React.Fragment>
        );
    }

    // Render schema fields based on layout configuration
    function renderModalContent() {
        const validFields = schema.filter(f => f && typeof f === 'object' && f.key);

        if (!validFields.length) {
            return null;
        }

        // If no layout specified, use default sequential rendering
        if (!layout) {
            return validFields.map((field, i) => renderSingleField(field, i));
        }

        // Handle different layout types
        switch (layout.type) {
            case 'two-column':
                return renderTwoColumnLayout(validFields);
            case 'sections':
                return renderSectionLayout(validFields);
            case 'custom':
                return renderCustomLayout(validFields);
            default:
                return validFields.map((field, i) => renderSingleField(field, i));
        }
    }

    // Render two-column layout
    function renderTwoColumnLayout(validFields) {
        const fieldMap = validFields.reduce((acc, field) => {
            acc[field.key] = field;
            return acc;
        }, {});

        const leftFields = layout.leftColumn?.map(key => fieldMap[key]).filter(Boolean) || [];
        const rightFields = layout.rightColumn?.map(key => fieldMap[key]).filter(Boolean) || [];

        return (
            <div className="modal-two-column-layout">
                <div className="modal-column-left">
                    {leftFields.map((field, i) => (
                        <div key={field.key} className="modal-column-section">
                            {renderSingleField(field, i)}
                        </div>
                    ))}
                </div>
                <div className="modal-column-right">
                    {rightFields.map((field, i) => (
                        <div key={field.key} className="modal-column-section">
                            {renderSingleField(field, i)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Render section-based layout
    function renderSectionLayout(validFields) {
        return (
            layout.sections?.map((section, sectionIndex) => {
                const sectionFields =
                    section.fields
                        ?.map(key => validFields.find(f => f.key === key))
                        .filter(Boolean) || [];

                return (
                    <div key={sectionIndex} className="modal-section">
                        {section.title && (
                            <div className="modal-section-title">{section.title}</div>
                        )}
                        <div className="modal-section-content">
                            {sectionFields.map((field, i) => renderSingleField(field, i))}
                        </div>
                    </div>
                );
            }) || null
        );
    }

    // Render custom layout (for future expansion)
    function renderCustomLayout(validFields) {
        // For now, fall back to default
        return validFields.map((field, i) => renderSingleField(field, i));
    }

    return ReactDOM.createPortal(
        <div className="modal show">
            <div className={modalClass} ref={modalRef}>
                <ModalHeader title={title} onClose={onClose} />
                <div className="modal-body" ref={formRef}>
                    {renderModalContent()}
                    {children && !schema.length && children}
                </div>
                <ModalFooter buttons={footerButtons} onButtonClick={wrappedButtonHandler} />
            </div>
        </div>,
        document.getElementById('modal-root')
    );
}
