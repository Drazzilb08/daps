/**
 * Form - Root form compound component with context integration
 *
 * Provides centralized form state management via FormContext and exposes
 * compound components for building complete forms with consistent patterns.
 *
 * Usage:
 * <Form onSubmit={handleSubmit} initialData={data} validation={rules}>
 *   <Form.Header title="Settings" />
 *   <Form.Section title="General">
 *     <TextField field={field} />
 *   </Form.Section>
 *   <Form.Actions />
 * </Form>
 */

import React from 'react';
import { FormProvider } from '../FormContext';
import { FormHeader } from './FormHeader';
import { FormSection } from './FormSection';
import { FormActions } from './FormActions';

/**
 * Form - Root form compound component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Form content
 * @param {Function} props.onSubmit - Submit handler (data) => void
 * @param {Object} props.initialData - Initial form values
 * @param {Object} props.validation - Validation rules by field key
 * @param {string} props.className - Additional CSS classes
 */
export const Form = React.memo(
    ({ children, onSubmit, initialData = {}, validation = {}, className = '', ...props }) => {
        return (
            <FormProvider initialData={initialData} onSubmit={onSubmit} validation={validation}>
                <form className={`form-root ${className}`} noValidate {...props}>
                    {children}
                </form>
            </FormProvider>
        );
    }
);

Form.displayName = 'Form';

// Attach compound components as static properties
Form.Header = FormHeader;
Form.Section = FormSection;
Form.Actions = FormActions;

export default Form;
