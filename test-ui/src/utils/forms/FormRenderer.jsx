/**
 * FormRenderer - Schema-driven form component
 *
 * Renders forms dynamically from schema configuration objects.
 * Handles form state, validation, and field rendering.
 */

import React, { useState, useCallback, useMemo } from 'react';
import FieldRegistry from '../../components/fields/FieldRegistry.jsx';
import { validateField, validateForm } from './validation.js';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * FormRenderer component for schema-driven form generation
 *
 * @param {Object} props - Component props
 * @param {Object} props.schema - Form schema object with fields array
 * @param {Object} props.initialValues - Initial form values
 * @param {Function} props.onSubmit - Form submit handler (values) => void
 * @param {Function} props.onChange - Form change handler (values) => void
 * @param {boolean} props.disabled - Disable entire form
 * @param {boolean} props.loading - Show loading state
 * @param {string} props.submitText - Submit button text (default: "Save")
 * @param {boolean} props.showSubmit - Show submit button (default: true)
 * @param {boolean} props.validateOnChange - Validate fields on change (default: false)
 * @param {string} props.layout - Form layout: 'vertical' | 'horizontal' (default: 'vertical')
 * @param {Object} props.customErrors - Custom error messages for testing purposes
 */
export const FormRenderer = React.memo(
    ({
        schema,
        initialValues = {},
        onSubmit,
        onChange,
        disabled = false,
        loading = false,
        submitText = 'Save',
        showSubmit = true,
        validateOnChange = false,
        layout = 'vertical',
        customErrors = {},
    }) => {
        const toast = useToast();

        // Form state
        const [values, setValues] = useState(initialValues);
        const [errors, setErrors] = useState({});
        const [touched, setTouched] = useState({});

        // Update values when initialValues change
        React.useEffect(() => {
            setValues(initialValues);
        }, [initialValues]);

        // Form validation state - only validate on submit when validateOnChange is false
        const validationErrors = useMemo(() => {
            // Don't validate anything if validateOnChange is false
            if (!validateOnChange) {
                return {};
            }

            if (Object.keys(touched).length === 0) {
                return {};
            }

            const formErrors = {};

            if (schema?.fields) {
                schema.fields.forEach(field => {
                    const fieldValue = values[field.key];
                    const error = validateField(field, fieldValue, values);
                    if (error) {
                        formErrors[field.key] = error;
                    }
                });
            }

            return formErrors;
        }, [schema, values, touched, validateOnChange]);

        // Handle field value change
        const handleFieldChange = useCallback(
            (fieldKey, value) => {
                const newValues = { ...values, [fieldKey]: value };
                setValues(newValues);

                // Mark field as touched
                setTouched(prev => ({ ...prev, [fieldKey]: true }));

                // Clear field error if value is now valid
                if (errors[fieldKey]) {
                    const field = schema?.fields?.find(f => f.key === fieldKey);
                    if (field && !validateField(field, value, newValues)) {
                        setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[fieldKey];
                            return newErrors;
                        });
                    }
                }

                // Notify parent of change
                onChange?.(newValues);
            },
            [values, errors, schema, onChange]
        );

        // Handle form submission
        const handleSubmit = useCallback(
            async e => {
                e.preventDefault();

                if (disabled || loading) return;

                // Validate entire form
                const formErrors = validateForm(schema, values);

                if (Object.keys(formErrors).length > 0) {
                    setErrors(formErrors);
                    setTouched(
                        Object.keys(formErrors).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                        }, {})
                    );

                    toast.error('Please fix validation errors before submitting');
                    return;
                }

                try {
                    await onSubmit?.(values);
                } catch (error) {
                    console.error('[FormRenderer] Submit error:', error);
                    toast.error('Failed to save form: ' + (error.message || 'Unknown error'));
                }
            },
            [schema, values, disabled, loading, onSubmit, toast]
        );

        // Render individual field
        const renderField = useCallback(
            field => {
                const FieldComponent = FieldRegistry.getField(field.type);

                if (!FieldComponent) {
                    return (
                        <div key={field.key} className="field-wrapper">
                            <div className="field-error">Unknown field type: {field.type}</div>
                        </div>
                    );
                }

                const fieldValue = values[field.key];
                const fieldError =
                    customErrors[field.key] || validationErrors[field.key] || errors[field.key];
                const isInvalid = Boolean(fieldError);

                return (
                    <div
                        key={field.key}
                        className={`field-wrapper ${isInvalid ? 'field-wrapper--invalid' : ''} ${disabled || field.disabled ? 'field-wrapper--disabled' : ''}`}
                    >
                        <FieldComponent
                            field={field}
                            value={fieldValue}
                            onChange={value => handleFieldChange(field.key, value)}
                            disabled={disabled || loading || field.disabled}
                            highlightInvalid={isInvalid}
                            errorMessage={fieldError}
                        />
                    </div>
                );
            },
            [values, validationErrors, errors, disabled, loading, handleFieldChange, customErrors]
        );

        // Handle nested field rendering for complex fields - currently unused
        // const renderNestedFields = useCallback(
        //     (parentField, nestedFields) => {
        //         if (!nestedFields || !Array.isArray(nestedFields)) {
        //             return null;
        //         }

        //         return <div className="form-nested-fields">{nestedFields.map(renderField)}</div>;
        //     },
        //     [renderField]
        // );

        // Render form sections if schema has sections
        const renderFormSections = useCallback(() => {
            if (!schema?.fields) {
                return <div className="field-error">No form fields defined</div>;
            }

            // Group fields by section if they have section property
            const sections = {};
            const unSectionedFields = [];

            schema.fields.forEach(field => {
                if (field.section) {
                    if (!sections[field.section]) {
                        sections[field.section] = [];
                    }
                    sections[field.section].push(field);
                } else {
                    unSectionedFields.push(field);
                }
            });

            return (
                <>
                    {/* Render unsectioned fields first */}
                    {unSectionedFields.map(renderField)}

                    {/* Render sectioned fields */}
                    {Object.entries(sections).map(([sectionName, sectionFields]) => (
                        <div key={sectionName} className="mb-8">
                            <div className="mb-4 pb-2 border-b border-border">
                                <h3 className="m-0 text-lg font-semibold text-primary mb-1">
                                    {sectionName}
                                </h3>
                            </div>
                            {sectionFields.map(renderField)}
                        </div>
                    ))}
                </>
            );
        }, [schema, renderField]);

        if (!schema) {
            return <div className="field-error">No schema provided</div>;
        }

        return (
            <form
                onSubmit={handleSubmit}
                className={`max-w-lg mx-auto ${layout === 'horizontal' ? 'grid grid-cols-2 gap-4' : ''} ${loading ? 'opacity-80' : ''}`}
                noValidate
            >
                {/* Render form validation summary if there are errors */}
                {Object.keys(validationErrors).length > 0 && (
                    <div className="mb-4 p-3 bg-surface border border-error rounded-md">
                        <h4 className="m-0 mb-2 text-sm font-medium text-error-text">
                            Please fix the following errors:
                        </h4>
                        <ul className="list-none m-0 p-0">
                            {Object.entries(validationErrors).map(([fieldKey, error]) => {
                                const field = schema.fields?.find(f => f.key === fieldKey);
                                const fieldLabel = field?.label || fieldKey;
                                return (
                                    <li key={fieldKey} className="text-sm text-error-text">
                                        {fieldLabel}: {error}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Form title and description */}
                {schema.label && (
                    <div className="mb-4 pb-2 border-b border-border">
                        <h2 className="m-0 text-lg font-semibold text-primary mb-1">
                            {schema.label}
                        </h2>
                        {schema.description && (
                            <p className="m-0 text-sm text-secondary">{schema.description}</p>
                        )}
                    </div>
                )}

                {/* Render form fields */}
                {renderFormSections()}

                {/* Form actions */}
                {showSubmit && (
                    <div className="border-t border-border pt-4 mt-6 flex items-center gap-3">
                        <button
                            type="submit"
                            className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                            disabled={disabled || loading}
                        >
                            {loading ? 'Saving...' : submitText}
                        </button>
                    </div>
                )}
            </form>
        );
    }
);

FormRenderer.displayName = 'FormRenderer';

export default FormRenderer;
