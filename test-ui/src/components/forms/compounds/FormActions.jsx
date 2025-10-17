import React from 'react';
import { useFormContext } from '../FormContext';

/**
 * FormActions - Form action buttons compound component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button components (from Phase 2)
 * @param {'left'|'center'|'right'} props.align - Action alignment
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactElement|null}
 */
export const FormActions = React.memo(({ children, align = 'left', className = '' }) => {
    // Access form context (handleSubmit will be used for form submission integration)
    // eslint-disable-next-line no-unused-vars
    const { handleSubmit } = useFormContext();

    const alignmentClass = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    }[align];

    if (!children) {
        return null;
    }

    return (
        <div className={`border-t border-default pt-4 mt-6 ${className}`}>
            <div className={`flex flex-wrap gap-3 ${alignmentClass}`}>{children}</div>
        </div>
    );
});

FormActions.displayName = 'Form.Actions';

export default FormActions;
