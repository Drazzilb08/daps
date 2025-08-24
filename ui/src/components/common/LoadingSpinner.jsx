// src/components/common/LoadingSpinner.jsx

import React from 'react';
import PropTypes from 'prop-types';

/**
 * LoadingSpinner - A reusable spinner component
 *
 * @param {Object} props - Component props
 * @param {string} [props.size='default'] - Size variant: 'small', 'default', 'large'
 * @param {string} [props.variant='default'] - Color variant: 'default', 'primary', 'white'
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Inline styles
 * @param {string} [props.ariaLabel='Loading'] - Accessibility label
 */
const LoadingSpinner = React.memo(
    ({
        size = 'default',
        variant = 'default',
        className = '',
        style = {},
        ariaLabel = 'Loading',
    }) => {
        const sizeClass = size !== 'default' ? `spinner--${size}` : '';
        const variantClass = variant !== 'default' ? `spinner--${variant}` : '';

        const combinedClassName = ['spinner', sizeClass, variantClass, className]
            .filter(Boolean)
            .join(' ');

        return (
            <span
                className={combinedClassName}
                style={style}
                role="status"
                aria-label={ariaLabel}
            />
        );
    }
);

LoadingSpinner.propTypes = {
    size: PropTypes.oneOf(['small', 'default', 'large']),
    variant: PropTypes.oneOf(['default', 'primary', 'white']),
    className: PropTypes.string,
    style: PropTypes.object,
    ariaLabel: PropTypes.string,
};

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
