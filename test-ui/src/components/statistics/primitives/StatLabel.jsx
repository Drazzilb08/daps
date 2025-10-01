import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatLabel - Label text primitive for statistics
 *
 * Provides consistent label styling with semantic color (text-secondary)
 * and configurable sizing.
 *
 * @param {Object} props
 * @param {string} props.children - Label text
 * @param {string} [props.size="sm"] - Text size: "xs", "sm", "base"
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element}
 *
 * @example
 * <StatLabel>Total Users</StatLabel>
 *
 * @example
 * <StatLabel size="xs">Last Updated</StatLabel>
 */
export const StatLabel = React.memo(({ children, size = 'sm', className = '' }) => {
    const sizeClasses = {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
    };

    const labelClasses = `${sizeClasses[size] || sizeClasses.sm} text-secondary ${className}`;

    return <span className={labelClasses}>{children}</span>;
});

StatLabel.displayName = 'StatLabel';

StatLabel.propTypes = {
    children: PropTypes.node.isRequired,
    size: PropTypes.oneOf(['xs', 'sm', 'base']),
    className: PropTypes.string,
};
