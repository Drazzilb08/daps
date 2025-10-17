import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorContainer - Universal error layout wrapper
 *
 * Provides consistent error display containers for three modes:
 * - Modal: Fixed overlay with backdrop blur for critical errors
 * - Page: Centered page-level error container
 * - Inline: Inline feature-level error container
 *
 * @param {Object} props
 * @param {'modal'|'page'|'inline'} props.mode - Display mode
 * @param {ReactNode} props.children - Error content to display
 * @param {string} props.className - Additional classes (optional)
 */
export const ErrorContainer = ({ mode = 'page', children, className = '' }) => {
    if (mode === 'modal') {
        return (
            <div className="fixed inset-0 z-modal-backdrop bg-overlay backdrop-blur-sm font-sans flex items-center justify-center p-4">
                <div
                    className={`relative bg-surface border-2 border-error rounded-lg p-6 max-w-lg w-full max-h-screen overflow-y-auto shadow-xl z-modal ${className}`}
                >
                    {children}
                </div>
            </div>
        );
    }

    if (mode === 'page') {
        return (
            <div className="min-h-content p-4 font-sans">
                <div
                    className={`max-w-2xl w-full bg-surface border-2 border-error rounded-lg p-8 shadow-xl mx-auto ${className}`}
                >
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-surface border border-error rounded-md my-2 font-sans ${className}`}>
            <div className="p-4">{children}</div>
        </div>
    );
};

ErrorContainer.propTypes = {
    mode: PropTypes.oneOf(['modal', 'page', 'inline']),
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};
