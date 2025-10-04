import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatValue - Value display primitive with formatting and color variants
 *
 * Displays statistical values with:
 * - Configurable sizing
 * - Semantic color variants
 * - Custom formatting support
 * - Bold weight for emphasis
 *
 * @param {Object} props
 * @param {string|number} props.children - Value to display
 * @param {string} [props.size="2xl"] - Text size: "xl", "2xl", "3xl"
 * @param {string} [props.color=""] - Color variant: "primary", "success", "warning", "error"
 * @param {Function} [props.format] - Custom formatter: (value) => string
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element}
 *
 * @example
 * <StatValue>1234</StatValue>
 *
 * @example
 * <StatValue color="success" format={(v) => `$${v.toLocaleString()}`}>
 *   42000
 * </StatValue>
 *
 * @example
 * <StatValue size="3xl" color="primary">99%</StatValue>
 */
export const StatValue = React.memo(
    ({ children, size = '2xl', color = '', format, className = '' }) => {
        const sizeClasses = {
            xl: 'text-xl',
            '2xl': 'text-2xl',
            '3xl': 'text-3xl',
        };

        const colorClasses = {
            primary: 'text-primary',
            success: 'text-success',
            warning: 'text-warning',
            error: 'text-error',
        };

        const valueClasses = [
            sizeClasses[size] || sizeClasses['2xl'],
            'font-bold',
            colorClasses[color] || '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const displayValue = format ? format(children) : children;

        return <span className={valueClasses}>{displayValue}</span>;
    }
);

StatValue.displayName = 'StatValue';

StatValue.propTypes = {
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    size: PropTypes.oneOf(['xl', '2xl', '3xl']),
    color: PropTypes.oneOf(['', 'primary', 'success', 'warning', 'error']),
    format: PropTypes.func,
    className: PropTypes.string,
};
