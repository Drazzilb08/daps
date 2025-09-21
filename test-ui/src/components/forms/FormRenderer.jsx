/**
 * FormRenderer - Renders forms from JSON schema
 *
 * Creates forms from JSON schemas with validation and state management.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FieldRegistry } from '../fields/FieldRegistry';
import { FormValidator, useFieldValidation } from './FormValidator';
import {
    parseFormSchema,
    generateDefaultFormData,
    groupFieldsBySections,
    validateSchema,
} from '../../utils/forms/schemaUtils';

/**
 * Renders individual field from schema
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field schema
 * @param {*} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.disabled - Disabled state
 */
const FieldRenderer = React.memo(({ field, value, onChange, disabled }) => {
    const { error, hasError, markTouched } = useFieldValidation(field.key);

    // Get field component from registry
    const FieldComponent = FieldRegistry.getField(field.type);

    const handleChange = useCallback(
        newValue => {
            markTouched();
            onChange(field.key, newValue);
        },
        [field.key, onChange, markTouched]
    );

    const handleFocus = useCallback(() => {
        markTouched();
    }, [markTouched]);

    return (
        <div className="relative" data-field-type={field.type} data-field-key={field.key}>
            <FieldComponent
                field={field}
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                disabled={disabled || field.disabled}
                highlightInvalid={hasError}
                errorMessage={error}
            />
        </div>
    );
});

FieldRenderer.displayName = 'FieldRenderer';

/**
 * Renders form section with grouped fields
 *
 * @param {Object} props - Component props
 * @param {Object} props.section - Section config
 * @param {Object} props.formData - Form data
 * @param {Function} props.onFieldChange - Change handler
 * @param {boolean} props.disabled - Disabled state
 */
