/**
 * FormRenderer - Schema-driven form composition using Form compounds
 *
 * Transforms JSON schemas into complete forms by composing Form.* compounds.
 * This is a thin adapter layer between schema definitions and the Form compound system.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Form } from './compounds/Form';
import { FieldRegistry } from '../fields/FieldRegistry';
import { FormValidator, useFieldValidation } from './FormValidator';
import {
    parseFormSchema,
    generateDefaultFormData,
    groupFieldsBySections,
    validateSchema,
} from '../../utils/forms/schemaUtils';
import { shouldShowField, generateInstanceOptions } from '../../utils/forms/conditionalFields';
import { useInstancesData } from '../../hooks/useInstancesData';

/**
 * FieldRenderer - Renders individual field with validation and conditional logic
 * NOTE: This component is still needed for field-specific logic like preset handling
 * and dynamic options generation. FormContext handles value/onChange via useFormField.
 */
const FieldRenderer = React.memo(({ field, formData, apiData, disabled }) => {
    const { error, hasError, markTouched } = useFieldValidation(field.key);

    // Conditional field evaluation
    if (!shouldShowField(field, formData, apiData)) {
        return null;
    }

    // Get field component from registry
    const FieldComponent = FieldRegistry.getField(field.type);

    if (!FieldComponent) {
        return (
            <div className="p-2 bg-warning-bg text-warning rounded">
                Unknown field type: {field.type}
            </div>
        );
    }

    // Build additional props for specific field types
    const additionalProps = {};

    // Preset fields need onPresetSelected for multi-field updates
    if (field.type === 'presets') {
        // This will be passed through to the field component
        additionalProps.onPresetSelected = presetUpdates => {
            // NOTE: This requires FormContext to expose a batch update method
            // For now, fields handle this internally via useFormField
            console.log('[FormRenderer] Preset selected:', presetUpdates);
        };
    }

    // Dynamic instance options from API data
    if (field.options_source === 'api_instances') {
        additionalProps.options = generateInstanceOptions(apiData?.instances, field.options_filter);
    }

    return (
        <div className="relative" data-field-type={field.type} data-field-key={field.key}>
            <FieldComponent
                field={field}
                disabled={disabled || field.disabled}
                highlightInvalid={hasError}
                errorMessage={error}
                onFocus={markTouched}
                {...additionalProps}
            />
        </div>
    );
});

FieldRenderer.displayName = 'FieldRenderer';

/**
 * FormRenderer - Schema-driven form composition using Form compounds
 *
 * @param {Object} props
 * @param {Object} props.schema - Form schema (raw, will be parsed)
 * @param {Object} props.initialData - Initial form values
 * @param {Function} props.onSubmit - Submit handler (data) => void
 * @param {Function} props.onFieldChange - Optional field change callback
 * @param {Function} props.onValidationChange - Optional validation callback
 * @param {Object} props.validation - Custom validation rules
 * @param {boolean} props.disabled - Disable entire form
 * @param {Object} props.options - Additional rendering options
 * @param {string} props.className - Additional CSS classes
 */
export const FormRenderer = React.memo(
    ({
        schema: rawSchema,
        initialData = {},
        onSubmit,
        onFieldChange, // eslint-disable-line no-unused-vars -- Preserved for API compatibility
        onValidationChange,
        validation = {},
        disabled = false,
        options = {},
        className = '',
    }) => {
        // Load instances data for conditional fields and dynamic dropdowns
        const { instancesData } = useInstancesData();

        // Parse and validate schema
        const schema = useMemo(() => {
            try {
                const parsed = parseFormSchema(rawSchema);
                const schemaValidation = validateSchema(parsed);

                if (!schemaValidation.isValid) {
                    console.error(
                        '[FormRenderer] Schema validation failed:',
                        schemaValidation.errors
                    );
                    throw new Error(`Invalid schema: ${schemaValidation.errors.join(', ')}`);
                }

                return parsed;
            } catch (error) {
                console.error('[FormRenderer] Schema parsing failed:', error);
                throw error;
            }
        }, [rawSchema]);

        // Prepare API data for conditional evaluation
        const apiData = useMemo(
            () => ({
                instances: instancesData,
            }),
            [instancesData]
        );

        // Generate default form data
        const defaultData = useMemo(() => generateDefaultFormData(schema), [schema]);

        // Merge initial data with defaults
        const mergedData = useMemo(
            () => ({
                ...defaultData,
                ...initialData,
            }),
            [defaultData, initialData]
        );

        // Group fields by sections
        const sections = useMemo(
            () => groupFieldsBySections(schema, mergedData),
            [schema, mergedData]
        );

        // Form options with defaults
        const formOptions = {
            validateOnChange: true,
            mobileOptimized: true,
            ...options,
        };

        // Build form class names
        const formClasses = [
            'form-renderer',
            `form-layout-${schema.layout || 'vertical'}`,
            formOptions.mobileOptimized ? 'mobile-optimized' : '',
            disabled ? 'disabled' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        if (!schema) {
            return (
                <div className="p-6 text-center bg-surface border border-error rounded-lg text-error-text">
                    <h3>Form Configuration Error</h3>
                    <p>The form schema is invalid or missing. Please check the configuration.</p>
                </div>
            );
        }

        return (
            <FormValidator
                schema={schema}
                formData={mergedData}
                onValidationChange={onValidationChange}
                validateOnChange={formOptions.validateOnChange}
                customValidators={validation}
            >
                <Form
                    initialData={mergedData}
                    onSubmit={onSubmit}
                    validation={validation}
                    className={formClasses}
                >
                    {/* Form header from schema */}
                    {schema.title && (
                        <Form.Header title={schema.title} description={schema.description} />
                    )}

                    {/* Render sections */}
                    {sections.map((section, index) => (
                        <Form.Section
                            key={`section-${index}`}
                            title={section.title}
                            description={section.description}
                            collapsible={section.collapsible}
                            defaultCollapsed={section.collapsed}
                        >
                            {/* Render fields in section */}
                            {section.fields.map(field => (
                                <FieldRenderer
                                    key={field.key}
                                    field={field}
                                    formData={mergedData}
                                    apiData={apiData}
                                    disabled={disabled}
                                />
                            ))}
                        </Form.Section>
                    ))}

                    {/* Form actions from schema */}
                    {onSubmit && (
                        <Form.Actions
                            submitLabel={schema.submitLabel}
                            cancelLabel={schema.cancelLabel}
                            disabled={disabled}
                        />
                    )}
                </Form>
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
