import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ModalHeader, ModalFooter, useDynamicFieldConditions } from './helpers/ModalHelpers';
import { useFocusTrap, useModalCloseOnOutsideClick } from './helpers/useModalHelpers';
import { renderField } from '../fields/RenderFields';
import { validateFields } from '../validation';

/**
 * Flexible modal factory that can render forms with dynamic schemas and layouts
 * Supports validation, focus management, and multiple layout options
 * @param {Object} props - Component props
 * @param {string} props.title - Modal title
 * @param {Array} [props.schema=[]] - Field schema configuration
 * @param {Object} [props.entry={}] - Initial form data
 * @param {Array} [props.footerButtons=[]] - Footer button configurations
 * @param {Object|null} [props.moduleConfig=null] - Module configuration
 * @param {Object|null} [props.rootConfig=null] - Root configuration
 * @param {string} [props.modalClass='modal-content'] - CSS class for modal
 * @param {Object|null} [props.layout=null] - Layout configuration
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.onButtonClick={}] - Button click handlers
 * @param {Function|null} [props.onFieldChange=null] - Field change handler
 * @param {Object} [props.fieldRefs={}] - Field ref objects
 * @param {React.ReactNode} props.children - Modal content
 * @param {boolean} [props.isSmallModal=false] - Whether to render compact modal
 * @param {number} [props.maxWidth=370] - Maximum modal width
 * @param {number} [props.minWidth=0] - Minimum modal width
 * @returns {JSX.Element} Rendered modal component
 */
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
    onFieldChange = null,
    fieldRefs = {},
    children,
    isSmallModal = false,
    maxWidth = 370,
    minWidth = 0,
}) {
    const modalRef = useRef();
    const formRef = useRef();
    const [formData, setFormData] = useState({ ...entry });
    const [invalidFields, setInvalidFields] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);

    useFocusTrap(modalRef);
    useModalCloseOnOutsideClick(modalRef, onClose);
    useDynamicFieldConditions(schema, rootConfig, formRef);

    // Handle schema updates with smooth transition and preserve form data
    useEffect(() => {
        if (schema.length > 0) {
            setIsUpdating(true);

            // Preserve existing form data when schema updates
            setFormData(prev => {
                const newData = { ...entry };
                // Preserve values that exist in both old and new schema
                schema.forEach(field => {
                    if (prev[field.key] !== undefined) {
                        newData[field.key] = prev[field.key];
                    } else if (field.value !== undefined) {
                        newData[field.key] = field.value;
                    } else if (field.defaultValue !== undefined) {
                        newData[field.key] = field.defaultValue;
                    }
                });
                return newData;
            });

            const timer = setTimeout(() => setIsUpdating(false), 100);
            return () => clearTimeout(timer);
        }
    }, [schema, entry]);

    // If small modal, render compact version directly
    if (isSmallModal) {
        return (
            <div className="modal show" tabIndex={-1}>
                <div
                    className="modal-content"
                    ref={modalRef}
                    style={{
                        maxWidth,
                        minWidth,
                        borderRadius: 11,
                        padding: 0,
                        boxShadow:
                            '0 6px 24px 0 rgba(30, 32, 44, 0.18), 0 1.2px 5px rgba(20, 20, 28, 0.12)',
                    }}
                >
                    <ModalHeader title={title} onClose={onClose} />
                    <div
                        className="modal-body"
                        style={{ padding: '1.7em 1.65em 0.6em 1.65em', textAlign: 'center' }}
                    >
                        {children}

                        {/* Move buttons to body for small modals */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.7em',
                                marginTop: '1.5em',
                                width: '100%',
                            }}
                        >
                            {footerButtons.map((btn, i) => (
                                <button
                                    key={btn.id || i}
                                    type={btn.type || 'button'}
                                    className={btn.className || 'btn'}
                                    style={{ minWidth: 0, width: '100%' }}
                                    onClick={() => onButtonClick[btn.id]?.({})}
                                    disabled={btn.disabled}
                                    autoFocus={btn.autoFocus}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div
                        className="modal-footer"
                        style={{ padding: '0.5rem', minHeight: '0.5rem' }}
                    >
                        {/* Empty footer for consistent spacing */}
                    </div>
                </div>
            </div>
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

        // Call external field change handler if provided
        if (onFieldChange) {
            onFieldChange(fieldKey, newValue);
        }
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
                <div className={`modal-body${isUpdating ? ' modal-updating' : ''}`} ref={formRef}>
                    {renderModalContent()}
                    {children && !schema.length && children}
                </div>
                <ModalFooter buttons={footerButtons} onButtonClick={wrappedButtonHandler} />
            </div>
        </div>,
        document.getElementById('modal-root')
    );
}