const FormSection = React.memo(({ section, formData, onFieldChange, disabled }) => {
    const [collapsed, setCollapsed] = useState(section.collapsed || false);

    const toggleCollapsed = useCallback(() => {
        setCollapsed(prev => !prev);
    }, []);

    if (!section.fields || section.fields.length === 0) {
        return null;
    }

    return (
        <div className="mb-6" data-section-collapsible={section.collapsible}>
            {section.title && (
                <div className="mb-4 pb-2 border-b border-border">
                    {section.collapsible ? (
                        <button
                            type="button"
                            className="flex items-center w-full bg-transparent border-none p-0 text-left cursor-pointer hover:text-primary"
                            onClick={toggleCollapsed}
                            aria-expanded={!collapsed}
                        >
                            <span
                                className={`mr-2 text-sm text-secondary transition-transform transform ${collapsed ? '-rotate-90' : 'rotate-0'}`}
                            >
                                ▼
                            </span>
                            <h3 className="m-0 text-lg font-medium text-primary">{section.title}</h3>
                        </button>
                    ) : (
                        <h3 className="m-0 text-lg font-medium text-primary">{section.title}</h3>
                    )}
                    {section.description && (
                        <p className="mt-2 mb-0 text-sm text-secondary leading-relaxed">{section.description}</p>
                    )}
                </div>
            )}

            {(!section.collapsible || !collapsed) && (
                <div className="gap-3">
                    {section.fields.map(field => (
                        <FieldRenderer
                            key={field.key}
                            field={field}
                            value={formData[field.key]}
                            onChange={onFieldChange}
                            disabled={disabled}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

FormSection.displayName = 'FormSection';

/**
 * Main form component that renders from schema
 *
 * @param {Object} props - Component props
 * @param {Object} props.schema - Form schema
 * @param {Object} props.initialData - Initial data
 * @param {Function} props.onSubmit - Submit handler
 * @param {Function} props.onFieldChange - Field change handler
 * @param {Function} props.onValidationChange - Validation change handler
 * @param {Object} props.validation - Custom validation rules
 * @param {boolean} props.disabled - Disable form
 * @param {Object} props.options - Rendering options
 * @param {string} props.className - CSS classes
 */
export const FormRenderer = React.memo(
    ({
        schema: rawSchema,
        initialData = {},
        onSubmit,
        onFieldChange,
        onValidationChange,
        validation = {},
        disabled = false,
        options = {},
        className = '',
    }) => {
        // Parse and validate schema
        const schema = useMemo(() => {
            try {
                const parsed = parseFormSchema(rawSchema);
                const validation = validateSchema(parsed);

                if (!validation.isValid) {
                    console.error('[FormRenderer] Schema validation failed:', validation.errors);
                    throw new Error(`Invalid schema: ${validation.errors.join(', ')}`);
                }

                return parsed;
            } catch (error) {
                console.error('[FormRenderer] Schema parsing failed:', error);
                throw error;
            }
        }, [rawSchema]);

        // Initialize form data
        const [formData, setFormData] = useState(() => {
            const defaultData = generateDefaultFormData(schema);
            return { ...defaultData, ...initialData };
        });

        const [isSubmitting, setIsSubmitting] = useState(false);
        const [submitError, setSubmitError] = useState(null);

        // Form options with defaults
        const formOptions = {
            validateOnChange: true,
            mobileOptimized: true,
            ...options,
        };

        // Handle field value changes
        const handleFieldChange = useCallback(
            (fieldKey, value) => {
                setFormData(prev => ({
                    ...prev,
                    [fieldKey]: value,
                }));

                if (onFieldChange) {
                    onFieldChange(fieldKey, value);
                }
            },
            [onFieldChange]
        );

        // Handle form submission
        const handleSubmit = useCallback(
            async e => {
                e.preventDefault();

                if (disabled || isSubmitting) {
                    return;
                }

                setIsSubmitting(true);
                setSubmitError(null);

                try {
                    if (onSubmit) {
                        await onSubmit(formData);
                    }
                } catch (error) {
                    console.error('[FormRenderer] Form submission failed:', error);
                    setSubmitError(error.message || 'Form submission failed');
                } finally {
                    setIsSubmitting(false);
                }
            },
            [formData, onSubmit, disabled, isSubmitting]
        );

        // Group fields by sections
        const sections = useMemo(() => {
            return groupFieldsBySections(schema, formData);
        }, [schema, formData]);

        // Form CSS classes
        const formClasses = [
            'form-renderer',
            `form-layout-${schema.layout || 'vertical'}`,
            formOptions.mobileOptimized ? 'mobile-optimized' : '',
            disabled ? 'disabled' : '',
            isSubmitting ? 'submitting' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        // Reset form data when initialData changes
        useEffect(() => {
            const defaultData = generateDefaultFormData(schema);
            setFormData({ ...defaultData, ...initialData });
        }, [initialData, schema]);

        if (!schema) {
            return (
                <div className="p-6 text-center bg-error-subtle border border-error rounded-lg text-error-text">
                    <h3>Form Configuration Error</h3>
                    <p>The form schema is invalid or missing. Please check the configuration.</p>
                </div>
            );
        }

        return (
            <FormValidator
                schema={schema}
                formData={formData}
                onValidationChange={onValidationChange}
                validateOnChange={formOptions.validateOnChange}
                customValidators={validation}
            >
                <form className={formClasses} onSubmit={handleSubmit} noValidate>
                    {/* Form header */}
                    {schema.title && (
                        <div className="mb-6 text-center">
                            <h2 className="m-0 mb-2 text-2xl font-semibold text-primary leading-tight">{schema.title}</h2>
                            {schema.description && (
                                <p className="m-0 text-base text-secondary leading-relaxed">{schema.description}</p>
                            )}
                        </div>
                    )}

                    {/* Form sections and fields */}
                    <div className="mb-6">
                        {sections.map((section, index) => (
                            <FormSection
                                key={index}
                                section={section}
                                formData={formData}
                                onFieldChange={handleFieldChange}
                                disabled={disabled}
                            />
                        ))}
                    </div>

                    {/* Submit error display */}
                    {submitError && (
                        <div className="mb-4 p-3 bg-error-subtle text-error-text border border-error rounded-md text-sm" role="alert">
                            <strong>Submission Error:</strong> {submitError}
                        </div>
                    )}

                    {/* Form actions */}
                    <div className="border-t border-border pt-4 mt-6 flex items-center gap-3">
                        {onSubmit && (
                            <button
                                type="submit"
                                className="min-h-touch bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                                disabled={disabled || isSubmitting}
                            >
                                {isSubmitting ? 'Submitting...' : schema.submitLabel || 'Submit'}
                            </button>
                        )}

                        {schema.cancelLabel && (
                            <button
                                type="button"
                                className="min-h-touch bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex-center-both"
                                disabled={isSubmitting}
                                onClick={() => {
                                    // Reset to initial data
                                    const defaultData = generateDefaultFormData(schema);
                                    setFormData({ ...defaultData, ...initialData });
                                    setSubmitError(null);
                                }}
                            >
                                {schema.cancelLabel}
                            </button>
                        )}
                    </div>
                </form>
            </FormValidator>
        );
    }
);

FormRenderer.displayName = 'FormRenderer';

/**
 * Hook for form state management
 *
 * @param {Object} schema - Form schema
 * @param {Object} initialData - Initial data
 * @returns {Object} Form state and handlers
 */
export const useFormRenderer = (schema, initialData = {}) => {
    const [formData, setFormData] = useState(() => {
        if (!schema) return initialData;
        const defaultData = generateDefaultFormData(parseFormSchema(schema));
        return { ...defaultData, ...initialData };
    });

    const [isValid, setIsValid] = useState(true);
    const [errors, setErrors] = useState({});

    const handleFieldChange = useCallback((fieldKey, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldKey]: value,
        }));
    }, []);

    const handleValidationChange = useCallback(validation => {
        setIsValid(validation.isValid);
        setErrors(validation.errors);
    }, []);

    const reset = useCallback(() => {
        if (schema) {
            const defaultData = generateDefaultFormData(parseFormSchema(schema));
            setFormData({ ...defaultData, ...initialData });
        } else {
            setFormData(initialData);
        }
        setIsValid(true);
        setErrors({});
    }, [schema, initialData]);

    return {
        formData,
        isValid,
        errors,
        handleFieldChange,
        handleValidationChange,
        reset,
        setFormData,
    };
};

export default FormRenderer;
