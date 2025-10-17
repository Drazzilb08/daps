import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const VALIDATION_RULES = {
    // Basic required validation
    required: (value, rule) => {
        if (rule && (!value || (typeof value === 'string' && value.trim() === ''))) {
            return 'This field is required';
        }
        return null;
    },

    // Length validations
    minLength: (value, minLength) => {
        if (value && value.length < minLength) {
            return `Must be at least ${minLength} characters long`;
        }
        return null;
    },

    maxLength: (value, maxLength) => {
        if (value && value.length > maxLength) {
            return `Must be no more than ${maxLength} characters long`;
        }
        return null;
    },

    // Number validations
    min: (value, min) => {
        const num = parseFloat(value);
        if (!isNaN(num) && num < min) {
            return `Must be at least ${min}`;
        }
        return null;
    },

    max: (value, max) => {
        const num = parseFloat(value);
        if (!isNaN(num) && num > max) {
            return `Must be no more than ${max}`;
        }
        return null;
    },

    // Pattern validation
    pattern: (value, pattern) => {
        if (value && !new RegExp(pattern).test(value)) {
            return 'Invalid format';
        }
        return null;
    },

    // Email validation
    email: value => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Please enter a valid email address';
        }
        return null;
    },

    // URL validation
    url: value => {
        if (value) {
            try {
                new URL(value);
            } catch {
                return 'Please enter a valid URL';
            }
        }
        return null;
    },

    // Array validation
    minItems: (value, minItems) => {
        if (Array.isArray(value) && value.length < minItems) {
            return `Must have at least ${minItems} items`;
        }
        return null;
    },

    maxItems: (value, maxItems) => {
        if (Array.isArray(value) && value.length > maxItems) {
            return `Must have no more than ${maxItems} items`;
        }
        return null;
    },

    // Custom validation function
    custom: (value, validationFn) => {
        if (typeof validationFn === 'function') {
            return validationFn(value);
        }
        return null;
    },
};

/**
 * Validation context for form-wide validation state
 */
const ValidationContext = createContext({
    errors: {},
    isValid: true,
    validateField: () => null,
    clearFieldError: () => {},
    validateForm: () => true,
    setFieldError: () => {},
});

/**
 * FormValidator component that provides validation context and utilities
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to provide validation context to
 * @param {Object} props.schema - Form schema with validation rules
 * @param {Object} props.formData - Current form data
 * @param {Function} props.onValidationChange - Called when validation state changes
 * @param {boolean} props.validateOnChange - Enable real-time validation
 * @param {Object} props.customValidators - Custom validation functions by field key
 */
