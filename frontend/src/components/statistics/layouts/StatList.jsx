import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatList - Vertical list layout for statistics cards
 *
 * Displays StatCard components in a vertical stack with
 * consistent spacing.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - StatCard components
 * @param {string} [props.gap="3"] - Gap size: "2", "3", "4"
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element}
 *
 * @example
 * <StatList>
 *   <StatCard label="Users" value={1234} variant="compact" />
 *   <StatCard label="Revenue" value={42000} variant="compact" />
 *   <StatCard label="Orders" value={567} variant="compact" />
 * </StatList>
 */
export const StatList = React.memo(({ children, gap = '3', className = '' }) => {
    if (!children) return null;

    const gapClasses = {
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
    };

    const listClasses = ['flex', 'flex-col', gapClasses[gap] || gapClasses['3'], className]
        .filter(Boolean)
        .join(' ');

    return <div className={listClasses}>{children}</div>;
});

StatList.displayName = 'StatList';

StatList.propTypes = {
    children: PropTypes.node,
    gap: PropTypes.oneOf(['2', '3', '4']),
    className: PropTypes.string,
};
