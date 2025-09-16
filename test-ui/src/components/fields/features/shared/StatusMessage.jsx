/**
 * StatusMessage Primitive Component
 *
 * Reusable status message component for displaying informational messages
 * in form fields. Provides consistent styling and accessibility for various
 * status types (info, warning, error, success).
 *
 * This primitive can be composed into any field that needs to display
 * contextual status information to users.
 */

import React from 'react';

/**
 * StatusMessage component for displaying field status information
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Message content
 * @param {string} props.type - Message type: 'info', 'warning', 'error', 'success'
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.id - Element ID for accessibility
 * @param {Object} props.ariaAttrs - Additional ARIA attributes
 */
export const StatusMessage = React.memo(
    ({ children, type = 'info', className = '', id = null, ariaAttrs = {}, ...props }) => {
        if (!children) return null;

        const statusClasses = ['status-message', `status-message--${type}`, className]
            .filter(Boolean)
            .join(' ');

        return (
            <div
                className={statusClasses}
                id={id}
                role="status"
                aria-live="polite"
                {...ariaAttrs}
                {...props}
            >
                {children}
            </div>
        );
    }
);

StatusMessage.displayName = 'StatusMessage';

export default StatusMessage;
