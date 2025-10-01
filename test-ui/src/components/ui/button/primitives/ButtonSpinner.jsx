import React from 'react';
import PropTypes from 'prop-types';

/**
 * ButtonSpinner - Loading spinner primitive
 *
 * Responsibilities:
 * - Loading spinner animation
 * - Size variants matching button sizes
 * - Accessible loading announcements
 * - Theme-aware spinner colors (inherits)
 * - Reduced motion support
 *
 * @param {Object} props - Component props
 * @param {string} props.size - Spinner size (small, medium, large)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props['aria-label'] - Accessibility label
 * @returns {JSX.Element}
 */
export const ButtonSpinner = React.memo(
    ({ size = 'medium', className = '', 'aria-label': ariaLabel = 'Loading' }) => {
        // Size mapping to utility classes
        const sizeMap = {
            small: 'w-3.5 h-3.5', // 14px
            medium: 'w-4 h-4', // 16px
            large: 'w-5 h-5', // 20px
        };

        const sizeClasses = sizeMap[size] || sizeMap.medium;

        // Build class names using utility classes
        const spinnerClasses = [
            'inline-block',
            'border-2 border-transparent border-t-current',
            'rounded-full',
            'animate-spin',
            sizeClasses,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return <span className={spinnerClasses} role="status" aria-label={ariaLabel} />;
    }
);

ButtonSpinner.displayName = 'ButtonSpinner';

ButtonSpinner.propTypes = {
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    className: PropTypes.string,
    'aria-label': PropTypes.string,
};
