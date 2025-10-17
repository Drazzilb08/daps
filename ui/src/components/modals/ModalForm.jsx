import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ModalHeader, ModalFooter, useDynamicFieldConditions } from './helpers/ModalHelpers';
import ModalContainer from './ModalContainer';
import ModalLayout from './ModalLayout';
import { validateFields } from '../validation';

/**
 * Form-based modal component with schema rendering, validation, and layout support
 * Handles complex form modals with dynamic field conditions and validation
 *
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
 * @returns {JSX.Element} Rendered form modal component
 */
export const ModalForm = ({
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
}) => {
    const formRef = useRef();
    const [formData, setFormData] = useState({ ...entry });
    const [invalidFields, setInvalidFields] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Use dynamic field conditions hook
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

    /**
     * Handle field value changes and clear validation errors
     * @param {string} fieldKey - Field identifier
     * @param {*} newValue - New field value
     */
    const handleFieldChange = useCallback(
        (fieldKey, newValue) => {
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
        },
        [invalidFields, onFieldChange]
    );

    /**
     * Handle preset application to form data
     * @param {Object} data - Preset data to apply
     */
    const handlePresetApply = useCallback(
        data => {
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
        },
        [schema]
    );

    /**
     * Close modal handler
     */
    const closeModal = useCallback(() => {
        if (onClose) onClose();
    }, [onClose]);

    // Create wrapped button handlers with validation
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

    /**
     * Determine extra props for fields with presetHandler: true in schema
     * @param {Object} field - Field configuration
     * @returns {Object} Extra props for field
     */
    const getExtraPropsForField = useCallback(
        field => {
            if (field.presetHandler === true) {
                return { onPresetSelected: handlePresetApply };
            }
            return {};
        },
        [handlePresetApply]
    );

    return (
        <ModalContainer onClose={onClose} modalClass={modalClass}>
            <ModalHeader title={title} onClose={onClose} />
            <div className={`modal-body${isUpdating ? ' modal-updating' : ''}`} ref={formRef}>
                <ModalLayout
                    schema={schema}
                    layout={layout}
                    formData={formData}
                    moduleConfig={moduleConfig}
                    rootConfig={rootConfig}
                    invalidFields={invalidFields}
                    onFieldChange={handleFieldChange}
                    fieldRefs={fieldRefs}
                    getExtraPropsForField={getExtraPropsForField}
                />
                {children && !schema.length && children}
            </div>
            <ModalFooter buttons={footerButtons} onButtonClick={wrappedButtonHandler} />
        </ModalContainer>
    );
};

export default ModalForm;
