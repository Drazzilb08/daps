import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatInline - Horizontal inline layout for statistics cards
 *
 * Displays StatCard components in a horizontal row with
 * optional wrapping for responsive layouts.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - StatCard components
 * @param {string} [props.gap="4"] - Gap size: "2", "3", "4", "6"
 * @param {boolean} [props.wrap=true] - Allow wrapping on small screens
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element}
 *
 * @example
 * // Inline stats for header/footer
 * <StatInline>
 *   <StatCard label="Users" value={1234} variant="minimal" />
 *   <StatCard label="Orders" value={567} variant="minimal" />
 * </StatInline>
 *
 * @example
 * // No wrapping (horizontal scroll on small screens)
 * <StatInline wrap={false}>
 *   <StatCard label="Q1" value={1000} />
 *   <StatCard label="Q2" value={1200} />
 *   <StatCard label="Q3" value={1400} />
 *   <StatCard label="Q4" value={1600} />
 * </StatInline>
 */
export const StatInline = React.memo(({ children, gap = '4', wrap = true, className = '' }) => {
    if (!children) return null;

    const gapClasses = {
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        6: 'gap-6',
    };

    const inlineClasses = [
        'flex',
        'flex-row',
        wrap ? 'flex-wrap' : 'overflow-x-auto',
        gapClasses[gap] || gapClasses['4'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={inlineClasses}>{children}</div>;
});

StatInline.displayName = 'StatInline';

StatInline.propTypes = {
    children: PropTypes.node,
    gap: PropTypes.oneOf(['2', '3', '4', '6']),
    wrap: PropTypes.bool,
    className: PropTypes.string,
};