export const FormValidator = React.memo(
    ({
        children,
        schema = {},
        formData = {},
        onValidationChange,
        validateOnChange = true,
        customValidators = {},
    }) => {
        const [errors, setErrors] = useState({});
        const [touchedFields, setTouchedFields] = useState(new Set());

        /**
         * Validate a single field based on its schema and current value
         *
         * @param {string} fieldKey - The field key to validate
         * @param {*} value - The field value to validate
         * @param {Object} fieldSchema - The field's schema definition
         * @returns {string|null} Error message or null if valid
         */
        const validateField = useCallback(
            (fieldKey, value, fieldSchema) => {
                if (!fieldSchema) {
                    return null;
                }

                // Run built-in validation rules
                const validationRules = fieldSchema.validation || {};

                for (const [ruleType, ruleValue] of Object.entries(validationRules)) {
                    const validator = VALIDATION_RULES[ruleType];
                    if (validator) {
                        const error = validator(value, ruleValue);
                        if (error) {
                            return error;
                        }
                    }
                }

                // Run custom validator if provided
                const customValidator = customValidators[fieldKey];
                if (customValidator && typeof customValidator === 'function') {
                    const customError = customValidator(value, formData);
                    if (customError) {
                        return customError;
                    }
                }

                // Run field-specific custom validation function
                if (
                    fieldSchema.customValidate &&
                    typeof fieldSchema.customValidate === 'function'
                ) {
                    const customError = fieldSchema.customValidate(value, formData);
                    if (customError) {
                        return customError;
                    }
                }

                return null;
            },
            [customValidators, formData]
        );

        /**
         * Validate entire form and return validation state
         *
         * @param {Object} dataToValidate - Form data to validate (defaults to current formData)
         * @returns {Object} Validation result with isValid flag and errors object
         */
        const validateForm = useCallback(
            (dataToValidate = formData) => {
                const newErrors = {};
                let isValid = true;

                // Validate each field in the schema
                Object.entries(schema.fields || {}).forEach(([fieldKey, fieldSchema]) => {
                    const fieldValue = dataToValidate[fieldKey];
                    const fieldError = validateField(fieldKey, fieldValue, fieldSchema);

                    if (fieldError) {
                        newErrors[fieldKey] = fieldError;
                        isValid = false;
                    }
                });

                // Run form-level custom validation
                if (schema.customValidate && typeof schema.customValidate === 'function') {
                    const formErrors = schema.customValidate(dataToValidate);
                    if (formErrors && typeof formErrors === 'object') {
                        Object.assign(newErrors, formErrors);
                        isValid = false;
                    }
                }

                return { isValid, errors: newErrors };
            },
            [schema, formData, validateField]
        );

        /**
         * Clear error for a specific field
         *
         * @param {string} fieldKey - Field key to clear error for
         */
        const clearFieldError = useCallback(fieldKey => {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldKey];
                return newErrors;
            });
        }, []);

        /**
         * Set error for a specific field
         *
         * @param {string} fieldKey - Field key to set error for
         * @param {string} errorMessage - Error message to set
         */
        const setFieldError = useCallback((fieldKey, errorMessage) => {
            setErrors(prev => ({
                ...prev,
                [fieldKey]: errorMessage,
            }));
        }, []);

        /**
         * Handle field validation on change
         */
        const handleFieldValidation = useCallback(
            (fieldKey, value) => {
                if (!validateOnChange) {
                    return null;
                }

                const fieldSchema = schema.fields?.[fieldKey];
                const error = validateField(fieldKey, value, fieldSchema);

                setErrors(prev => {
                    const newErrors = { ...prev };
                    if (error) {
                        newErrors[fieldKey] = error;
                    } else {
                        delete newErrors[fieldKey];
                    }
                    return newErrors;
                });

                return error;
            },
            [schema.fields, validateField, validateOnChange]
        );

        // Update validation state when form data or schema changes
        useEffect(() => {
            if (validateOnChange && Object.keys(touchedFields).length > 0) {
                const validation = validateForm();
                setErrors(validation.errors);

                if (onValidationChange) {
                    onValidationChange(validation);
                }
            }
        }, [formData, schema, validateForm, validateOnChange, touchedFields, onValidationChange]);

        const contextValue = {
            errors,
            isValid: Object.keys(errors).length === 0,
            validateField: handleFieldValidation,
            clearFieldError,
            validateForm,
            setFieldError,
            touchedFields,
            markFieldTouched: useCallback(fieldKey => {
                setTouchedFields(prev => new Set([...prev, fieldKey]));
            }, []),
        };

        return (
            <ValidationContext.Provider value={contextValue}>{children}</ValidationContext.Provider>
        );
    }
);

FormValidator.displayName = 'FormValidator';

/**
 * Hook to access validation context
 *
 * @returns {Object} Validation context with errors, validation functions, etc.
 */
export const useValidation = () => {
    const context = useContext(ValidationContext);
    if (!context) {
        throw new Error('useValidation must be used within a FormValidator component');
    }
    return context;
};

/**
 * Hook to get validation state for a specific field
 *
 * @param {string} fieldKey - Field key to get validation for
 * @returns {Object} Field validation state with error message and validation functions
 */
export const useFieldValidation = fieldKey => {
    const { errors, validateField, clearFieldError, markFieldTouched } = useValidation();

    return {
        error: errors[fieldKey] || null,
        hasError: Boolean(errors[fieldKey]),
        validateField: useCallback(
            value => validateField(fieldKey, value),
            [fieldKey, validateField]
        ),
        clearError: useCallback(() => clearFieldError(fieldKey), [fieldKey, clearFieldError]),
        markTouched: useCallback(() => markFieldTouched(fieldKey), [fieldKey, markFieldTouched]),
    };
};

/**
 * Higher-order component that adds validation to field components
 *
 * @param {React.Component} FieldComponent - Field component to enhance with validation
 * @returns {React.Component} Enhanced field component with validation
 */
export const withValidation = FieldComponent => {
    const ValidatedField = React.memo(props => {
        const { field } = props;
        const fieldValidation = useFieldValidation(field.key);

        return (
            <FieldComponent
                {...props}
                highlightInvalid={fieldValidation.hasError}
                errorMessage={fieldValidation.error}
            />
        );
    });

    ValidatedField.displayName = `withValidation(${FieldComponent.displayName || FieldComponent.name})`;
    return ValidatedField;
};

export default FormValidator;
