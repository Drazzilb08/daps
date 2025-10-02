/**
 * FormHeader - Form header compound component
 *
 * Displays form title, description, and submit status indicator.
 * Null rendering when no content provided.
 *
 * Usage:
 * <Form.Header
 *   title="User Settings"
 *   description="Configure your preferences"
 *   submitStatus="All fields required"
 * />
 */

import React from 'react';

/**
 * FormHeader - Form header compound component
 * @param {Object} props
 * @param {string} props.title - Form title
 * @param {string} props.description - Form description
 * @param {string|React.ReactNode} props.submitStatus - Submit status indicator
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactElement|null} Form header or null if no content
 */
export const FormHeader = React.memo(({ title, description, submitStatus, className = '' }) => {
    // Null rendering when no content
    if (!title && !description && !submitStatus) {
        return null;
    }

    return (
        <div className={`mb-6 ${className}`}>
            {/* Title and description */}
            {(title || description) && (
                <div className="text-center mb-4">
                    {title && <h2 className="text-2xl font-semibold mb-2 text-primary">{title}</h2>}
                    {description && <p className="text-base text-secondary">{description}</p>}
                </div>
            )}

            {/* Submit status indicator */}
            {submitStatus && (
                <div className="text-center text-sm text-secondary">{submitStatus}</div>
            )}
        </div>
    );
});

FormHeader.displayName = 'Form.Header';

export default FormHeader;
