/**
 * FormContext - Centralized form state and validation management
 *
 * Provides form state, validation, dirty tracking, and submit coordination
 * via React Context. Field primitives can optionally integrate with this context
 * for automatic form state management.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const FormContext = createContext(null);

/**
 * FormProvider - Centralized form state and validation management
 * @param {Object} props
 * @param {React.ReactNode} props.children - Form content
 * @param {Object} props.initialData - Initial form values
 * @param {Function} props.onSubmit - Submit handler
 * @param {Object} props.validation - Validation rules
 */
export const FormProvider = ({ children, initialData = {}, onSubmit, validation = {} }) => {
    const [formData, setFormData] = useState(initialData);
    const [isDirty, setIsDirty] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Validation state
    const [errors, setErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState(new Set());

    // Update field value
    const updateField = useCallback((fieldKey, value) => {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
        setIsDirty(true);
        setSubmitError(null);
    }, []);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData(initialData);
        setIsDirty(false);
        setErrors({});
        setTouchedFields(new Set());
        setSubmitError(null);
    }, [initialData]);

    // Mark field as touched
    const markFieldTouched = useCallback(fieldKey => {
        setTouchedFields(prev => new Set([...prev, fieldKey]));
    }, []);

    // Validate single field
    const validateField = useCallback(
        fieldKey => {
            const validator = validation[fieldKey];
            if (!validator) return null;

            const error = validator(formData[fieldKey], formData);
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
        [formData, validation]
    );

    // Handle form submission
    const handleSubmit = useCallback(
        async e => {
            e.preventDefault();

            if (isSubmitting) return;

            // Validate all fields
            let hasErrors = false;
            const newErrors = {};

            Object.keys(validation).forEach(fieldKey => {
                const error = validation[fieldKey](formData[fieldKey], formData);
                if (error) {
                    newErrors[fieldKey] = error;
                    hasErrors = true;
                }
            });

            setErrors(newErrors);

            if (hasErrors) {
                setSubmitError('Please fix validation errors');
                return;
            }

            setIsSubmitting(true);
            setSubmitError(null);

            try {
                await onSubmit(formData);
                setIsDirty(false);
            } catch (error) {
                console.error('Form submission failed:', error);
                setSubmitError(error.message || 'Submission failed');
            } finally {
                setIsSubmitting(false);
            }
        },
        [formData, validation, onSubmit, isSubmitting]
    );

    const contextValue = {
        // State
        formData,
        initialData,
        isDirty,
        isSubmitting,
        submitError,

        // Validation
        errors,
        isValid: Object.keys(errors).length === 0,
        touchedFields,

        // Actions
        updateField,
        resetForm,
        validateField,
        markFieldTouched,
        handleSubmit,
        setSubmitError,
    };

    return <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>;
};

/**
 * useFormContext - Access form context
 * @throws {Error} If used outside FormProvider
 * @returns {Object} Form context value
 */
export const useFormContext = () => {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error('useFormContext must be used within FormProvider');
    }
    return context;
};

/**
 * useFormField - Field-level form integration
 * @param {string} fieldKey - Field identifier
 * @returns {Object} Field state and handlers
 */
export const useFormField = fieldKey => {
    const { formData, errors, touchedFields, updateField, validateField, markFieldTouched } =
        useFormContext();

    const value = formData[fieldKey];
    const error = errors[fieldKey];
    const isTouched = touchedFields.has(fieldKey);

    const handleChange = useCallback(
        newValue => {
            updateField(fieldKey, newValue);
        },
        [fieldKey, updateField]
    );

    const handleBlur = useCallback(() => {
        markFieldTouched(fieldKey);
        validateField(fieldKey);
    }, [fieldKey, markFieldTouched, validateField]);

    return {
        value,
        error,
        isTouched,
        onChange: handleChange,
        onBlur: handleBlur,
        highlightInvalid: isTouched && !!error,
        errorMessage: isTouched ? error : null,
    };
};

/**
 * useOptionalFormField - Optional field-level form integration
 * Returns null if not within a FormProvider instead of throwing
 * @param {string} fieldKey - Field identifier
 * @returns {Object|null} Field state and handlers, or null if not in FormProvider
 */
export const useOptionalFormField = fieldKey => {
    const context = useContext(FormContext);

    // Always call hooks in the same order, even when context is null
    const handleChange = useCallback(
        newValue => {
            if (context) {
                context.updateField(fieldKey, newValue);
            }
        },
        [fieldKey, context]
    );

    const handleBlur = useCallback(() => {
        if (context) {
            context.markFieldTouched(fieldKey);
            context.validateField(fieldKey);
        }
    }, [fieldKey, context]);

    // Return null if no context available
    if (!context) return null;

    const { formData, errors, touchedFields } = context;

    const value = formData[fieldKey];
    const error = errors[fieldKey];
    const isTouched = touchedFields.has(fieldKey);

    return {
        value,
        error,
        isTouched,
        onChange: handleChange,
        onBlur: handleBlur,
        highlightInvalid: isTouched && !!error,
        errorMessage: isTouched ? error : null,
    };
};

export default FormContext;
