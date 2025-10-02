import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorIcon - Visual error type indicator with exact styling from current implementation
 *
 * Uses Material Symbols icons with precise class names from:
 * - PageErrorBoundary.jsx line 184-186 (text-4xl)
 * - FeatureErrorBoundary.jsx line 315 (text-xl)
 *
 * @param {Object} props
 * @param {'error'|'warning'|'info'} props.type - Icon type (maps to Material Symbol)
 * @param {'sm'|'md'|'lg'} props.size - Icon size variant
 */
export const ErrorIcon = ({ type = 'error', size = 'lg' }) => {
    const iconMap = {
        error: 'build', // PageErrorBoundary uses "build" icon
        warning: 'warning',
        info: 'info',
    };

    const sizeClassMap = {
        sm: 'text-xl', // FeatureErrorBoundary inline mode (line 315)
        md: 'text-2xl',
        lg: 'text-4xl', // PageErrorBoundary (line 184)
    };

    const colorClassMap = {
        error: 'text-error',
        warning: 'text-warning',
        info: 'text-info',
    };

    // Page mode icon styling (exact from PageErrorBoundary.jsx lines 183-186)
    if (size === 'lg') {
        return (
            <div className="text-center mb-8">
                <div
                    className={`material-symbols-outlined ${sizeClassMap[size]} mb-3 block ${colorClassMap[type]}`}
                >
                    {iconMap[type]}
                </div>
            </div>
        );
    }

    // Inline mode icon styling (exact from FeatureErrorBoundary.jsx line 315)
    return (
        <span
            className={`material-symbols-outlined ${sizeClassMap[size]} shrink-0 mt-1 ${colorClassMap[type]}`}
        >
            {iconMap[type]}
        </span>
    );
};

ErrorIcon.propTypes = {
    type: PropTypes.oneOf(['error', 'warning', 'info']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
};
