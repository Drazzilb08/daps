import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatIcon - Icon display primitive for statistics
 *
 * Flexible icon primitive that supports:
 * - Emoji strings
 * - Material Icon class names
 * - React components/elements
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.icon - Icon content
 * @param {string} [props.size="3xl"] - Icon size: "2xl", "3xl", "4xl"
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element|null}
 *
 * @example
 * // Emoji icon
 * <StatIcon icon="📊" />
 *
 * @example
 * // Material Icon
 * <StatIcon icon={<span className="material-symbols-outlined">trending_up</span>} />
 *
 * @example
 * // Custom size
 * <StatIcon icon="👥" size="4xl" />
 */
export const StatIcon = React.memo(({ icon, size = '3xl', className = '' }) => {
    if (!icon) return null;

    const sizeClasses = {
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
    };

    const iconClasses = `${sizeClasses[size] || sizeClasses['3xl']} ${className}`;

    // If icon is a React element, render it directly
    if (React.isValidElement(icon)) {
        return <div className={iconClasses}>{icon}</div>;
    }

    // Otherwise, render as text/emoji
    return <span className={iconClasses}>{icon}</span>;
});

StatIcon.displayName = 'StatIcon';

StatIcon.propTypes = {
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    size: PropTypes.oneOf(['2xl', '3xl', '4xl']),
    className: PropTypes.string,
};
