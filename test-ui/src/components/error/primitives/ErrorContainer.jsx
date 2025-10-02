import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorContainer - Universal error layout wrapper with exact UI/UX preservation
 *
 * This primitive composes to produce IDENTICAL output to current implementation:
 * - Modal mode: Critical Feature Error (FeatureErrorBoundary lines 218-278)
 * - Page mode: Page Error (PageErrorBoundary lines 180-348)
 * - Inline mode: Feature Error (FeatureErrorBoundary lines 300-431)
 *
 * @param {Object} props
 * @param {'modal'|'page'|'inline'} props.mode - Display mode with exact CSS from current implementation
 * @param {ReactNode} props.children - Error content to display
 * @param {string} props.className - Additional classes (optional)
 */
export const ErrorContainer = ({ mode = 'page', children, className = '' }) => {
    // Modal mode: Critical Feature Error overlay (exact from FeatureErrorBoundary.jsx lines 220-277)
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

    // Page mode: Full page error container (exact from PageErrorBoundary.jsx lines 181-182)
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

    // Inline mode: Feature error container (exact from FeatureErrorBoundary.jsx lines 312-313)
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
